import sgMail from '@sendgrid/mail'
import type {ReportAttachment} from './reportGenerator'
import {saveEmailLocally} from './emailSaver'

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '')

const SENDER_EMAIL = process.env.SENDGRID_SENDER_EMAIL || 'noreply@optiqo.com'

export interface ReportEmailData {
    to: string[]
    subject: string
    message?: string
    attachments: ReportAttachment[]
    reportTitle: string
}

export interface EmailSendResult {
    success: boolean
    error?: {
        message: string
        stack?: string
        recipientCount: number
        recipients: string[]
        subject: string
        attachmentCount: number
    }
}

/**
 * Send a report email with attachments
 */
export async function sendReportEmail(data: ReportEmailData): Promise<EmailSendResult> {
    try {
        if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_SENDER_EMAIL) {
            console.error('SendGrid configuration missing')
            return {
                success: false,
                error: {
                    message: 'SendGrid configuration missing',
                    recipientCount: data.to.length,
                    recipients: data.to,
                    subject: data.subject,
                    attachmentCount: data.attachments.length
                }
            }
        }

        const {to, subject, message, attachments, reportTitle} = data

        // Generate email template
        const template = generateReportEmailTemplate({
            reportTitle,
            customMessage: message,
            attachmentCount: attachments.length,
            attachmentNames: attachments.map(a => a.filename)
        })

        // Prepare attachments for SendGrid
        const sendGridAttachments = attachments.map(attachment => {
            let content = attachment.content

            // Fix for bug where attachment content is comma-separated ASCII values instead of binary data
            if (typeof content === 'string' && /^\d+(,\d+)*$/.test(content.substring(0, 50))) {
                console.error(`BUG DETECTED: Attachment content is comma-separated numbers instead of binary data! Converting back to buffer.`, {
                    filename: attachment.filename,
                    contentPreview: content.substring(0, 100)
                })
                // Convert comma-separated numbers back to buffer
                const byteArray = content.split(',').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 255)
                content = Buffer.from(byteArray)
            }

            // Ensure content is a Buffer
            if (!Buffer.isBuffer(content)) {
                console.warn(`Attachment content is not a Buffer, converting:`, {
                    filename: attachment.filename,
                    contentType: typeof content,
                    isBuffer: Buffer.isBuffer(content)
                })
                if (typeof content === 'string') {
                    content = Buffer.from(content, 'utf8')
                } else if (Array.isArray(content)) {
                    content = Buffer.from(content)
                } else {
                    console.error(`Cannot convert attachment content to Buffer:`, { filename: attachment.filename, contentType: typeof content })
                    content = Buffer.from('Error: Invalid attachment content', 'utf8')
                }
            }

            return {
                content: content.toString('base64'),
                filename: attachment.filename,
                type: attachment.contentType,
                disposition: 'attachment'
            }
        })

        const msg = {
            to: to.length === 1 ? to[0] : to, // SendGrid handles single recipient differently
            from: SENDER_EMAIL,
            subject,
            html: template.html,
            text: template.text,
            attachments: sendGridAttachments
        }

        // Save email locally for development testing if SAVE_EMAILS_TO is configured
        await saveEmailLocally({
            from: SENDER_EMAIL,
            to: to,
            subject,
            html: template.html,
            text: template.text,
            attachments: attachments.map(att => ({
                filename: att.filename,
                content: att.content,
                contentType: att.contentType
            }))
        })

        await sgMail.send(msg)

        console.log(`Report email sent successfully to ${to.join(', ')} with ${attachments.length} attachments`)
        return {success: true}

    } catch (error: any) {
        console.error('Error sending report email:', error)

        return {
            success: false,
            error: {
                message: error.message || 'Unknown error',
                stack: error.stack,
                recipientCount: data.to.length,
                recipients: data.to,
                subject: data.subject,
                attachmentCount: data.attachments.length
            }
        }
    }
}

interface ReportEmailTemplate {
    subject: string
    html: string
    text: string
}

interface ReportEmailTemplateData {
    reportTitle: string
    customMessage?: string
    attachmentCount: number
    attachmentNames: string[]
}

/**
 * Generate report email template
 */
function generateReportEmailTemplate(data: ReportEmailTemplateData): ReportEmailTemplate {
    const {reportTitle, customMessage, attachmentCount, attachmentNames} = data

    const subject = `Optiqo Report: ${reportTitle}`

    const attachmentListHtml = attachmentNames
        .map(name => `<li style="margin-bottom: 5px;">📎 ${name}</li>`)
        .join('')

    const attachmentListText = attachmentNames
        .map(name => `📎 ${name}`)
        .join('\n')

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Optiqo Report: ${reportTitle}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #374151;
            background-color: #f3f4f6;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .header {
            background-color: #f1e0b4;
            padding: 24px;
            text-align: center;
        }

        .logo-img {
            height: 40px;
            width: auto;
            margin-bottom: 8px;
        }

        .report-badge {
            background-color: #eee;
            color: #111827;
            border: 1px solid #92400e;
            padding: 12px 20px;
            border-radius: 20px;
            font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            font-size: 18px;
            font-weight: 700;
            display: inline-block;
            margin-top: 16px;
        }

        .content {
            padding: 32px 24px;
        }

        .title {
            font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            font-size: 24px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
            letter-spacing: -0.02em;
        }

        .message {
            font-size: 16px;
            color: #374151;
            margin-bottom: 24px;
            line-height: 1.6;
        }

        .custom-message {
            background-color: #f9fafb;
            border-left: 4px solid #f29027;
            padding: 16px;
            margin: 20px 0;
            font-style: italic;
        }

        .attachments-section {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 20px;
            margin: 24px 0;
        }

        .attachments-title {
            font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
        }

        .attachments-list {
            list-style: none;
            padding: 0;
        }

        .attachments-list li {
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }

        .attachments-list li:last-child {
            border-bottom: none;
        }

        .footer {
            background-color: #f9fafb;
            padding: 20px 24px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }

        .footer-text {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }

        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }

            .content {
                padding: 24px 16px;
            }

            .header {
                padding: 20px 16px;
            }

            .title {
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${process.env.SITE_URL || 'http://localhost:3000'}/images/Optiqo_logo.png" alt="Optiqo" class="logo-img">
            <br>
            <div class="report-badge">Scheduled Report</div>
        </div>

        <div class="content">
            <h1 class="title">${reportTitle}</h1>

            <p class="message">
                Your scheduled report "${reportTitle}" is ready. The report contains ${attachmentCount} attachment${attachmentCount !== 1 ? 's' : ''} with your requested data exports.
            </p>

            ${customMessage ? `
            <div class="custom-message">
                <strong>Message from the report creator:</strong><br>
                ${customMessage.replace(/\n/g, '<br>')}
            </div>
            ` : ''}

            <div class="attachments-section">
                <h3 class="attachments-title">Report Attachments</h3>
                <ul class="attachments-list">
                    ${attachmentListHtml}
                </ul>
            </div>

            <p class="message">
                This report was generated automatically according to your schedule settings.
                If you have any questions about this report, please contact your administrator.
            </p>
        </div>

        <div class="footer">
            <div class="footer-text">This report was generated by Optiqo Dashboard</div>
            <div class="footer-text">Empowering data-driven decisions</div>
        </div>
    </div>
</body>
</html>`

    const text = `
Optiqo Report: ${reportTitle}

Your scheduled report "${reportTitle}" is ready. The report contains ${attachmentCount} attachment${attachmentCount !== 1 ? 's' : ''} with your requested data exports.

${customMessage ? `Message from the report creator:
${customMessage}

` : ''}Report Attachments:
${attachmentListText}

This report was generated automatically according to your schedule settings.
If you have any questions about this report, please contact your administrator.

This report was generated by Optiqo Dashboard
Empowering data-driven decisions
`

    return {subject, html, text}
}

/**
 * Send test email to verify configuration
 */
export async function sendTestEmail(to: string): Promise<EmailSendResult> {
    try {
        if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_SENDER_EMAIL) {
            console.error('SendGrid configuration missing')
            return {
                success: false,
                error: {
                    message: 'SendGrid configuration missing',
                    recipientCount: 1,
                    recipients: [to],
                    subject: 'Optiqo Email Configuration Test',
                    attachmentCount: 0
                }
            }
        }

        const template = {
            subject: 'Optiqo Email Configuration Test',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Optiqo Email Test</h2>
          <p>This is a test email to verify your SendGrid configuration is working correctly.</p>
          <p>If you received this email, your email settings are properly configured!</p>
          <hr>
          <p><small>Sent from Optiqo Dashboard</small></p>
        </div>
      `,
            text: `
Optiqo Email Test

This is a test email to verify your SendGrid configuration is working correctly.

If you received this email, your email settings are properly configured!

Sent from Optiqo Dashboard
      `
        }

        const msg = {
            to,
            from: SENDER_EMAIL,
            subject: template.subject,
            html: template.html,
            text: template.text
        }

        // Save email locally for development testing if SAVE_EMAILS_TO is configured
        await saveEmailLocally({
            from: SENDER_EMAIL,
            to,
            subject: template.subject,
            html: template.html,
            text: template.text
        })

        await sgMail.send(msg)

        console.log(`Test email sent successfully to ${to}`)
        return {success: true}

    } catch (error: any) {
        console.error('Error sending test email:', error)

        return {
            success: false,
            error: {
                message: error.message || 'Unknown error',
                stack: error.stack,
                recipientCount: 1,
                recipients: [to],
                subject: 'Optiqo Email Configuration Test',
                attachmentCount: 0
            }
        }
    }
}
