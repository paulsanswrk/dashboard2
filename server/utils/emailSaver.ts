/**
 * Email saving utility for development testing
 *
 * To enable local email saving, set the SAVE_EMAILS_TO environment variable
 * to a directory path where emails should be saved as .eml files.
 *
 * Example:
 * SAVE_EMAILS_TO=./dev-emails
 *
 * This will save all emails sent via SendGrid to the specified directory
 * in .eml format, which can be opened with most email clients for inspection.
 */

import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'

export interface EmailData {
    from: string
    to: string | string[]
    subject: string
    html?: string
    text?: string
    attachments?: Array<{
        filename: string
        content: Buffer | string
        contentType?: string
    }>
}

/**
 * Save email to local file in .eml format for development testing
 */
export async function saveEmailLocally(emailData: EmailData): Promise<void> {
    const saveEmailsTo = process.env.SAVE_EMAILS_TO

    if (!saveEmailsTo) {
        return // No local saving configured
    }

    try {
        // Create directory if it doesn't exist
        await fs.promises.mkdir(saveEmailsTo, {recursive: true})

        // Generate filename with timestamp and subject
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const sanitizedSubject = emailData.subject.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)
        const filename = `${timestamp}_${sanitizedSubject}.eml`
        const filePath = path.join(saveEmailsTo, filename)

        // Create transporter that streams to memory (doesn't actually send)
        const transporter = nodemailer.createTransport({
            streamTransport: true, // do not send
            buffer: true           // return message in-memory
        })

        // Prepare mail options
        const mailOptions = {
            from: emailData.from,
            to: emailData.to,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
            attachments: emailData.attachments?.map(att => ({
                filename: att.filename,
                content: att.content,
                contentType: att.contentType
            }))
        }

        // Send email (streams to memory, doesn't actually send)
        const info = await transporter.sendMail(mailOptions)

        // Save .eml file (full email with headers)
        await fs.promises.writeFile(filePath, info.message)

        console.log(`Email saved locally: ${filePath}`)

    } catch (error) {
        console.error('Error saving email locally:', error)
        // Don't throw - we don't want local saving to break email sending
    }
}
