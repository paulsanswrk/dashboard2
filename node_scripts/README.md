# Optiqo Node Scripts

This directory contains standalone Node.js scripts for the Optiqo dashboard.

## SendGrid Test Email Script

### Setup

1. Navigate to the `node_scripts` directory:
   ```bash
   cd node_scripts
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Usage

The script uses environment variables from your project's `.env` file:
- `SENDGRID_API_KEY` - Your SendGrid API key
- `SENDGRID_SENDER_EMAIL` - The sender email address

To send a test email:

```bash
npm run test-email
```

### Configuration

Before running the script, make sure to:

1. Update the `TEST_RECIPIENT` variable in `sendgrid-test-email.js` to your actual test email address
2. Ensure your project's `.env` file (in the parent directory) contains the required SendGrid credentials:
   ```
   SENDGRID_API_KEY=SG.your_api_key_here
   SENDGRID_SENDER_EMAIL=noreply@optiqo.com
   ```

### Example Output

When successful, you'll see:
```
Sending test email...
From: noreply@optiqo.com
To: test@example.com
✅ Email sent successfully!
Response status: 202
Message ID: <some-message-id@sendgrid.net>
```

### Troubleshooting

- **Missing environment variables**: Make sure your `.env` file exists and contains the required variables
- **API key issues**: Verify your SendGrid API key is valid and has sending permissions
- **Sender email issues**: Ensure the sender email is verified in your SendGrid account
