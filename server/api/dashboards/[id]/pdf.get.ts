import { defineEventHandler } from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../../supabase'
import puppeteer from 'puppeteer-core'
import Chromium from '@sparticuz/chromium'
import { accessSync } from 'fs'
import { DASHBOARD_PDF_MARGINS, DASHBOARD_WIDTH } from '~/lib/dashboard-constants'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

// PDF dimensions - calculated from dashboard constants
const PDF_PAGE_WIDTH = DASHBOARD_WIDTH + DASHBOARD_PDF_MARGINS.left + DASHBOARD_PDF_MARGINS.right

export default defineEventHandler(async (event) => {
  // @ts-ignore useRuntimeConfig is auto-imported in Nuxt server context
  const config = useRuntimeConfig()
  const id = event.context.params?.id as string
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing dashboard id' })

  // Load dashboard first
  const { data: dashboard, error: dashError } = await supabaseAdmin
    .from('dashboards')
    .select('id, name, organization_id, creator, is_public, created_at')
    .eq('id', id)
    .single()

  if (dashError || !dashboard) throw createError({ statusCode: 404, statusMessage: 'Dashboard not found' })

  // Access control: if not public, require org membership
  if (!dashboard.is_public) {
    const user = await serverSupabaseUser(event)
    if (!user) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.organization_id || profile.organization_id !== dashboard.organization_id) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  }

  // Start Puppeteer and load preview page
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
        // Windows paths
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Chromium\\Application\\chromium.exe',
        'C:\\Program Files (x86)\\Chromium\\Application\\chromium.exe',
        // Linux paths (including WSL)
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/opt/google/chrome/google-chrome',
        '/opt/google/chrome/chrome',
        '/snap/bin/chromium',
        // Environment variable
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
        throw new Error('Could not find Chrome or Chromium installation. Please install Chrome or set PUPPETEER_EXECUTABLE_PATH environment variable.')
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

    // Set viewport for PDF generation (height will be adjusted based on content)
    await page.setViewport({
      width: PDF_PAGE_WIDTH,
      height: 1000,
      deviceScaleFactor: 2
    })

    // Log page errors for debugging
    page.on('pageerror', error => {
      console.error('PDF page error:', error.message)
    })

    page.on('requestfailed', request => {
      console.error('PDF request failed:', request.url(), request.failure()?.errorText)
    })

    // Generate render context token
    const { generateRenderContext } = await import('../../../utils/renderContext')
    const contextToken = generateRenderContext()

    // Load the render dashboard page with context token
    const renderUrl = `${config.public.siteUrl}/render/dashboards/${id}?context=${encodeURIComponent(contextToken)}`

    await page.goto(renderUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000
    })

    // Wait for dashboard content to load completely
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Get the actual body height and calculate PDF height with margins
    const bodyHeight = await page.evaluate(() => {
      return document.body.scrollHeight
    })

    const marginTop = DASHBOARD_PDF_MARGINS.top
    const marginBottom = DASHBOARD_PDF_MARGINS.bottom
    const pdfHeight = bodyHeight + marginTop + marginBottom

    // Generate PDF from the loaded page
    const pdf = await page.pdf({
      height: `${pdfHeight}px`,
      width: `${PDF_PAGE_WIDTH}px`,
      printBackground: true,
      margin: {
        top: `${DASHBOARD_PDF_MARGINS.top}px`,
        right: `${DASHBOARD_PDF_MARGINS.right}px`,
        bottom: `${DASHBOARD_PDF_MARGINS.bottom}px`,
        left: `${DASHBOARD_PDF_MARGINS.left}px`
      },
      preferCSSPageSize: false,
    })

    await page.close()

    // Return PDF
    event.node.res.setHeader('Content-Type', 'application/pdf')
    event.node.res.setHeader('Content-Disposition', `attachment; filename="${dashboard.name.replace(/[^a-z0-9]/gi, '_')}.pdf"`)

    return pdf
  } catch (error: any) {
    console.error('PDF generation error:', error?.message)
    throw createError({ statusCode: 500, statusMessage: 'Failed to generate PDF' })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
})
