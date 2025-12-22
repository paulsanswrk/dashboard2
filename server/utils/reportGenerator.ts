import {createClient} from '@supabase/supabase-js'
import puppeteer from 'puppeteer-core'
import Chromium from '@sparticuz/chromium'
import {accessSync} from 'fs'
import {generateRenderContext} from './renderContext'
import {withMySqlConnectionConfig} from './mysqlClient'
import {supabaseAdmin} from '../api/supabase'
import {checkConnectionPermission} from './permissions'
import {stringify} from 'csv-stringify/sync'
import archiver from 'archiver'
import {PassThrough} from 'stream'
import ExcelJS from 'exceljs'

export interface ReportConfig {
    id: string
    user_id: string
    report_title: string
    scope: 'Dashboard' | 'Single Tab'
    dashboard_id?: string
    tab_id?: string
    time_frame: string
    formats: string[]
}

export interface ReportAttachment {
    filename: string
    content: Buffer
    contentType: string
}

/**
 * Generate report attachments based on the report configuration
 */
export async function generateReportAttachments(report: ReportConfig): Promise<ReportAttachment[]> {
    const attachments: ReportAttachment[] = []

    // Create Supabase client for data access
    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    for (const format of report.formats) {
        try {
            switch (format) {
                case 'PDF':
                    const pdfAttachment = await generatePDFAttachment(report, supabase)
                    attachments.push(pdfAttachment)
                    break

                case 'CSV':
                    const csvAttachment = await generateCSVAttachment(report, supabase)
                    attachments.push(csvAttachment)
                    break

                case 'XLS':
                    const xlsAttachment = await generateXLSAttachment(report, supabase)
                    attachments.push(xlsAttachment)
                    break

                default:
                    console.warn(`Unsupported format: ${format}`)
            }
        } catch (error) {
            console.error(`Failed to generate ${format} attachment for report ${report.id}:`, error)
            // Continue with other formats even if one fails
        }
    }

    return attachments
}

/**
 * Generate PDF attachment for a report
 */
async function generatePDFAttachment(report: ReportConfig, supabase: any): Promise<ReportAttachment> {
    let browser
    const config = useRuntimeConfig()

    try {
        // Determine executable path based on environment
        let executablePath
        if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
            executablePath = await Chromium.executablePath()
        } else {
            const possiblePaths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files\\Chromium\\Application\\chromium.exe',
                'C:\\Program Files (x86)\\Chromium\\Application\\chromium.exe',
                '/usr/bin/google-chrome',
                '/usr/bin/google-chrome-stable',
                '/usr/bin/chromium',
                '/usr/bin/chromium-browser',
                '/opt/google/chrome/google-chrome',
                '/opt/google/chrome/chrome',
                '/snap/bin/chromium',
                process.env.PUPPETEER_EXECUTABLE_PATH
            ].filter(Boolean)

            executablePath = possiblePaths.find(path => {
                if (!path) return false
                try {
                    accessSync(path)
                    return true
                } catch {
                    return false
                }
            })

            if (!executablePath) {
                throw new Error('Could not find Chrome or Chromium installation')
            }
        }

        browser = await puppeteer.launch({
            args: process.env.NODE_ENV === 'production' || process.env.VERCEL
                ? [
                    ...Chromium.args,
                    '--font-render-hinting=none',
                    '--disable-web-security',
                ]
                : [
                    '--font-render-hinting=none',
                    '--disable-web-security',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                ],
            executablePath,
            headless: true,
        })

        const page = await browser.newPage()

        // Set viewport for PDF generation
        await page.setViewport({
            width: 1800,
            height: 1000,
            deviceScaleFactor: 2
        })

        // Generate render context token
        const contextToken = generateRenderContext()

        // Determine render URL based on scope
        let renderUrl: string
        if (report.scope === 'Dashboard' && report.dashboard_id) {
            renderUrl = `${config.public.siteUrl}/render/dashboards/${report.dashboard_id}?context=${encodeURIComponent(contextToken)}`
        } else if (report.scope === 'Single Tab' && report.tab_id) {
            // For single tab reports, we need to get the dashboard ID from the tab
            const {data: tabData, error: tabError} = await supabase
                .from('dashboard_tab')
                .select('dashboard_id')
                .eq('id', report.tab_id)
                .single()

            if (tabError) {
                console.error(`Error fetching tab data for tab ${report.tab_id}:`, tabError)
                throw new Error(`Failed to fetch tab data: ${tabError.message}`)
            }

            if (!tabData) {
                throw new Error(`Tab ${report.tab_id} not found`)
            }

            renderUrl = `${config.public.siteUrl}/render/dashboards/${tabData.dashboard_id}?tab=${report.tab_id}&context=${encodeURIComponent(contextToken)}`
        } else {
            throw new Error('Invalid report scope or missing IDs')
        }

        await page.goto(renderUrl, {
            waitUntil: 'networkidle0',
            timeout: 30000
        })

        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 5000))

        // Get the actual body height
        const bodyHeight = await page.evaluate(() => {
            return document.body.scrollHeight
        })

        const marginTop = 20
        const marginBottom = 20
        const pdfHeight = bodyHeight + marginTop + marginBottom

        // Generate PDF
        const pdf = await page.pdf({
            height: `${pdfHeight}px`,
            width: '1800px',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            },
            preferCSSPageSize: false,
        })

        await page.close()

        // Ensure PDF is a proper Buffer
        let pdfBuffer = pdf
        if (!Buffer.isBuffer(pdfBuffer)) {
            console.error(`PDF generation returned non-Buffer type:`, {
                type: typeof pdfBuffer,
                constructor: pdfBuffer?.constructor?.name,
                length: pdfBuffer?.length
            })
            if (typeof pdfBuffer === 'string') {
                pdfBuffer = Buffer.from(pdfBuffer, 'utf8')
            } else if (Array.isArray(pdfBuffer)) {
                pdfBuffer = Buffer.from(pdfBuffer)
            } else {
                throw new Error('PDF generation returned invalid data type')
            }
        }

        // Validate PDF header
        if (pdfBuffer.length < 4 || !pdfBuffer.slice(0, 4).equals(Buffer.from('%PDF', 'ascii'))) {
            console.error(`Invalid PDF generated:`, {
                length: pdfBuffer.length,
                firstBytes: pdfBuffer.slice(0, 10),
                firstBytesHex: pdfBuffer.slice(0, 10).toString('hex')
            })
            throw new Error('Generated PDF does not have valid PDF header')
        }

        const filename = `${report.report_title.replace(/[^a-z0-9]/gi, '_')}.pdf`

        return {
            filename,
            content: pdfBuffer,
            contentType: 'application/pdf'
        }

    } catch (error) {
        console.error('PDF generation error:', error)
        throw new Error(`Failed to generate PDF: ${error.message}`)
    } finally {
        if (browser) {
            await browser.close()
        }
    }
}

/**
 * Generate CSV attachment for a report
 */
async function generateCSVAttachment(report: ReportConfig, supabase: any): Promise<ReportAttachment> {
    let charts: any[] = []

    if (report.scope === 'Dashboard' && report.dashboard_id) {
        // For dashboard reports, export all charts
        charts = await getDashboardCharts(report.dashboard_id, supabase)
    } else if (report.scope === 'Single Tab' && report.tab_id) {
        // For single tab reports, export charts from that tab
        charts = await getTabCharts(report.tab_id, supabase)
    }

    if (charts.length === 0) {
        // No charts found, return empty CSV
        const filename = `${report.report_title.replace(/[^a-z0-9]/gi, '_')}.csv`
        return {
            filename,
            content: Buffer.from('"No charts found"\n', 'utf-8'),
            contentType: 'text/csv'
        }
    }

    // Generate individual CSV files for each chart
    const csvFiles = await generateIndividualChartCSVs(charts, report.time_frame, supabase, report.user_id)

    if (csvFiles.length === 1) {
        // Single chart - return as CSV file
        const filename = `${report.report_title.replace(/[^a-z0-9]/gi, '_')}.csv`
        return {
            filename,
            content: Buffer.from(csvFiles[0].content, 'utf-8'),
            contentType: 'text/csv'
        }
    } else {
        // Multiple charts - return as ZIP file
        const zipContent = await generateCSVZipFile(csvFiles, report.report_title)
        const filename = `${report.report_title.replace(/[^a-z0-9]/gi, '_')}_csv.zip`

        return {
            filename,
            content: zipContent,
            contentType: 'application/zip'
        }
    }
}

/**
 * Generate XLS attachment for a report (Excel file with multiple sheets)
 */
async function generateXLSAttachment(report: ReportConfig, supabase: any): Promise<ReportAttachment> {
    let charts: any[] = []

    if (report.scope === 'Dashboard' && report.dashboard_id) {
        charts = await getDashboardCharts(report.dashboard_id, supabase)
    } else if (report.scope === 'Single Tab' && report.tab_id) {
        charts = await getTabCharts(report.tab_id, supabase)
    }

    if (charts.length === 0) {
        // No charts found, return empty Excel file
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('No Data')
        worksheet.addRow(['No charts found'])
        const buffer = await workbook.xlsx.writeBuffer()

        const filename = `${report.report_title.replace(/[^a-z0-9]/gi, '_')}.xlsx`
        return {
            filename,
            content: buffer as Buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
    }

    // Collect data for each chart
    const chartsData: Array<{ data: any[], tabName: string, chartName: string }> = []

    for (const chartInfo of charts) {
        const chart = chartInfo.charts
        if (!chart) continue

        const tabName = chartInfo.dashboard_tab?.name || 'Unknown'

        try {
            // Get chart state to extract SQL query
            const state = chart.state_json
            const sqlQuery = state.internal?.actualExecutedSql || state.internal?.sqlText || ''

            let queryData: any[] = []
            let error: any = null

            const connectionId = chart.data_connection_id

            if (sqlQuery) {
                if (connectionId) {
                    // Check user permission for the connection
                    const hasPermission = await checkConnectionPermission(Number(connectionId), report.user_id)
                    if (!hasPermission) {
                        console.error(`User ${report.user_id} does not have permission to access connection ${connectionId}`)
                        queryData = [['Error: Access denied to data connection']]
                    } else {
                        // Execute against external database
                        try {
                            const cfg = await loadConnectionConfigForReport(Number(connectionId), report.user_id)
                            const safeSql = applyTimeFrameFilter(sqlQuery, report.time_frame)
                            queryData = await withMySqlConnectionConfig(cfg, async (conn) => {
                                const [res] = await conn.query({sql: safeSql, timeout: 30000})
                                return res as any[]
                            })
                        } catch (e: any) {
                            console.error(`Error executing chart SQL for ${chart.id} against external DB:`, e?.message || e)
                            queryData = [[`Error loading chart data: ${e.message}`]]
                        }
                    }
                } else {
                    // Fallback to Supabase RPC for backward compatibility
                    const result = await supabase.rpc('exec_sql', {
                        sql: applyTimeFrameFilter(sqlQuery, report.time_frame)
                    })
                    queryData = result.data
                    error = result.error
                }

                if (error) {
                    console.error(`Error executing chart SQL for ${chart.id}:`, error)
                    queryData = [[`Error loading chart data: ${error.message}`]]
                }
            } else {
                queryData = [['No SQL query defined for this chart']]
            }

            chartsData.push({
                data: queryData,
                tabName,
                chartName: chart.name
            })

        } catch (error) {
            console.error(`Error processing chart ${chart.id}:`, error)
            chartsData.push({
                data: [[`Error processing chart: ${error.message}`]],
                tabName,
                chartName: chart.name
            })
        }
    }

    // Generate Excel file with multiple sheets
    const excelBuffer = await generateExcelFile(chartsData)
    const filename = `${report.report_title.replace(/[^a-z0-9]/gi, '_')}.xlsx`

    return {
        filename,
        content: excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
}

/**
 * Get charts for a dashboard
 */
async function getDashboardCharts(dashboardId: string, supabase: any): Promise<any[]> {
    // First get all tabs for this dashboard
    const {data: tabs, error: tabsError} = await supabase
        .from('dashboard_tab')
        .select('id')
        .eq('dashboard_id', dashboardId)

    if (tabsError) {
        console.error(`Error fetching tabs for dashboard ${dashboardId}:`, tabsError)
        throw new Error(`Failed to fetch dashboard tabs: ${tabsError.message}`)
    }

    if (!tabs || tabs.length === 0) {
        return []
    }

    // Then get all chart widgets for these tabs
    const tabIds = tabs.map((tab: any) => tab.id)
    const {data: widgets, error: widgetsError} = await supabase
        .from('dashboard_widgets')
        .select('chart_id, tab_id')
        .eq('dashboard_id', dashboardId)
        .eq('type', 'chart')
        .in('tab_id', tabIds)

    if (widgetsError) {
        console.error(`Error fetching dashboard widgets for dashboard ${dashboardId}:`, widgetsError)
        throw new Error(`Failed to fetch dashboard widgets: ${widgetsError.message}`)
    }

    if (!widgets || widgets.length === 0) {
        return []
    }

    const chartIds = Array.from(new Set(widgets.map((w: any) => w.chart_id)))
    const {data: charts, error: chartsError} = await supabase
        .from('charts')
        .select('id, name, state_json, data_connection_id')
        .in('id', chartIds)

    if (chartsError) {
        console.error(`Error fetching charts for dashboard ${dashboardId}:`, chartsError)
        throw new Error(`Failed to fetch charts: ${chartsError.message}`)
    }

    const chartById = Object.fromEntries((charts || []).map((c: any) => [c.id, c]))
    const tabById = Object.fromEntries(tabs.map((t: any) => [t.id, t]))

    return widgets.map((w: any) => ({
        chart_id: w.chart_id,
        charts: chartById[w.chart_id],
        tab_id: w.tab_id,
        dashboard_tab: {name: tabById[w.tab_id]?.name || 'Unknown'}
    }))
}

/**
 * Get charts for a specific tab
 */
async function getTabCharts(tabId: string, supabase: any): Promise<any[]> {
    const {data: tab, error: tabError} = await supabase
        .from('dashboard_tab')
        .select('id, name, dashboard_id')
        .eq('id', tabId)
        .single()

    if (tabError || !tab) {
        console.error(`Error fetching tab ${tabId}:`, tabError)
        throw new Error(`Failed to fetch tab: ${tabError?.message}`)
    }

    const {data: widgets, error} = await supabase
        .from('dashboard_widgets')
        .select('chart_id, tab_id')
        .eq('tab_id', tabId)
        .eq('dashboard_id', tab.dashboard_id)
        .eq('type', 'chart')

    if (error) {
        console.error(`Error fetching tab charts for tab ${tabId}:`, error)
        throw new Error(`Failed to fetch tab charts: ${error.message}`)
    }

    if (!widgets || widgets.length === 0) {
        return []
    }

    const chartIds = Array.from(new Set(widgets.map((w: any) => w.chart_id)))
    const {data: charts, error: chartsError} = await supabase
        .from('charts')
        .select('id, name, state_json, data_connection_id')
        .in('id', chartIds)

    if (chartsError) {
        console.error(`Error fetching charts for tab ${tabId}:`, chartsError)
        throw new Error(`Failed to fetch charts: ${chartsError.message}`)
    }

    const chartById = Object.fromEntries((charts || []).map((c: any) => [c.id, c]))

    return widgets.map((w: any) => ({
        chart_id: w.chart_id,
        charts: chartById[w.chart_id],
        tab_id: w.tab_id,
        dashboard_tab: {name: tab.name}
    }))
}

/**
 * Load connection configuration for report generation
 */
async function loadConnectionConfigForReport(connectionId: number, reportUserId: string): Promise<any> {
    try {
        // Verify that the connection belongs to the report user
        const {data, error} = await supabaseAdmin
            .from('data_connections')
            .select('host, port, username, password, database_name, use_ssh_tunneling, ssh_host, ssh_port, ssh_user, ssh_password, ssh_private_key, owner_id')
            .eq('id', connectionId)
            .single()

        if (error || !data) {
            throw new Error('Connection not found')
        }

        // Use the proper permission check that handles:
        // - Direct ownership
        // - Organization-based access (admins in same org)
        // - Members of the same organization as the connection
        const hasPermission = await checkConnectionPermission(connectionId, reportUserId)
        if (!hasPermission) {
            throw new Error('Access to connection denied')
        }

        return {
            host: data.host,
            port: Number(data.port),
            user: data.username,
            password: data.password,
            database: data.database_name,
            useSshTunneling: !!data.use_ssh_tunneling,
            ssh: data.use_ssh_tunneling ? {
                host: data.ssh_host,
                port: Number(data.ssh_port),
                user: data.ssh_user,
                password: data.ssh_password || undefined,
                privateKey: data.ssh_private_key || undefined
            } : undefined
        }
    } catch (e: any) {
        console.error('Error loading connection config for report:', e?.message || e)
        throw new Error(`Failed to load connection config: ${e.message}`)
    }
}

/**
 * Generate individual CSV files for each chart
 */
async function generateIndividualChartCSVs(charts: any[], timeFrame: string, supabase: any, reportUserId: string, isExcel: boolean = false): Promise<Array<{
    filename: string,
    content: string,
    tabName: string
}>> {
    const csvFiles: Array<{ filename: string, content: string, tabName: string }> = []

    // Track filename usage within each tab to handle duplicates
    const filenameCounters: Record<string, Record<string, number>> = {}

    for (const chartInfo of charts) {
        const chart = chartInfo.charts
        if (!chart) continue

        const tabName = chartInfo.dashboard_tab?.name || 'Unknown'
        const sanitizedTabName = tabName.replace(/[^a-z0-9]/gi, '_').toLowerCase()

        if (!filenameCounters[sanitizedTabName]) {
            filenameCounters[sanitizedTabName] = {}
        }

        const sanitizedChartName = chart.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        const baseFilename = `${sanitizedChartName}.csv`

        // Handle filename conflicts within the same tab
        let filename = baseFilename
        if (filenameCounters[sanitizedTabName][baseFilename]) {
            filenameCounters[sanitizedTabName][baseFilename]++
            const counter = filenameCounters[sanitizedTabName][baseFilename]
            const nameWithoutExt = baseFilename.replace('.csv', '')
            filename = `${nameWithoutExt}_${counter - 1}.csv`
        } else {
            filenameCounters[sanitizedTabName][baseFilename] = 1
        }

        let csvContent = ''

        try {
            // Get chart state to extract SQL query
            const state = chart.state_json
            const sqlQuery = state.internal?.actualExecutedSql || state.internal?.sqlText || ''

            if (sqlQuery) {
                // Execute the chart's SQL query to get data
                let queryData: any[] = []
                let error: any = null

                const connectionId = chart.data_connection_id

                if (connectionId) {
                    // Check user permission for the connection
                    const hasPermission = await checkConnectionPermission(Number(connectionId), reportUserId)
                    if (!hasPermission) {
                        console.error(`User ${reportUserId} does not have permission to access connection ${connectionId}`)
                        csvContent = `"Error: Access denied to data connection"\n`
                    } else {
                        // Execute against external database
                        try {
                            const cfg = await loadConnectionConfigForReport(Number(connectionId), reportUserId)
                            const safeSql = applyTimeFrameFilter(sqlQuery, timeFrame)
                            queryData = await withMySqlConnectionConfig(cfg, async (conn) => {
                                const [res] = await conn.query({sql: safeSql, timeout: 30000})
                                return res as any[]
                            })
                        } catch (e: any) {
                            console.error(`Error executing chart SQL for ${chart.id} against external DB:`, e?.message || e)
                            csvContent = `"Error loading chart data: ${e.message}"\n`
                        }
                    }
                } else {
                    // Fallback to Supabase RPC for backward compatibility
                    const result = await supabase.rpc('exec_sql', {
                        sql: applyTimeFrameFilter(sqlQuery, timeFrame)
                    })
                    queryData = result.data
                    error = result.error
                }

                if (error) {
                    console.error(`Error executing chart SQL for ${chart.id}:`, error)
                    csvContent = `"Error loading chart data: ${error.message}"\n`
                } else if (queryData && queryData.length > 0) {
                    // Convert data to CSV using csv-stringify
                    try {
                        csvContent = stringify(queryData, {
                            header: true,
                            cast: {
                                boolean: (value) => value ? 'true' : 'false',
                                date: (value) => value.toISOString(),
                                object: (value) => JSON.stringify(value)
                            }
                        })
                    } catch (csvError) {
                        console.error(`Error generating CSV for chart ${chart.id}:`, csvError)
                        csvContent = `"Error generating CSV: ${csvError.message}"\n`
                    }
                } else {
                    csvContent = '"No data available"\n'
                }
            } else {
                csvContent = '"No SQL query defined for this chart"\n'
            }
        } catch (error) {
            console.error(`Error processing chart ${chart.id}:`, error)
            csvContent = `"Error processing chart: ${error.message}"\n`
        }

        // For Excel format, add BOM
        if (isExcel) {
            csvContent = '\uFEFF' + csvContent
        }

        csvFiles.push({
            filename,
            content: csvContent,
            tabName
        })
    }

    return csvFiles
}

/**
 * Generate ZIP file containing CSV files organized by tabs
 */
async function generateCSVZipFile(csvFiles: Array<{ filename: string, content: string, tabName: string }>, reportTitle: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        // Group files by tab
        const filesByTab: Record<string, Array<{ filename: string, content: string }>> = {}

        for (const file of csvFiles) {
            const sanitizedTabName = file.tabName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
            if (!filesByTab[sanitizedTabName]) {
                filesByTab[sanitizedTabName] = []
            }
            filesByTab[sanitizedTabName].push({
                filename: file.filename,
                content: file.content
            })
        }

        // Create ZIP archive
        const archive = archiver('zip', {
            zlib: {level: 9} // Maximum compression
        })

        const buffers: Buffer[] = []
        const passThrough = new PassThrough()

        passThrough.on('data', (chunk) => {
            buffers.push(chunk)
        })

        passThrough.on('end', () => {
            const zipBuffer = Buffer.concat(buffers)
            resolve(zipBuffer)
        })

        archive.on('error', (err) => {
            reject(err)
        })

        archive.pipe(passThrough)

        // Add files to archive organized by tab directories
        for (const [tabDir, files] of Object.entries(filesByTab)) {
            for (const file of files) {
                archive.append(file.content, {name: `${tabDir}/${file.filename}`})
            }
        }

        archive.finalize()
    })
}

/**
 * Generate Excel file with multiple sheets (one per chart)
 */
async function generateExcelFile(chartsData: Array<{ data: any[], tabName: string, chartName: string }>): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()

    // Track used sheet names to ensure uniqueness across the workbook
    const usedSheetNames: Record<string, number> = {}

    // Create a sheet for each chart
    for (const chartData of chartsData) {
        // Sanitize sheet name - Excel has restrictions on sheet names
        const sanitizedTabName = chartData.tabName.replace(/[*?:\/\\[\]]/g, '').substring(0, 20)
        const sanitizedChartName = chartData.chartName.replace(/[*?:\/\\[\]]/g, '').substring(0, 20)
        const baseSheetName = `${sanitizedTabName}_${sanitizedChartName}`.substring(0, 27) // Leave room for suffix

        // Handle sheet name conflicts within the workbook
        let sheetName = baseSheetName
        if (usedSheetNames[baseSheetName]) {
            usedSheetNames[baseSheetName]++
            const counter = usedSheetNames[baseSheetName]
            sheetName = `${baseSheetName}_${counter - 1}`.substring(0, 31)
        } else {
            usedSheetNames[baseSheetName] = 1
        }

        const worksheet = workbook.addWorksheet(sheetName)

        if (chartData.data && chartData.data.length > 0) {
            // Convert array of objects to array of arrays for ExcelJS
            // First, get all unique column names from the data
            const columns = new Set<string>()
            chartData.data.forEach(row => {
                Object.keys(row).forEach(key => columns.add(key))
            })

            // Create header row
            const headers = Array.from(columns)
            worksheet.addRow(headers)

            // Add data rows
            chartData.data.forEach(row => {
                const rowData = headers.map(header => row[header] ?? '')
                worksheet.addRow(rowData)
            })
        } else {
            // Add a message for empty data
            worksheet.addRow(['No data available'])
        }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()
    return buffer as Buffer
}

/**
 * Generate CSV content from charts data
 */
async function generateChartsCSV(charts: any[], timeFrame: string, supabase: any, reportUserId: string, isExcel: boolean = false): Promise<string> {
    let csvContent = ''

    for (const chartInfo of charts) {
        const chart = chartInfo.charts
        if (!chart) continue

        // Add chart header
        csvContent += `"${chart.name}"\n`
        csvContent += `"Tab: ${chartInfo.dashboard_tab?.name || 'Unknown'}"\n\n`

        try {
            // Get chart state to extract SQL query
            const state = chart.state_json
            const sqlQuery = state.internal?.actualExecutedSql || state.internal?.sqlText || ''

            if (sqlQuery) {
                // Execute the chart's SQL query to get data
                let queryData: any[] = []
                let error: any = null

                const connectionId = chart.data_connection_id

                if (connectionId) {
                    // Check user permission for the connection
                    const hasPermission = await checkConnectionPermission(Number(connectionId), reportUserId)
                    if (!hasPermission) {
                        console.error(`User ${reportUserId} does not have permission to access connection ${connectionId}`)
                        csvContent += `"Error: Access denied to data connection"\n\n`
                        continue
                    }

                    // Execute against external database
                    try {
                        const cfg = await loadConnectionConfigForReport(Number(connectionId), reportUserId)
                        const safeSql = applyTimeFrameFilter(sqlQuery, timeFrame)
                        queryData = await withMySqlConnectionConfig(cfg, async (conn) => {
                            const [res] = await conn.query({sql: safeSql, timeout: 30000})
                            return res as any[]
                        })
                    } catch (e: any) {
                        console.error(`Error executing chart SQL for ${chart.id} against external DB:`, e?.message || e)
                        csvContent += `"Error loading chart data: ${e.message}"\n\n`
                        continue
                    }
                } else {
                    // Fallback to Supabase RPC for backward compatibility
                    const result = await supabase.rpc('exec_sql', {
                        sql: applyTimeFrameFilter(sqlQuery, timeFrame)
                    })
                    queryData = result.data
                    error = result.error
                }

                if (error) {
                    console.error(`Error executing chart SQL for ${chart.id}:`, error)
                    csvContent += `"Error loading chart data: ${error.message}"\n\n`
                } else if (queryData && queryData.length > 0) {
                    // Convert data to CSV using csv-stringify
                    try {
                        const csvString = stringify(queryData, {
                            header: true,
                            cast: {
                                boolean: (value) => value ? 'true' : 'false',
                                date: (value) => value.toISOString(),
                                object: (value) => JSON.stringify(value)
                            }
                        })
                        csvContent += csvString
                    } catch (csvError) {
                        console.error(`Error generating CSV for chart ${chart.id}:`, csvError)
                        csvContent += `"Error generating CSV: ${csvError.message}"\n`
                    }
                } else {
                    csvContent += '"No data available"\n'
                }
            } else {
                csvContent += '"No SQL query defined for this chart"\n'
            }
        } catch (error) {
            console.error(`Error processing chart ${chart.id}:`, error)
            csvContent += `"Error processing chart: ${error.message}"\n`
        }

        csvContent += '\n\n' // Add spacing between charts
    }

    return csvContent
}

/**
 * Apply time frame filtering to SQL queries
 */
function applyTimeFrameFilter(sql: string, timeFrame: string): string {
    // This is a simplified implementation
    // In a real scenario, you'd need to parse the SQL and add appropriate WHERE clauses
    // based on date columns detected in the schema

    let dateFilter = ''

    switch (timeFrame) {
        case 'Last 7 Days':
            dateFilter = 'AND created_at >= NOW() - INTERVAL \'7 days\''
            break
        case 'Last 30 Days':
            dateFilter = 'AND created_at >= NOW() - INTERVAL \'30 days\''
            break
        case 'Last Quarter':
            dateFilter = 'AND created_at >= NOW() - INTERVAL \'3 months\''
            break
        case 'As On Dashboard':
        default:
            // No filtering
            return sql
    }

    // Simple approach: add the filter if we find a WHERE clause
    if (sql.toUpperCase().includes('WHERE')) {
        return sql.replace(/WHERE/i, `WHERE 1=1 ${dateFilter} AND `)
    } else {
        // Add WHERE clause before ORDER BY or at the end
        const orderByIndex = sql.toUpperCase().indexOf('ORDER BY')
        if (orderByIndex !== -1) {
            return sql.slice(0, orderByIndex) + `WHERE 1=1 ${dateFilter} ` + sql.slice(orderByIndex)
        } else {
            return sql + ` WHERE 1=1 ${dateFilter}`
        }
    }
}
