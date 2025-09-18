import sgMail from '@sendgrid/mail'

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '')

const SENDER_EMAIL = process.env.SENDGRID_SENDER_EMAIL || 'noreply@optiqo.com'

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface UserInvitationData {
  email: string
  firstName?: string
  lastName?: string
  role: string
  organizationName?: string
  confirmationUrl: string
  siteUrl?: string
}

export interface ViewerInvitationData {
  email: string
  firstName?: string
  lastName?: string
  type: string
  group?: string
  confirmationUrl: string
  siteUrl?: string
}

/**
 * Generate user invitation email template
 */
export function generateUserInvitationTemplate(data: UserInvitationData): EmailTemplate {
  const { email, firstName, lastName, role, confirmationUrl } = data
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || 'User'
  
  const subject = `Welcome to Optiqo - Complete Your Account Setup`
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Optiqo</title>
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
        
        .welcome-badge {
            background-color: #eee;
            color: #111827;
            border: 1px solid #92400e;
            padding: 12px 20px;
            border-radius: 20px;
            font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            font-size: 22px;
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
        
        .role-badge {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 12px 16px;
            margin: 16px 0;
            text-align: center;
        }
        
        .role-text {
            font-weight: 600;
            color: #92400e;
        }
        
        .cta-button {
            display: inline-block;
            background-color: #f29027;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            transition: background-color 0.2s ease;
            margin: 20px 0;
        }
        
        .cta-button:link {
            color: #ffffff !important;
        }
        
        .cta-button:visited {
            color: #ffffff !important;
        }
        
        .cta-button:hover {
            background-color: #e07d1a;
            color: #ffffff !important;
        }
        
        .cta-button:active {
            color: #ffffff !important;
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
        
        .security-note {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 16px;
            margin-top: 24px;
        }
        
        .security-note-title {
            font-weight: 600;
            color: #92400e;
            margin-bottom: 8px;
        }
        
        .security-note-text {
            font-size: 14px;
            color: #92400e;
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
            <img src="${siteUrl}/images/Optiqo_logo.png" alt="Optiqo" class="logo-img">
            <br>
            <div class="welcome-badge">Welcome to Optiqo!</div>
        </div>
        
        <div class="content">
            <h1 class="title">Complete Your Account Setup</h1>
            
            <p class="message">
                Hello ${fullName},<br><br>
                You've been invited to join Optiqo as a <strong>${role}</strong>. 
                Click the button below to complete your account setup and start creating powerful dashboards.
            </p>
            
            <div class="role-badge">
                <div class="role-text">Your Role: ${role}</div>
            </div>
            
            <div style="text-align: center;">
                <a href="${data.confirmationUrl}" class="cta-button" style="color: #ffffff !important; text-decoration: none;">
                    Complete Setup & Access Dashboard
                </a>
            </div>
            
            <div class="security-note">
                <div class="security-note-title">Security Notice</div>
                <div class="security-note-text">
                    This invitation link is unique to you and will expire in 24 hours for security purposes. 
                    If you did not expect this invitation, please contact your administrator.
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-text">This email was sent by Optiqo Dashboard</div>
            <div class="footer-text">Ready to transform your data into insights? Let's get started!</div>
        </div>
    </div>
</body>
</html>`

  const text = `
Welcome to Optiqo!

Hello ${fullName},

You've been invited to join Optiqo as a ${role}. 

Complete your account setup by visiting: ${data.confirmationUrl}

Your Role: ${role}

This invitation link is unique to you and will expire in 24 hours for security purposes.

If you did not expect this invitation, please contact your administrator.

This email was sent by Optiqo Dashboard
Ready to transform your data into insights? Let's get started!
`

  return { subject, html, text }
}

/**
 * Generate viewer invitation email template
 */
export function generateViewerInvitationTemplate(data: ViewerInvitationData): EmailTemplate {
  const { email, firstName, lastName, type, group, confirmationUrl } = data
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || 'Viewer'
  
  const subject = `You've been invited to view Optiqo dashboards`
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Viewer Invitation - Optiqo</title>
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
        
        .welcome-badge {
            background-color: #eee;
            color: #111827;
            border: 1px solid #92400e;
            padding: 12px 20px;
            border-radius: 20px;
            font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            font-size: 22px;
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
        
        .viewer-info {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 20px;
            margin: 24px 0;
        }
        
        .viewer-info-title {
            font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
        }
        
        .info-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
            color: #374151;
        }
        
        .info-label {
            font-weight: 600;
        }
        
        .cta-button {
            display: inline-block;
            background-color: #f29027;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            transition: background-color 0.2s ease;
            margin: 20px 0;
        }
        
        .cta-button:link {
            color: #ffffff !important;
        }
        
        .cta-button:visited {
            color: #ffffff !important;
        }
        
        .cta-button:hover {
            background-color: #e07d1a;
            color: #ffffff !important;
        }
        
        .cta-button:active {
            color: #ffffff !important;
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
        
        .security-note {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 16px;
            margin-top: 24px;
        }
        
        .security-note-title {
            font-weight: 600;
            color: #92400e;
            margin-bottom: 8px;
        }
        
        .security-note-text {
            font-size: 14px;
            color: #92400e;
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
            <img src="${siteUrl}/images/Optiqo_logo.png" alt="Optiqo" class="logo-img">
            <br>
            <div class="welcome-badge">Dashboard Access</div>
        </div>
        
        <div class="content">
            <h1 class="title">You've been invited to view dashboards</h1>
            
            <p class="message">
                Hello ${fullName},<br><br>
                You've been granted access to view Optiqo dashboards. 
                Click the button below to access your dashboard viewer account.
            </p>
            
            <div class="viewer-info">
                <div class="viewer-info-title">Your Access Details</div>
                <div class="info-item">
                    <span class="info-label">Viewer Type:</span>
                    <span>${type}</span>
                </div>
                ${group ? `
                <div class="info-item">
                    <span class="info-label">Group:</span>
                    <span>${group}</span>
                </div>
                ` : ''}
                <div class="info-item">
                    <span class="info-label">Email:</span>
                    <span>${email}</span>
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="${data.confirmationUrl}" class="cta-button" style="color: #ffffff !important; text-decoration: none;">
                    Access Dashboards
                </a>
            </div>
            
            <div class="security-note">
                <div class="security-note-title">Security Notice</div>
                <div class="security-note-text">
                    This access link is unique to you and will expire in 24 hours for security purposes. 
                    If you did not expect this invitation, please contact your administrator.
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-text">This email was sent by Optiqo Dashboard</div>
            <div class="footer-text">Access your data insights securely and efficiently</div>
        </div>
    </div>
</body>
</html>`

  const text = `
You've been invited to view Optiqo dashboards

Hello ${fullName},

You've been granted access to view Optiqo dashboards.

Access your dashboard viewer account: ${data.confirmationUrl}

Your Access Details:
- Viewer Type: ${type}
${group ? `- Group: ${group}` : ''}
- Email: ${email}

This access link is unique to you and will expire in 24 hours for security purposes.

If you did not expect this invitation, please contact your administrator.

This email was sent by Optiqo Dashboard
Access your data insights securely and efficiently
`

  return { subject, html, text }
}

/**
 * Send email using SendGrid
 */
export async function sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_SENDER_EMAIL) {
      console.error('SendGrid configuration missing')
      return false
    }

    const msg = {
      to,
      from: SENDER_EMAIL,
      subject: template.subject,
      text: template.text,
      html: template.html,
    }

    await sgMail.send(msg)
    console.log(`Email sent successfully to ${to}`)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

/**
 * Generate user invitation email template with magic link
 */
export function generateUserInvitationWithMagicLinkTemplate(data: UserInvitationData): EmailTemplate {
  const { email, firstName, lastName, role, organizationName, siteUrl = 'http://localhost:3000' } = data
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || 'User'
  const roleDisplay = role === 'ADMIN' ? 'Administrator' : 'Editor'
  
  const subject = `Welcome to Optiqo - Complete Your Account Setup`
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Optiqo - Complete Your Account Setup</title>
    <style>
        /* Reset and base styles */
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
        
        .logo {
            color: #ffffff;
            font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.02em;
            text-transform: uppercase;
        }
        
        .logo-img {
            height: 40px;
            width: auto;
            margin-bottom: 8px;
        }
        
        .welcome-badge {
            background-color: #eee;
            color: #111827;
            border: 1px solid #92400e;
            padding: 12px 20px;
            border-radius: 20px;
            font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            font-size: 22px;
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
        
        .account-details {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 20px;
            margin: 24px 0;
        }
        
        .account-details-title {
            font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
            color: #374151;
        }
        
        .detail-label {
            font-weight: 600;
        }
        
        .cta-button {
            display: inline-block;
            background-color: #f29027;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            transition: background-color 0.2s ease;
            margin: 20px 0;
        }
        
        .cta-button:hover {
            background-color: #e07d1a;
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
        
        .security-note {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 16px;
            margin-top: 24px;
        }
        
        .security-note-title {
            font-weight: 600;
            color: #92400e;
            margin-bottom: 8px;
        }
        
        .security-note-text {
            font-size: 14px;
            color: #92400e;
        }
        
        /* Mobile responsiveness */
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
            
            .account-details {
                padding: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <img src="${siteUrl}/images/Optiqo_logo.png" alt="Optiqo" class="logo-img">
            <br>
            <div class="welcome-badge">Welcome to Optiqo!</div>
        </div>
        
        <!-- Main Content -->
        <div class="content">
            <h1 class="title">Complete Your Account Setup</h1>
            
            <p class="message">
                Hello ${fullName}! You've been invited to join Optiqo as a <strong>${roleDisplay}</strong>. 
                Click the button below to complete your account setup and start creating powerful dashboards.
            </p>
            
            <!-- Account Details -->
            <div class="account-details">
                <h3 class="account-details-title">Your Account Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <span>${email}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Role:</span>
                    <span>${roleDisplay}</span>
                </div>
                ${organizationName ? `
                <div class="detail-row">
                    <span class="detail-label">Organization:</span>
                    <span>${organizationName}</span>
                </div>
                ` : ''}
            </div>
            
            <!-- Call to Action Button -->
            <div style="text-align: center;">
                <a href="${data.confirmationUrl}" class="cta-button">
                    Complete Account Setup
                </a>
            </div>
            
            <!-- Security Note -->
            <div class="security-note">
                <div class="security-note-title">Security Notice</div>
                <div class="security-note-text">
                    This invitation link is unique to you and will expire in 24 hours for security purposes. 
                    If you did not expect this invitation, please contact your administrator.
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="footer-text">
                This email was sent by Optiqo Dashboard
            </div>
            <div class="footer-text">
                Ready to transform your data into insights? Let's get started!
            </div>
        </div>
    </div>
</body>
</html>
  `

  const text = `
Welcome to Optiqo - Complete Your Account Setup

Hello ${fullName}!

You've been invited to join Optiqo as a ${roleDisplay}.

Your Account Details:
- Email: ${email}
- Role: ${roleDisplay}
${organizationName ? `- Organization: ${organizationName}` : ''}

Complete your account setup: ${data.confirmationUrl}

This invitation link is unique to you and will expire in 24 hours for security purposes.

If you did not expect this invitation, please contact your administrator.

This email was sent by Optiqo Dashboard
Ready to transform your data into insights? Let's get started!
  `

  return { subject, html, text }
}

/**
 * Generate viewer invitation email template with magic link
 */
export function generateViewerInvitationWithMagicLinkTemplate(data: ViewerInvitationData): EmailTemplate {
  const { email, firstName, lastName, type, group, siteUrl = 'http://localhost:3000' } = data
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || 'User'
  const viewerType = type || 'Viewer'
  
  const subject = `Welcome to Optiqo - Access Your Dashboard Viewer Account`
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Optiqo - Access Your Dashboard Viewer Account</title>
    <style>
        /* Reset and base styles */
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
        
        .logo {
            color: #ffffff;
            font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.02em;
            text-transform: uppercase;
        }
        
        .logo-img {
            height: 40px;
            width: auto;
            margin-bottom: 8px;
        }
        
        .welcome-badge {
            background-color: #eee;
            color: #111827;
            border: 1px solid #92400e;
            padding: 12px 20px;
            border-radius: 20px;
            font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            font-size: 22px;
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
        
        .account-details {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 20px;
            margin: 24px 0;
        }
        
        .account-details-title {
            font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
            color: #374151;
        }
        
        .detail-label {
            font-weight: 600;
        }
        
        .cta-button {
            display: inline-block;
            background-color: #f29027;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            transition: background-color 0.2s ease;
            margin: 20px 0;
        }
        
        .cta-button:hover {
            background-color: #e07d1a;
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
        
        .security-note {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 16px;
            margin-top: 24px;
        }
        
        .security-note-title {
            font-weight: 600;
            color: #92400e;
            margin-bottom: 8px;
        }
        
        .security-note-text {
            font-size: 14px;
            color: #92400e;
        }
        
        /* Mobile responsiveness */
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
            
            .account-details {
                padding: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <img src="${siteUrl}/images/Optiqo_logo.png" alt="Optiqo" class="logo-img">
            <br>
            <div class="welcome-badge">Welcome to Optiqo!</div>
        </div>
        
        <!-- Main Content -->
        <div class="content">
            <h1 class="title">Access Your Dashboard Viewer Account</h1>
            
            <p class="message">
                Hello ${fullName}! You've been granted access to view Optiqo dashboards as a <strong>${viewerType}</strong>. 
                Click the button below to access your viewer account and start exploring insights.
            </p>
            
            <!-- Account Details -->
            <div class="account-details">
                <h3 class="account-details-title">Your Access Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <span>${email}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Viewer Type:</span>
                    <span>${viewerType}</span>
                </div>
                ${group ? `
                <div class="detail-row">
                    <span class="detail-label">Group:</span>
                    <span>${group}</span>
                </div>
                ` : ''}
            </div>
            
            <!-- Call to Action Button -->
            <div style="text-align: center;">
                <a href="${data.confirmationUrl}" class="cta-button">
                    Access Your Dashboard
                </a>
            </div>
            
            <!-- Security Note -->
            <div class="security-note">
                <div class="security-note-title">Security Notice</div>
                <div class="security-note-text">
                    This access link is unique to you and will expire in 24 hours for security purposes. 
                    If you did not expect this invitation, please contact your administrator.
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="footer-text">
                This email was sent by Optiqo Dashboard
            </div>
            <div class="footer-text">
                Ready to explore your data insights? Let's get started!
            </div>
        </div>
    </div>
</body>
</html>
  `

  const text = `
Welcome to Optiqo - Access Your Dashboard Viewer Account

Hello ${fullName}!

You've been granted access to view Optiqo dashboards as a ${viewerType}.

Your Access Details:
- Email: ${email}
- Viewer Type: ${viewerType}
${group ? `- Group: ${group}` : ''}

Access your dashboard: ${data.confirmationUrl}

This access link is unique to you and will expire in 24 hours for security purposes.

If you did not expect this invitation, please contact your administrator.

This email was sent by Optiqo Dashboard
Ready to explore your data insights? Let's get started!
  `

  return { subject, html, text }
}

/**
 * Generate magic link for user authentication
 */
export function generateMagicLink(userId: string, email: string, siteUrl: string = 'http://localhost:3000'): string {
  // For now, we'll generate a simple confirmation URL
  // In a real implementation, you'd want to generate a secure token
  return `${siteUrl}/auth/callback?token=${userId}&email=${encodeURIComponent(email)}`
}
