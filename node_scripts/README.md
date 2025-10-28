# Optiqo Node Scripts

This directory contains standalone Node.js scripts for the Optiqo dashboard.

## Available Scripts

- **AI Chart Generator** (`ai/`) - Claude AI-powered chart generation with SQL and ECharts
- **SendGrid Email Testing** - Test email functionality
- **SSH Tunnel Testing** - Test SSH tunnel connections
- **Database Introspection** - Test database schema introspection

## Claude AI Chart Generator ⭐ NEW

An intelligent chart generation tool that uses Claude AI to automatically create visualizations from natural language requests.

### Quick Start

**Simple Mode (Hardcoded - No Arguments):**
```bash
cd node_scripts
npm install
npm run ai-chart-simple
```

**Command Line Mode (With Arguments):**
```bash
npm run ai-chart "Show a pie chart of film categories"
```

See the full documentation in [`ai/README.md`](ai/README.md)

### Features

- 🤖 Natural language to SQL conversion
- 🎨 Automatic chart configuration generation
- 📊 Beautiful HTML reports with interactive charts
- 💬 Interactive mode for multiple requests
- 🗄️ Direct database query execution

### Example Commands

```bash
# Simple mode (hardcoded, no arguments)
npm run ai-chart-simple

# Single chart generation (with prompt)
npm run ai-chart "Top 10 customers by payment amount"

# Interactive mode (multiple prompts)
npm run ai-chart-interactive

# Test your setup
node ai/test-setup.js
```

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
