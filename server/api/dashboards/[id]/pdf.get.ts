import {defineEventHandler} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../../supabase'
import puppeteer from 'puppeteer-core'
import Chromium from '@sparticuz/chromium'
import {accessSync} from 'fs'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

// PDF dimensions constants
const PDF_PAGE_WIDTH = 1800 // pixels (fixed width for viewport and PDF)

export default defineEventHandler(async (event) => {
    // @ts-ignore useRuntimeConfig is auto-imported in Nuxt server context
    const config = useRuntimeConfig()
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
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Chromium\\Application\\chromium.exe',
        'C:\\Program Files (x86)\\Chromium\\Application\\chromium.exe',
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

      // Set viewport for PDF generation (height will be adjusted based on content)
    await page.setViewport({
        width: PDF_PAGE_WIDTH,
        height: 1000, // Initial height, will be adjusted based on content
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

      // Get render secret token
      const renderSecretToken = process.env.RENDER_SECRET_TOKEN
      if (!renderSecretToken) {
          throw new Error('RENDER_SECRET_TOKEN environment variable is not configured')
      }

      // Load the render dashboard page with authentication
      const renderUrl = `${config.public.siteUrl}/render/dashboards/${id}`
      console.log('Loading render URL:', renderUrl)

      // Set the render secret token header
      await page.setExtraHTTPHeaders({
          'render_secret_token': renderSecretToken
      })

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

      const marginTop = 20 // px
      const marginBottom = 20 // px
      const pdfHeight = bodyHeight + marginTop + marginBottom

      console.log(`Page body height: ${bodyHeight}px, PDF height with margins: ${pdfHeight}px`)

      // Generate PDF from the loaded page
    const pdf = await page.pdf({
        // format: 'A4',
        height: `${pdfHeight}px`,
        width: `${PDF_PAGE_WIDTH}px`,
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
