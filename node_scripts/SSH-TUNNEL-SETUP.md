# SSH Tunnel MySQL Connection Setup

## Overview

This directory contains a complete SSH tunnel MySQL connection testing solution for the Optiqo Dashboard project. The implementation includes:

- **Main Test Script**: `test-ssh-mysql-connection.js` - Comprehensive SSH tunnel and MySQL connection testing
- **Dependency Test**: `test-dependencies.js` - Verifies all required packages are installed
- **Configuration Examples**: `ssh-tunnel-config.example.js` - Sample configurations for different scenarios
- **Documentation**: `README-ssh-tunnel.md` - Detailed usage instructions

## Quick Start

### 1. Install Dependencies
```bash
cd node_scripts
npm install
```

### 2. Test Dependencies
```bash
npm run test-deps
# or
node test-dependencies.js
```

### 3. Configure SSH Tunnel Test
Edit `test-ssh-mysql-connection.js` and update the configuration section:

```javascript
const SSH_CONFIG = {
  host: 'your-ssh-server.com',           // Your SSH server
  port: 22,                             // SSH port
  username: 'your-username',            // SSH username
  privateKey: (await import('fs')).readFileSync('/path/to/your/key'), // SSH key
  localPort: 3307,                      // Local tunnel port
  remoteHost: 'mysql-server.com',       // MySQL server (from SSH server perspective)
  remotePort: 3306                      // MySQL port
};

const MYSQL_CONFIG = {
  host: '127.0.0.1',                   // localhost (through tunnel)
  port: SSH_CONFIG.localPort,          // Use tunnel port
  user: 'mysql-user',                  // MySQL username
  password: 'mysql-password',          // MySQL password
  database: 'your-database'            // MySQL database
};
```

### 4. Run SSH Tunnel Test
```bash
npm run test-ssh-mysql
# or
node test-ssh-mysql-connection.js
```

## What Gets Tested

The script performs comprehensive testing:

1. **SSH Connection**: Establishes connection to SSH server
2. **SSH Tunnel**: Creates port forwarding from local port to remote MySQL
3. **MySQL Connection**: Connects to MySQL through the tunnel
4. **MySQL Operations**: Tests various queries and operations
5. **Resource Cleanup**: Properly closes all connections

## Authentication Methods

### SSH Key Authentication (Recommended)
```javascript
privateKey: (await import('fs')).readFileSync('/path/to/your/private/key')
```

### SSH Password Authentication
```javascript
password: 'your-ssh-password'
```

## Available Scripts

- `npm run test-deps` - Test that all dependencies are installed
- `npm run test-ssh-mysql` - Run the SSH tunnel MySQL connection test
- `npm run test-email` - Test SendGrid email functionality
- `npm run test-invitations` - Test invitation email functionality

## Dependencies

- **mysql2**: MySQL client for Node.js with Promise support
- **ssh2**: SSH2 client for Node.js with tunneling capabilities
- **@sendgrid/mail**: Email service integration
- **dotenv**: Environment variable management

## File Structure

```
node_scripts/
├── test-ssh-mysql-connection.js    # Main SSH tunnel test script
├── test-dependencies.js            # Dependency verification
├── ssh-tunnel-config.example.js    # Configuration examples
├── README-ssh-tunnel.md            # Detailed documentation
├── SSH-TUNNEL-SETUP.md             # This quick start guide
├── package.json                    # Dependencies and scripts
└── ... (other existing scripts)
```

## Integration with Optiqo Dashboard

This SSH tunnel implementation can be integrated into the main Optiqo application by:

1. **Server Route**: Create `/server/api/connections/test-ssh` endpoint
2. **Frontend Form**: Extend existing connection form with SSH tunnel options
3. **Error Handling**: Adapt error messages for the UI
4. **Configuration**: Move hardcoded values to environment variables

## Security Considerations

- Use SSH key authentication instead of passwords when possible
- Store SSH keys securely with proper file permissions (600)
- Consider using SSH agent for key management
- Enable MySQL SSL connections in production
- Validate and sanitize all user inputs

## Troubleshooting

### Common Issues

1. **Port already in use**: Change `localPort` to an available port
2. **SSH connection failed**: Verify SSH server details and credentials
3. **MySQL connection failed**: Check MySQL server accessibility from SSH server
4. **Permission denied**: Verify SSH key permissions and MySQL user permissions

### Debug Mode

Add debug logging to see detailed SSH connection information:

```javascript
sshClient.on('debug', (info) => {
  console.log('SSH Debug:', info);
});
```

## Next Steps

1. Test with your actual SSH and MySQL servers
2. Integrate patterns into main Optiqo application
3. Add support for additional database types
4. Implement connection persistence and management
5. Add SSH key management UI

## Support

For issues or questions:
1. Check the detailed documentation in `README-ssh-tunnel.md`
2. Verify all dependencies are installed with `npm run test-deps`
3. Test with the example configurations in `ssh-tunnel-config.example.js`
4. Review error messages and troubleshoot common issues
