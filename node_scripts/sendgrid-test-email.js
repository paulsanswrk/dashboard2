#!/usr/bin/env node

import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

// Load environment variables from .env file in project root
dotenv.config({ path: '../.env' });

// Configure SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const SENDER_EMAIL = process.env.SENDGRID_SENDER_EMAIL;
const TEST_RECIPIENT = 'paulsanstest@gmail.com'; // Change this to your test email address

async function sendTestEmail() {
  // Check if recipient is still the placeholder
  if (TEST_RECIPIENT === 'test@example.com') {
    console.error('❌ Please update the TEST_RECIPIENT variable in the script to a valid email address');
    console.error('Current recipient:', TEST_RECIPIENT);
    console.error('This is just a placeholder and cannot receive emails.');
    process.exit(1);
  }
  try {
    const msg = {
      to: TEST_RECIPIENT,
      from: SENDER_EMAIL,
      subject: 'SendGrid Test Email - Optiqo Dashboard',
      text: 'This is a test email sent from the Optiqo dashboard using SendGrid API.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">SendGrid Test Email</h2>
          <p>This is a test email sent from the <strong>Optiqo Dashboard</strong> using the SendGrid API.</p>
          <p>If you received this email, your SendGrid configuration is working correctly!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Sent at: ${new Date().toLocaleString()}<br>
            From: ${SENDER_EMAIL}
          </p>
        </div>
      `,
    };

    console.log('Sending test email...');
    console.log(`From: ${SENDER_EMAIL}`);
    console.log(`To: ${TEST_RECIPIENT}`);

    const result = await sgMail.send(msg);

    console.log('✅ Email sent successfully!');
    console.log('Response status:', result[0].statusCode);
    console.log('Message ID:', result[0].headers['x-message-id']);

  } catch (error) {
    console.error('❌ Error sending email:', error.message);

    if (error.response) {
      console.error('SendGrid API Error Details:');
      console.error('Status Code:', error.response.statusCode);
      console.error('Body:', error.response.body);
    }

    process.exit(1);
  }
}

// Check if required environment variables are set
if (!process.env.SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY environment variable is not set');
  console.error('Please make sure your .env file contains: SENDGRID_API_KEY=your_api_key');
  process.exit(1);
}

if (!process.env.SENDGRID_SENDER_EMAIL) {
  console.error('❌ SENDGRID_SENDER_EMAIL environment variable is not set');
  console.error('Please make sure your .env file contains: SENDGRID_SENDER_EMAIL=your_sender_email');
  process.exit(1);
}

// Run the test
sendTestEmail();
