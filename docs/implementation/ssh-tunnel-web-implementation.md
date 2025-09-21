# SSH Tunnel Web Implementation - Complete Guide

## Overview

This document outlines the complete implementation of SSH tunneling functionality in the Optiqo Dashboard web interface. The implementation allows users to connect to MySQL databases through SSH tunnels using either password or public key authentication.

## Implementation Summary

### ✅ Completed Features

1. **Frontend Form Enhancement**
   - Added SSH private key textarea to integration wizard
   - Updated form validation for SSH key authentication
   - Enhanced UI with proper dark mode support

2. **Backend API Implementation**
   - Implemented SSH tunneling in server API using working script pattern
   - Added support for both password and public key authentication
   - Comprehensive error handling and user-friendly messages

3. **Dependencies and Configuration**
   - Added ssh2 dependency to main project
   - Updated package.json with required dependencies
   - Proper TypeScript integration

## Frontend Changes

### 1. Integration Wizard Form (`pages/integration-wizard.vue`)

#### Added SSH Private Key Field
```vue
<UFormGroup label="SSH Private Key" v-if="form.sshAuthMethod === 'public-key'" class="text-gray-900 dark:text-white">
  <UTextarea 
    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAFwAAAAdzc2gtcn
NhAAAAAwEAAQAAAQEA1234567890abcdef...
-----END OPENSSH PRIVATE KEY-----"
    v-model="form.sshPrivateKey"
    :rows="8"
    class="font-mono text-xs"
  />
  <template #help>
    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
      Paste your SSH private key here. Make sure to include the BEGIN and END lines.
    </p>
  </template>
</UFormGroup>
```

#### Enhanced Form Data Structure
```javascript
const form = ref({
  // ... existing fields
  sshPrivateKey: '', // New field for SSH private key
  // ... other fields
})
```

#### Updated Validation
```javascript
// SSH private key validation
if (form.value.sshAuthMethod === 'public-key' && !form.value.sshPrivateKey.trim()) {
  validationErrors.value.push('SSH private key is required when using public key authentication')
}

// Basic SSH private key format validation
if (form.value.sshAuthMethod === 'public-key' && form.value.sshPrivateKey.trim()) {
  const keyContent = form.value.sshPrivateKey.trim()
  if (!keyContent.includes('BEGIN') || !keyContent.includes('END')) {
    validationErrors.value.push('SSH private key must include BEGIN and END markers')
  }
}
```

#### Enhanced API Request
```javascript
sshConfig: form.value.useSshTunneling ? {
  port: form.value.sshPort,
  user: form.value.sshUser,
  host: form.value.sshHost,
  password: form.value.sshPassword,
  privateKey: form.value.sshPrivateKey, // Include private key
  authMethod: form.value.sshAuthMethod
} : {}
```

## Backend Changes

### 1. Server API Enhancement (`server/api/connections/test.post.ts`)

#### Added SSH2 Import
```typescript
import mysql from 'mysql2/promise'
import { Client } from 'ssh2'
```

#### SSH Tunnel Implementation
```typescript
// Handle SSH tunneling
if (useSshTunneling) {
  return await testConnectionWithSSHTunnel(body)
}
```

#### Complete SSH Tunnel Function
The implementation includes:
- SSH connection establishment
- Port forwarding through SSH tunnel
- MySQL connection through tunnel
- Comprehensive error handling
- Proper resource cleanup

Key features:
- **Authentication Methods**: Supports both password and public key authentication
- **Error Handling**: User-friendly error messages for common SSH and MySQL issues
- **Resource Management**: Proper cleanup of SSH and MySQL connections
- **Validation**: Comprehensive input validation for SSH configuration

## Usage Instructions

### 1. Enable SSH Tunneling
1. Navigate to `/integration-wizard`
2. Toggle "Use SSH Tunneling" to enabled
3. Select authentication method (Password or Public Key)

### 2. Configure SSH Connection
- **SSH Host**: The SSH server hostname or IP address
- **SSH Port**: SSH server port (usually 22)
- **SSH User**: SSH username for authentication

### 3. Authentication Setup

#### Option A: Password Authentication
1. Select "Password" as authentication method
2. Enter SSH password in the password field

#### Option B: Public Key Authentication (Recommended)
1. Select "Public Key" as authentication method
2. Paste your SSH private key in the textarea
3. Ensure the key includes BEGIN and END markers

### 4. Database Configuration
- **Host**: MySQL server hostname (as seen from SSH server perspective)
- **Port**: MySQL server port (usually 3306)
- **Username/Password**: MySQL credentials
- **Database**: MySQL database name

### 5. Test Connection
Click "Test Connection" to verify the SSH tunnel and MySQL connection.

## Error Handling

### SSH Connection Errors
- **Authentication Failed**: Check SSH credentials or private key
- **Connection Refused**: Verify SSH host and port
- **Host Not Found**: Check SSH host address

### MySQL Connection Errors
- **Access Denied**: Verify MySQL username and password
- **Database Not Found**: Check database name
- **Connection Timeout**: Verify MySQL server accessibility from SSH server

### Tunnel Errors
- **Tunnel Failed**: SSH server may not allow port forwarding
- **Port Conflicts**: SSH server may have port restrictions

## Security Considerations

### SSH Key Management
- **Private Key Storage**: Keys are temporarily stored in memory during connection test
- **Key Format**: Supports OpenSSH private key format
- **Key Validation**: Basic format validation (BEGIN/END markers)

### Authentication Security
- **Password Authentication**: Less secure, not recommended for production
- **Public Key Authentication**: More secure, recommended approach
- **Connection Encryption**: All connections are encrypted through SSH tunnel

### Best Practices
1. Use public key authentication instead of passwords
2. Store SSH keys securely on client side
3. Regularly rotate SSH keys
4. Use strong passphrases for SSH keys
5. Limit SSH access to necessary users only

## Testing

### Manual Testing
1. Start Nuxt development server: `npm run dev`
2. Navigate to `/integration-wizard`
3. Configure SSH tunnel settings
4. Test connection with "Test Connection" button

### API Testing
Use the test script in `node_scripts/test-ssh-api.js` to test the API endpoint directly.

## Dependencies

### Required Packages
- `ssh2`: SSH2 client for Node.js with tunneling capabilities
- `mysql2`: MySQL client with Promise support (already installed)

### Installation
```bash
npm install ssh2
```

## File Structure

```
├── pages/
│   └── integration-wizard.vue          # Enhanced with SSH key textarea
├── server/
│   └── api/
│       └── connections/
│           └── test.post.ts            # Enhanced with SSH tunnel support
├── node_scripts/
│   └── test-ssh-api.js                 # API testing script
└── docs/
    └── implementation/
        └── ssh-tunnel-web-implementation.md  # This documentation
```

## Integration with Existing Code

The SSH tunnel implementation seamlessly integrates with the existing data connections architecture:

1. **Form Structure**: Extends existing form without breaking changes
2. **Validation**: Builds upon existing validation patterns
3. **Error Handling**: Uses established error handling patterns
4. **API Design**: Follows existing API structure and response format
5. **UI/UX**: Maintains consistency with existing design patterns

## Future Enhancements

### Potential Improvements
1. **SSH Key Management**: Add UI for managing multiple SSH keys
2. **Connection Persistence**: Save successful SSH tunnel configurations
3. **Advanced SSH Options**: Support for SSH config file options
4. **Multiple Database Support**: Extend SSH tunneling to other database types
5. **Connection Monitoring**: Health checks for SSH tunnel connections

### Security Enhancements
1. **SSH Key Encryption**: Encrypt SSH keys before storage
2. **Audit Logging**: Log SSH tunnel connections for security monitoring
3. **Access Control**: Role-based access to SSH tunnel features
4. **Session Management**: Proper SSH session lifecycle management

## Troubleshooting

### Common Issues

1. **SSH Key Format Issues**
   - Ensure private key includes BEGIN and END markers
   - Verify key is in OpenSSH format
   - Check for line break issues when copying keys

2. **Connection Timeouts**
   - Verify SSH server is accessible
   - Check firewall rules
   - Confirm SSH port is correct

3. **Authentication Failures**
   - Verify SSH username and credentials
   - Check if public key is properly installed on SSH server
   - Confirm SSH server allows key-based authentication

4. **MySQL Connection Issues**
   - Verify MySQL server is accessible from SSH server
   - Check MySQL user permissions
   - Confirm database name is correct

### Debug Mode
Enable debug logging by adding SSH debug event handlers in the server API for detailed troubleshooting.

## Conclusion

The SSH tunnel implementation provides a complete, production-ready solution for secure database connections through SSH tunnels. The implementation follows established patterns, maintains security best practices, and provides excellent user experience through comprehensive error handling and validation.

The solution is ready for immediate use and can be extended with additional features as needed.
