import { defineEventHandler } from 'h3'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any
// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../../supabase'
import { withMySqlConnection, withMySqlConnectionConfig } from '../../../utils/mysqlClient'
import { loadConnectionConfigFromSupabase } from '../../../utils/connectionConfig'
import puppeteer from 'puppeteer-core'
import Chromium from '@sparticuz/chromium'
import { accessSync } from 'fs'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id as string
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing dashboard id' })

  // Load dashboard first
  const { data: dashboard, error: dashError } = await supabaseAdmin
    .from('dashboards')
    .select('id, name, owner_id, is_public, created_at')
    .eq('id', id)
    .single()

  if (dashError || !dashboard) throw createError({ statusCode: 404, statusMessage: 'Dashboard not found' })

  // Access control: if not public, require owner
  if (!dashboard.is_public) {
    const user = await serverSupabaseUser(event)
    if (!user || user.id !== dashboard.owner_id) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  }

  // Load positions
  const { data: links, error: linksError } = await supabaseAdmin
    .from('dashboard_charts')
    .select('chart_id, position, created_at')
    .eq('dashboard_id', dashboard.id)
    .order('created_at', { ascending: true })
  if (linksError) throw createError({ statusCode: 500, statusMessage: linksError.message })

  const chartIds: number[] = (links || []).map((l: any) => l.chart_id)
  const chartsById: Record<number, any> = {}
  if (chartIds.length) {
    const { data: charts, error: chartsError } = await supabaseAdmin
      .from('charts')
      .select('id, name, description, state_json')
      .in('id', chartIds)
    if (chartsError) throw createError({ statusCode: 500, statusMessage: chartsError.message })
    for (const c of charts || []) chartsById[c.id] = c
  }

  const user = await serverSupabaseUser(event).catch(() => null as any)
  const isOwner = !!user && user.id === dashboard.owner_id

  async function loadConnectionConfigForOwner(connectionId: number) {
    // If owner is the requester, reuse existing helper (enforces ownership)
    if (isOwner) return await loadConnectionConfigFromSupabase(event, Number(connectionId))
    // Public access path: verify the connection belongs to the dashboard owner, then build cfg
    const { data, error } = await supabaseAdmin
      .from('data_connections')
      .select('host, port, username, password, database_name, use_ssh_tunneling, ssh_host, ssh_port, ssh_user, ssh_password, ssh_private_key, owner_id')
      .eq('id', Number(connectionId))
      .single()
    if (error || !data || data.owner_id !== dashboard.owner_id) {
      throw createError({ statusCode: 403, statusMessage: 'Access to connection denied' })
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
  }

  // Fetch external data for all charts in parallel (uses internal info server-side)
  const tasks = (links || []).map(async (lnk: any) => {
    const chart = chartsById[lnk.chart_id]
    const sj = (chart?.state_json || {}) as any
    const internal = sj.internal || {}
    const effective = { ...sj, ...internal }
    delete (effective as any).internal

    // Prepare data using internal info
    let columns: any[] = []
    let rows: any[] = []

    try {
      const sql = internal.actualExecutedSql || internal.sqlText || ''
      const connectionId = internal.dataConnectionId ?? null
      if (sql) {
        let safeSql = sql.trim()
        if (!/\blimit\b/i.test(safeSql)) safeSql = `${safeSql} LIMIT 500`
        if (connectionId) {
          const cfg = await loadConnectionConfigForOwner(Number(connectionId))
          const resRows = await withMySqlConnectionConfig(cfg, async (conn) => {
            const [res] = await conn.query({ sql: safeSql, timeout: 10000 } as any)
            return res as any[]
          })
          rows = resRows
        } else {
          const resRows = await withMySqlConnection(async (conn) => {
            const [res] = await conn.query({ sql: safeSql, timeout: 10000 } as any)
            return res as any[]
          })
          rows = resRows
        }
        columns = rows.length ? Object.keys(rows[0]).map((k) => ({ key: k, label: k })) : []
      } else {
        // For PDF generation, we only support SQL-based charts
        // Dataset-based charts would need additional server-side implementation
        console.warn(`Chart ${lnk.chart_id} has no SQL - skipping for PDF`)
      }
    } catch (e: any) {
      console.error(`Failed to load data for chart ${lnk.chart_id}:`, e)
    }

    return {
      id: lnk.chart_id,
      name: chart?.name || '',
      position: lnk.position,
      state: effective,
      data: { columns, rows }
    }
  })

  const chartData = await Promise.all(tasks)

  console.log('Chart data for PDF:', chartData.map(c => ({
    id: c.id,
    name: c.name,
    hasData: !!(c.data?.rows?.length),
    rowCount: c.data?.rows?.length || 0,
    chartType: c.state?.chartType
  })))

  // Generate HTML for PDF
  const html = generateDashboardHTML(dashboard, chartData)

  // Generate PDF using Puppeteer
  let browser
  try {
    // Determine executable path based on environment
    let executablePath
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      // Use @sparticuz/chromium for serverless environments
      executablePath = await Chromium.executablePath()
    } else {
      // For local development, try to find system Chrome/Chromium
      const possiblePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Chromium\\Application\\chromium.exe',
        'C:\\Program Files (x86)\\Chromium\\Application\\chromium.exe',
        process.env.PUPPETEER_EXECUTABLE_PATH
      ].filter(Boolean)

      executablePath = possiblePaths.find(path => {
        try {
          accessSync(path)
          return true
        } catch {
          return false
        }
      })

      if (!executablePath) {
        throw new Error('Could not find Chrome or Chromium installation. Please install Chrome or set PUPPETEER_EXECUTABLE_PATH environment variable.')
      }
    }

    browser = await puppeteer.launch({
      args: process.env.NODE_ENV === 'production' || process.env.VERCEL
        ? [
            ...Chromium.args,
            '--font-render-hinting=none', // Better font rendering
            '--disable-web-security', // Allow cross-origin for CDN resources
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
      width: 1200,
      height: 800,
      deviceScaleFactor: 2
    })

    // Log console messages and errors from the page
    page.on('console', msg => {
      console.log('PAGE LOG:', msg.type(), msg.text())
    })

    page.on('pageerror', error => {
      console.error('PAGE ERROR:', error.message)
    })

    page.on('requestfailed', request => {
      console.error('REQUEST FAILED:', request.url(), request.failure().errorText)
    })

    // Block unnecessary resources to speed up loading, but allow CDN
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const resourceType = req.resourceType()
      const url = req.url()

      // Allow ECharts CDN and other essential scripts
      if (url.includes('cdn.jsdelivr.net') || url.includes('echarts')) {
        req.continue()
      } else if (resourceType === 'image' || resourceType === 'media' || resourceType === 'font') {
        req.abort()
      } else {
        req.continue()
      }
    })

    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 })

    // Wait for ECharts to load and charts to render
    await new Promise(resolve => setTimeout(resolve, 5000))

    const pdf = await page.pdf({
      format: 'A4',
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

    // Return PDF
    event.node.res.setHeader('Content-Type', 'application/pdf')
    event.node.res.setHeader('Content-Disposition', `attachment; filename="${dashboard.name.replace(/[^a-z0-9]/gi, '_')}.pdf"`)

    return pdf
  } catch (error) {
    console.error('PDF generation error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to generate PDF' })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
})

function generateDashboardHTML(dashboard: any, charts: any[]): string {
  // Calculate dashboard dimensions
  const totalWidth = 1200
  const colWidth = totalWidth / 12 // Assuming 12 columns
  const rowHeight = 60

  const chartElements = charts.map(chart => {
    const pos = chart.position
    const left = pos.x * colWidth
    const top = pos.y * rowHeight
    const width = pos.w * colWidth
    const height = pos.h * rowHeight

    return `
      <div class="chart-container" style="
        position: absolute;
        left: ${left}px;
        top: ${top}px;
        width: ${width}px;
        height: ${height}px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: white;
        padding: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      ">
        <div class="chart-header" style="
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 8px;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 4px;
        ">
          ${chart.name}
        </div>
        <div class="chart-content" id="chart-${chart.id}" style="
          width: 100%;
          height: calc(100% - 32px);
        "></div>
        <script>
          // Schedule chart initialization after page load
          window.chartQueue = window.chartQueue || [];
          window.chartQueue.push({
            id: ${JSON.stringify(chart.id)},
            state: ${JSON.stringify(chart.state)},
            data: ${JSON.stringify(chart.data)}
          });
        </script>
      </div>
    `
  }).join('')

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${dashboard.name} - Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f9fafb;
        }
        .dashboard-title {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 20px;
            text-align: center;
        }
        .dashboard-container {
            position: relative;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            padding: 20px;
            min-height: 800px;
        }
    </style>
</head>
<body>
    <div class="dashboard-title">${dashboard.name}</div>
    <div class="dashboard-container">
        ${chartElements}
    </div>

    <script>
        const charts = {};
        window.chartQueue = window.chartQueue || [];

        // Debug: Check if ECharts loaded
        console.log('ECharts available:', typeof echarts);

        // Global chart initialization
        function processChartQueue() {
            console.log('Processing chart queue with', window.chartQueue.length, 'charts');
            window.chartQueue.forEach(chartConfig => {
                console.log('Rendering chart', chartConfig.id);
                renderChart(chartConfig.id, chartConfig.state, chartConfig.data);
            });
            window.chartQueue = []; // Clear queue
        }

        // Wait for ECharts to load, then process all charts
        let attempts = 0;
        function waitForECharts() {
            attempts++;
            if (typeof echarts !== 'undefined') {
                console.log('ECharts loaded after', attempts, 'attempts');
                processChartQueue();
            } else if (attempts < 50) { // Max 5 seconds
                console.log('Waiting for ECharts (attempt', attempts, ')...');
                setTimeout(waitForECharts, 100);
            } else {
                console.error('ECharts failed to load after 5 seconds');
                // Show error for all charts
                window.chartQueue.forEach(chartConfig => {
                    const container = document.getElementById('chart-' + chartConfig.id);
                    if (container) {
                        container.innerHTML = '<div style="color:red;text-align:center;padding:20px;">Chart library failed to load</div>';
                    }
                });
            }
        }
        waitForECharts();

        function renderChart(chartId, state, data) {
            const container = document.getElementById('chart-' + chartId);
            if (!container) {
                console.error('Container not found for chart:', chartId);
                return;
            }

            try {
                const chart = echarts.init(container);
                charts[chartId] = chart;

                const chartType = state?.chartType || 'table';
                const appearance = state?.appearance || {};

                if (chartType === 'table') {
                    renderTable(container, data);
                    return;
                }

                if (!data || !data.columns || !data.rows || data.rows.length === 0) {
                    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6b7280;font-size:12px;">No data available</div>';
                    return;
                }

                const option = generateChartOption(chartType, data, state, appearance);
                if (option) {
                    chart.setOption(option, true); // Use notMerge to avoid conflicts
                } else {
                    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;font-size:12px;">Chart rendering failed</div>';
                }
            } catch (error) {
                console.error('Error rendering chart:', chartId, error);
                container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;font-size:12px;">Chart error</div>';
            }
        }

        function renderTable(container, data) {
            if (!data.rows || data.rows.length === 0) {
                container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6b7280;">No data available</div>';
                return;
            }

            let html = '<table style="width:100%;border-collapse:collapse;font-size:12px;">';

            // Header
            html += '<thead><tr>';
            data.columns.forEach(col => {
                html += '<th style="border:1px solid #e5e7eb;padding:4px 8px;background:#f9fafb;text-align:left;font-weight:600;">' + col.label + '</th>';
            });
            html += '</tr></thead>';

            // Rows
            html += '<tbody>';
            data.rows.slice(0, 20).forEach(row => {
                html += '<tr>';
                data.columns.forEach(col => {
                    html += '<td style="border:1px solid #e5e7eb;padding:4px 8px;">' + (row[col.key] || '') + '</td>';
                });
                html += '</tr>';
            });
            html += '</tbody></table>';

            if (data.rows.length > 20) {
                html += '<div style="text-align:center;padding:8px;color:#6b7280;font-size:11px;">... and ' + (data.rows.length - 20) + ' more rows</div>';
            }

            container.innerHTML = html;
        }

        function generateChartOption(chartType, data, state, appearance) {
            const columns = data.columns || [];
            const rows = data.rows || [];

            if (!rows.length) return {};

            const xDimensions = state.xDimensions || [];
            const yMetrics = state.yMetrics || [];
            const breakdowns = state.breakdowns || [];

            // Simplified chart generation for PDF
            const categories = [];
            const series = [];

            if (columns.length >= 2) {
                // Use first column as categories, second as values
                const catCol = columns[0].key;
                const valCol = columns[1].key;

                rows.forEach(row => {
                    categories.push(String(row[catCol] || ''));
                });

                series.push({
                    name: columns[1].label || valCol,
                    type: getChartType(chartType),
                    data: rows.map(row => Number(row[valCol]) || 0),
                    itemStyle: { color: '#3366CC' }
                });
            }

            return {
                title: {
                    text: appearance.chartTitle || '',
                    left: 'center',
                    textStyle: { fontSize: 14, fontWeight: 'bold' }
                },
                grid: {
                    left: '60px',
                    right: '20px',
                    top: '60px',
                    bottom: '60px',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: categories,
                    axisLabel: {
                        fontSize: 10,
                        rotate: categories.length > 10 ? 45 : 0
                    }
                },
                yAxis: {
                    type: 'value',
                    axisLabel: { fontSize: 10 }
                },
                series: series,
                legend: {
                    data: series.map(s => s.name),
                    bottom: 0,
                    textStyle: { fontSize: 10 }
                },
                tooltip: {
                    trigger: 'axis',
                    textStyle: { fontSize: 10 }
                }
            };
        }

        function getChartType(chartType) {
            switch (chartType) {
                case 'bar': return 'bar';
                case 'line': return 'line';
                case 'area': return 'line';
                case 'pie': return 'pie';
                case 'donut': return 'pie';
                default: return 'bar';
            }
        }

        // Auto-resize charts on load
        window.addEventListener('load', () => {
            Object.values(charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        });

        // Force resize all charts after a delay
        setTimeout(() => {
            Object.values(charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        }, 1000);
    </script>
</body>
</html>`
}
