# Debug Configuration System - Implementation Guide

## Overview

The debug configuration system allows developers to automatically populate the integration wizard form with predefined connection settings when `DEBUG_ENV=true` is set in the environment. This system extracts configuration from the working SSH tunnel script and provides a seamless development experience.

## Architecture

### Components

1. **Configuration File**: `config/debug-connection.json` - Contains connection settings
2. **Debug Utilities**: `server/utils/debugConfig.ts` - Server-side configuration loading
3. **API Endpoint**: `server/api/debug/config.get.ts` - Serves configuration to frontend
4. **Frontend Integration**: `pages/integration-wizard.vue` - Auto-fills form when debug mode is enabled
5. **Setup Script**: `node_scripts/setup-debug-config.js` - Initializes debug configuration

### Data Flow

```
Environment Variable (DEBUG_ENV=true)
    ↓
Debug Config Utility (server/utils/debugConfig.ts)
    ↓
API Endpoint (/api/debug/config)
    ↓
Frontend Component (integration-wizard.vue)
    ↓
Auto-filled Form
```

## Configuration Structure

### Debug Configuration File (`config/debug-connection.json`)

```json
{
  "description": "Debug connection configuration for SSH tunnel MySQL connection",
  "version": "1.0.0",
  "connection": {
    "internalName": "Debug SSH Tunnel Connection",
    "databaseName": "datapine",
    "databaseType": "mysql",
    "host": "localhost",
    "username": "dispotronic_usr",
    "password": "mfjuEvc382X",
    "port": "3306",
    "jdbcParams": "",
    "serverTime": "GMT+02:00",
    "useSshTunneling": true,
    "sshAuthMethod": "public-key",
    "sshPort": "22",
    "sshUser": "mysqlconn",
    "sshHost": "instatest.ksf.kiev.ua",
    "sshPassword": "",
    "sshPrivateKey": "-----BEGIN OPENSSH PRIVATE KEY-----\n[YOUR_PRIVATE_KEY_CONTENT_HERE]\n-----END OPENSSH PRIVATE KEY-----",
    "storageLocation": "remote"
  },
  "notes": {
    "sshPrivateKey": "Replace [YOUR_PRIVATE_KEY_CONTENT_HERE] with your actual SSH private key content",
    "host": "localhost refers to the MySQL server as seen from the SSH server perspective",
    "sshHost": "instatest.ksf.kiev.ua is the SSH server that can access the MySQL server",
    "usage": "This configuration will auto-fill the integration wizard form when DEBUG_ENV=true"
  }
}
```

## Implementation Details

### 1. Environment Variable Support

**Environment Variable**: `DEBUG_ENV`
- **Values**: `true` (enabled) or `false`/unset (disabled)
- **Location**: `.env` file
- **Security**: Only available in development mode or when explicitly enabled

### 2. Server-Side Configuration Loading

**File**: `server/utils/debugConfig.ts`

Key functions:
- `loadDebugConfig()`: Loads and validates debug configuration
- `isDebugMode()`: Checks if debug mode is enabled
- `getDebugInfo()`: Returns debug information for API responses

```typescript
export async function loadDebugConfig(): Promise<DebugConnectionConfig['connection'] | null> {
  // Check DEBUG_ENV environment variable
  // Load and parse config/debug-connection.json
  // Validate configuration structure
  // Return connection configuration or null
}
```

### 3. API Endpoint

**Endpoint**: `GET /api/debug/config`

**Response Format**:
```json
{
  "enabled": true,
  "config": {
    "internalName": "Debug SSH Tunnel Connection",
    "databaseName": "datapine",
    // ... other connection fields
  },
  "message": "Debug configuration loaded successfully"
}
```

**Security Features**:
- Only available in development mode
- Requires explicit DEBUG_ENV=true setting
- Returns null config if file doesn't exist

### 4. Frontend Auto-Fill Integration

**File**: `pages/integration-wizard.vue`

**Features**:
- Automatic configuration loading on component mount
- Form auto-fill with debug configuration
- Visual debug mode indicators
- Graceful fallback if debug config unavailable

**Visual Indicators**:
- Debug Mode badge (orange)
- Auto-filled badge (green) when config loaded
- Console logging for debugging

```vue
<div v-if="debugMode" class="flex items-center gap-2">
  <UBadge color="orange" variant="soft" size="sm">
    <Icon name="heroicons:bug-ant" class="w-3 h-3 mr-1" />
    Debug Mode
  </UBadge>
  <UBadge v-if="debugConfigLoaded" color="green" variant="soft" size="sm">
    Auto-filled
  </UBadge>
</div>
```

## Setup Instructions

### 1. Initial Setup

Run the setup script to initialize debug configuration:

```bash
cd node_scripts
node setup-debug-config.js
```

This script will:
- Create `config/debug-connection.json`
- Add `DEBUG_ENV=false` to `.env`
- Create `node_scripts/ssh.key.example`

### 2. Configure SSH Private Key

1. Open `config/debug-connection.json`
2. Replace `[YOUR_PRIVATE_KEY_CONTENT_HERE]` with your actual SSH private key
3. Ensure proper formatting with `\n` for line breaks

### 3. Enable Debug Mode

Set `DEBUG_ENV=true` in your `.env` file:

```env
DEBUG_ENV=true
```

### 4. Test Debug Configuration

1. Start development server: `npm run dev`
2. Navigate to `/integration-wizard`
3. Verify form is auto-filled with debug configuration
4. Check for debug mode badges in the header

## Usage Examples

### Basic Usage

1. **Enable Debug Mode**: Set `DEBUG_ENV=true` in `.env`
2. **Configure Connection**: Update `config/debug-connection.json` with your settings
3. **Load Form**: Navigate to `/integration-wizard` - form auto-fills
4. **Test Connection**: Click "Test Connection" with pre-filled settings

### Development Workflow

```bash
# 1. Enable debug mode
echo "DEBUG_ENV=true" >> .env

# 2. Update SSH private key in config file
# Edit config/debug-connection.json

# 3. Start development server
npm run dev

# 4. Navigate to integration wizard
# Form will be auto-filled with debug configuration
```

### Testing Different Configurations

1. **Modify Config**: Update `config/debug-connection.json`
2. **Refresh Page**: Form will reflect new configuration
3. **Test Changes**: Use "Test Connection" to verify settings

## Security Considerations

### Development Only
- Debug configuration is only available in development mode
- Production builds will not expose debug endpoints
- Environment variable provides additional control

### Sensitive Data Handling
- SSH private keys are stored in configuration files
- Passwords are included in debug configuration
- **Important**: Never commit debug configuration with real credentials to version control

### Best Practices
1. **Use .gitignore**: Add `config/debug-connection.json` to `.gitignore`
2. **Environment Variables**: Use `DEBUG_ENV` to control debug mode
3. **Secure Storage**: Store real credentials securely outside the repository
4. **Regular Cleanup**: Remove debug configuration before production deployment

## File Structure

```
├── config/
│   └── debug-connection.json          # Debug configuration file
├── server/
│   ├── api/
│   │   └── debug/
│   │       └── config.get.ts          # Debug config API endpoint
│   └── utils/
│       └── debugConfig.ts             # Debug configuration utilities
├── pages/
│   └── integration-wizard.vue         # Enhanced with debug auto-fill
├── node_scripts/
│   └── setup-debug-config.js          # Setup script
├── .env                               # Environment variables (DEBUG_ENV)
└── docs/
    └── implementation/
        └── debug-configuration-system.md  # This documentation
```

## Troubleshooting

### Common Issues

1. **Debug Mode Not Working**
   - Check `DEBUG_ENV=true` in `.env` file
   - Verify `config/debug-connection.json` exists
   - Check browser console for error messages

2. **Form Not Auto-Filling**
   - Verify API endpoint `/api/debug/config` returns valid response
   - Check network tab for API call errors
   - Ensure configuration file is valid JSON

3. **SSH Key Issues**
   - Verify SSH private key format in configuration
   - Check for proper line breaks (`\n`) in JSON
   - Ensure key includes BEGIN and END markers

4. **API Endpoint Errors**
   - Check server logs for configuration loading errors
   - Verify file permissions for config directory
   - Ensure DEBUG_ENV is properly set

### Debug Commands

```bash
# Test debug configuration loading
curl http://localhost:3000/api/debug/config

# Check environment variables
echo $DEBUG_ENV

# Validate configuration file
cat config/debug-connection.json | jq .
```

## Integration with Existing Code

The debug configuration system integrates seamlessly with existing functionality:

1. **Form Structure**: Uses existing form fields without modifications
2. **Validation**: Leverages existing form validation logic
3. **API Integration**: Works with existing connection test API
4. **UI Components**: Uses existing UI components and styling
5. **Error Handling**: Maintains existing error handling patterns

## Future Enhancements

### Potential Improvements
1. **Multiple Configurations**: Support for multiple debug configurations
2. **Configuration Management**: UI for managing debug configurations
3. **Environment-Specific Configs**: Different configs for different environments
4. **Configuration Validation**: Enhanced validation for debug configurations
5. **Hot Reloading**: Automatic config reloading without server restart

### Security Enhancements
1. **Configuration Encryption**: Encrypt sensitive data in configuration files
2. **Access Control**: Role-based access to debug configurations
3. **Audit Logging**: Log debug configuration usage
4. **Configuration Rotation**: Automatic rotation of debug credentials

## Conclusion

The debug configuration system provides a robust, secure, and developer-friendly way to streamline the development process by automatically populating connection forms with predefined settings. The system maintains security best practices while providing excellent developer experience through visual indicators, comprehensive error handling, and seamless integration with existing code.

The implementation is ready for immediate use and can be extended with additional features as development needs evolve.
