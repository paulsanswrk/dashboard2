# Dashboard PDF Generation Implementation

## Overview

The dashboard PDF generation system provides server-side PDF export functionality for dashboard previews. Unlike the previous implementation that reconstructed dashboards server-side using complex data fetching and HTML generation, this new approach leverages the existing preview page rendering to create pixel-perfect PDF exports.

## Architecture

### Core Approach

The implementation uses Puppeteer to load the dashboard render page (`/render/dashboards/{id}`) and generate a PDF directly from the rendered content. This ensures the PDF output matches exactly what users see in their browser.

### Key Components

1. **Security Context System**
    - Uses encrypted context tokens for secure rendering access
    - AES-256-GCM encryption with nonce-based tokens
    - Context tokens passed as URL query parameters
    - Validates tokens at both middleware and API levels

2. **Authentication & Authorization**
    - Validates dashboard existence
    - Enforces ownership/access control for private dashboards
   - Bypasses authentication when valid render context is present
   - Uses Supabase authentication for normal access

3. **Puppeteer Browser Setup**
    - Cross-platform Chrome/Chromium detection
    - Environment-specific configuration (development vs production)
    - Serverless-compatible using @sparticuz/chromium

4. **Dynamic Content Loading**
    - Navigates to render URL with context token
    - Waits for complete content loading (charts, data, styling)
    - Handles dynamic content rendering

5. **Dynamic PDF Sizing**
    - Measures actual page content height using `document.body.scrollHeight`
    - Calculates PDF dimensions including margins
    - Generates custom-sized PDFs instead of fixed formats

## Implementation Details

### File Structure

```
server/api/dashboards/[id]/pdf.get.ts          # PDF generation endpoint
server/api/dashboards/[id]/full.get.ts         # Dashboard data API (supports render context)
server/middleware/render.ts                    # Render route security middleware
server/utils/renderContext.ts                   # Context token encryption/decryption
pages/render/dashboards/[id].vue                # Render page component
```

### Key Configuration Constants

```typescript
const PDF_PAGE_WIDTH = 1800 // pixels (fixed width for viewport and PDF)
```

### Puppeteer Browser Configuration

**Development Environment:**

- Auto-detects Chrome/Chromium installations on Windows
- Uses sandbox-free mode for compatibility
- Includes web security bypass for CDN resources

**Production Environment:**

- Uses @sparticuz/chromium for serverless deployment
- Optimized arguments for cloud environments

### Dynamic Height Calculation

```typescript
// Get the actual body height and calculate PDF height with margins
const bodyHeight = await page.evaluate(() => {
  return document.body.scrollHeight
})

const marginTop = 20 // px
const marginBottom = 20 // px
const pdfHeight = bodyHeight + marginTop + marginBottom
```

### PDF Generation Settings

```typescript
const pdf = await page.pdf({
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
```

## Technical Implementation

### Browser Detection Logic

The system automatically detects Chrome/Chromium installations in common locations:

```typescript
const possiblePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Chromium\\Application\\chromium.exe',
  'C:\\Program Files (x86)\\Chromium\\Application\\chromium.exe',
  process.env.PUPPETEER_EXECUTABLE_PATH
].filter(Boolean)
```

### Security Context Token Flow

1. **Token Generation**: PDF endpoint generates encrypted context token using `generateRenderContext()`
2. **Token Format**: Encrypted payload contains `'RENDER'|nonce` using AES-256-GCM
3. **URL Encoding**: Token is base64url-encoded and passed as query parameter
4. **Middleware Validation**: Render middleware validates token before allowing page access
5. **API Bypass**: Full API endpoint validates context and bypasses auth for render requests

### Content Loading Strategy

1. **Token Generation**: Generate encrypted render context token
2. **Navigation**: Uses `page.goto()` with context token as query parameter (`?context=...`)
3. **Wait Strategy**: Uses `waitUntil: 'networkidle0'` for network completion
4. **Additional Wait**: 5-second buffer for dynamic content rendering
5. **Height Measurement**: Evaluates `document.body.scrollHeight` in browser context
6. **PDF Generation**: Applies calculated dimensions with margins

### Error Handling

- **Context Token Errors**: 403 Forbidden for missing or invalid context tokens
- **Authentication Errors**: 403 Forbidden for unauthorized access (when context invalid)
- **Dashboard Not Found**: 404 for invalid dashboard IDs
- **Browser Setup**: Detailed error messages for missing Chrome installations
- **PDF Generation**: 500 Internal Server Error with logged details

### Response Headers

```typescript
event.node.res.setHeader('Content-Type', 'application/pdf')
event.node.res.setHeader('Content-Disposition', `attachment; filename="${dashboard.name.replace(/[^a-z0-9]/gi, '_')}.pdf"`)
```

## Benefits

### Advantages Over Previous Implementation

1. **Simplified Architecture**
    - No complex server-side data fetching
    - No SQL query execution for PDF generation
    - No Vue component server-side rendering

2. **Pixel-Perfect Output**
    - PDF matches browser preview exactly
    - Includes all CSS styling and dynamic content
    - Handles responsive layouts correctly

3. **Dynamic Sizing**
    - PDF height adapts to content length
    - No wasted whitespace or cut-off content
    - Margins properly accounted for

4. **Maintainability**
    - Leverages existing preview page logic
    - Changes to dashboard rendering automatically apply to PDFs
    - Single source of truth for dashboard appearance

### Performance Characteristics

- **Resource Usage**: Moderate (single browser instance per request)
- **Generation Time**: ~10-15 seconds for complex dashboards
- **Memory**: ~200-500MB peak usage during PDF generation
- **Scalability**: Suitable for moderate concurrent usage

## Configuration Options

### Environment Variables

- `APP_CIPHER_KEY`: 32-byte (64 hex characters) encryption key for context tokens
    - Generate with: `openssl rand -hex 32`
    - Required for render context security
- `NODE_ENV`: Controls browser setup (development vs production)
- `VERCEL`: Triggers serverless Chromium usage
- `PUPPETEER_EXECUTABLE_PATH`: Override browser executable path

### PDF Dimensions

- **Width**: Fixed at 1800px (configurable via `PDF_PAGE_WIDTH`)
- **Height**: Dynamic based on content + margins
- **Margins**: 20px on all sides (configurable)

### Browser Arguments

Development mode includes:

- `--no-sandbox`
- `--disable-setuid-sandbox`
- `--disable-web-security`

Production mode uses `@sparticuz/chromium` optimized args.

## Debugging and Monitoring

### Console Logging

The implementation provides essential logging for errors and key operations:

```
Loading render URL: http://localhost:3000/render/dashboards/a0abf1c8-f985-4944-835f-bef112af5a3c?context=...
Page body height: 1200px, PDF height with margins: 1240px
```

### Error Monitoring

- Context token validation errors are logged
- Page console messages are captured
- JavaScript errors are captured
- Network request failures are reported
- PDF generation errors include error messages
- Chart processing errors are logged with chart IDs

## Future Improvements

### Potential Enhancements

1. **Caching Strategy**
    - Cache rendered PDFs for public dashboards
    - Implement TTL-based invalidation on dashboard changes

2. **Asynchronous Processing**
    - Queue PDF generation for large dashboards
    - Provide generation status and download links

3. **Format Options**
    - Support for different paper sizes (A4, Letter, etc.)
    - Orientation options (portrait/landscape)

4. **Quality Settings**
    - DPI configuration options
    - Compression level controls

5. **Progress Indication**
    - Real-time generation progress for large dashboards
    - Estimated completion times

### Performance Optimizations

1. **Browser Pooling**
    - Reuse browser instances across requests
    - Connection pooling for better resource utilization

2. **Content Optimization**
    - Lazy-load optimization for PDF generation
    - Selective resource loading

3. **Parallel Processing**
    - Generate multiple PDFs concurrently
    - Background processing for non-blocking requests

## Dependencies

### Runtime Dependencies

- `puppeteer-core`: Browser automation
- `@sparticuz/chromium`: Serverless Chromium binary
- `h3`: Nuxt server utilities
- `#supabase/server`: Authentication helpers
- Node.js `crypto`: Context token encryption/decryption

### Development Dependencies

- TypeScript for type safety
- ESLint for code quality

## Security Considerations

### Context Token Security

- **Encryption**: AES-256-GCM symmetric encryption for context tokens
- **Nonce**: Each token includes a unique nonce to prevent replay attacks
- **Token Format**: `'RENDER'|nonce` encrypted and base64url-encoded
- **Validation**: Tokens validated at middleware and API levels
- **Single-Use**: Tokens are generated fresh for each PDF request
- **Key Management**: Cipher key stored in environment variable (`APP_CIPHER_KEY`)

### Access Control

- Strict ownership validation for private dashboards
- Render context bypasses authentication for PDF generation
- Public dashboard access without authentication
- Context tokens allow server-side rendering without user session
- No data exposure in PDF generation process

### Resource Limits

- 30-second timeout for page loading
- Automatic browser cleanup in error scenarios
- Memory usage monitoring through logging

## Testing Strategy

### Unit Testing

- Browser detection logic
- Authentication/authorization logic
- Error handling scenarios

### Integration Testing

- End-to-end PDF generation
- Content accuracy verification
- Performance benchmarking

### Manual Testing

- Visual PDF quality assessment
- Cross-browser compatibility
- Large dashboard handling

## Deployment Notes

### Environment Setup

**Development:**

- Requires local Chrome/Chromium installation
- Windows path detection for common installation locations

**Production:**

- Uses @sparticuz/chromium for Vercel/serverless
- No additional system dependencies required

### Resource Requirements

- **Memory**: 512MB minimum recommended
- **Timeout**: 60-second function timeout for serverless
- **Storage**: Temporary browser profile space

## Troubleshooting

### Common Issues

1. **Chrome Not Found**
    - Install Chrome or set `PUPPETEER_EXECUTABLE_PATH`
    - Check Windows PATH environment variable

2. **PDF Generation Timeout**
    - Increase server timeout settings
    - Check dashboard loading performance
    - Verify network connectivity for external resources

3. **Memory Issues**
    - Monitor browser memory usage
    - Consider browser instance pooling
    - Implement request rate limiting

4. **Content Loading Problems**
    - Verify render page accessibility (`/render/dashboards/{id}`)
    - Check for JavaScript errors in browser console
    - Ensure all required resources load successfully
    - Verify context token is properly generated and passed

5. **Context Token Issues**
    - Ensure `APP_CIPHER_KEY` is set in environment
    - Verify key is exactly 64 hex characters (32 bytes)
    - Check that context parameter is properly URL-encoded
    - Validate middleware is correctly validating tokens

## Implementation Flow

### PDF Generation Request Flow

1. **Client Request**: User requests PDF via `/api/dashboards/{id}/pdf`
2. **Authorization**: Endpoint validates user has access to dashboard
3. **Token Generation**: Generates encrypted render context token
4. **Puppeteer Navigation**: Navigates to `/render/dashboards/{id}?context={token}`
5. **Middleware Validation**: Render middleware validates context token
6. **Page Rendering**: Render page loads and calls `/api/dashboards/{id}/full?context={token}`
7. **API Context Check**: Full API validates context and bypasses auth if valid
8. **Data Loading**: Dashboard data and chart queries execute server-side
9. **PDF Generation**: Puppeteer captures rendered page and generates PDF
10. **Response**: PDF returned to client with appropriate headers

### Security Context Token Lifecycle

1. **Generation**: `generateRenderContext()` creates encrypted token with 'RENDER' context
2. **Transmission**: Token passed as URL query parameter (base64url-encoded)
3. **Validation**: `validateRenderContext()` decrypts and verifies token
4. **Authorization**: Valid tokens grant render access without user authentication
5. **Expiration**: Tokens are single-use and generated per request

This implementation provides a robust, maintainable solution for dashboard PDF generation that leverages the existing frontend rendering while ensuring high-quality, content-aware PDF output with secure server-side rendering capabilities.
