# SSH Tunnel MySQL Connection Test

This script demonstrates how to establish an SSH tunnel and connect to a remote MySQL database through that tunnel.

## Prerequisites

1. **Install Dependencies**
   ```bash
   cd node_scripts
   npm install
   ```

2. **SSH Access**
   - You need SSH access to a server that can reach your MySQL database
   - Either SSH key-based authentication or password authentication

3. **MySQL Database**
   - A MySQL database accessible from the SSH server
   - Valid MySQL credentials

## Configuration

Edit the configuration section in `test-ssh-mysql-connection.js`:

### SSH Configuration
```javascript
const SSH_CONFIG = {
  host: 'your-ssh-server.com',           // Your SSH server hostname/IP
  port: 22,                             // SSH port (usually 22)
  username: 'your-ssh-username',        // Your SSH username
  
  // Option 1: SSH Key Authentication (Recommended)
  privateKey: require('fs').readFileSync('/path/to/your/private/key'),
  
  // Option 2: Password Authentication (Alternative)
  // password: 'your-ssh-password',
  
  // Tunnel configuration
  localPort: 3307,                      // Local port for tunnel (must be free)
  remoteHost: 'your-mysql-server.com',  // MySQL server (as seen from SSH server)
  remotePort: 3306                      // MySQL port (usually 3306)
};
```

### MySQL Configuration
```javascript
const MYSQL_CONFIG = {
  host: '127.0.0.1',                   // localhost (through tunnel)
  port: SSH_CONFIG.localPort,          // Use tunnel's local port
  user: 'your-mysql-username',         // MySQL username
  password: 'your-mysql-password',     // MySQL password
  database: 'your-database-name',      // MySQL database name
};
```

## Usage

### Method 1: Direct Node Execution
```bash
node test-ssh-mysql-connection.js
```

### Method 2: Using NPM Script
```bash
npm run test-ssh-mysql
```

## Authentication Methods

### SSH Key Authentication (Recommended)

1. **Generate SSH Key Pair** (if you don't have one):
   ```bash
   ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
   ```

2. **Copy Public Key to SSH Server**:
   ```bash
   ssh-copy-id username@your-ssh-server.com
   ```

3. **Update Configuration**:
   ```javascript
   privateKey: require('fs').readFileSync('/path/to/your/private/key'),
   // Comment out password line
   ```

### SSH Password Authentication

1. **Update Configuration**:
   ```javascript
   // Comment out privateKey line
   // privateKey: require('fs').readFileSync('/path/to/your/private/key'),
   
   // Uncomment password line
   password: 'your-ssh-password',
   ```

## What the Script Tests

The script performs the following tests:

1. **SSH Connection**: Establishes connection to SSH server
2. **SSH Tunnel**: Creates port forwarding from local port to remote MySQL server
3. **MySQL Connection**: Connects to MySQL through the SSH tunnel
4. **MySQL Queries**: Tests various MySQL operations:
   - Basic connection test
   - MySQL version retrieval
   - Database listing (if permissions allow)
   - Specific database connection test

## Example Output

```
🚀 Starting SSH Tunnel MySQL Connection Test
==================================================
🔗 Establishing SSH tunnel...
✅ SSH connection established
✅ SSH tunnel established: localhost:3307 -> mysql-server.com:3306
🗄️  Connecting to MySQL through SSH tunnel...
✅ MySQL connection established through SSH tunnel
✅ MySQL query test successful: { test: 1, current_time: 2024-01-15T10:30:45.000Z }
🧪 Testing MySQL queries...
  - Testing basic connection...
  - Getting MySQL version...
    MySQL Version: 8.0.35
  - Listing databases...
    Found 12 databases:
      - information_schema
      - mysql
      - performance_schema
      - sys
      - your_database
      ... and 7 more
  - Testing connection to database: your_database
    Successfully connected to database: your_database
✅ All MySQL query tests passed
==================================================
🎉 All tests passed successfully!
🔒 Closing connections...
✅ MySQL connection closed
✅ SSH connection closed
```

## Troubleshooting

### Common Issues

1. **"Port already in use"**
   - Change `localPort` in SSH_CONFIG to a different port (e.g., 3308, 3309)

2. **"SSH connection failed"**
   - Verify SSH server hostname/IP and port
   - Check SSH credentials (username/password or SSH key path)
   - Ensure SSH server is accessible from your machine

3. **"MySQL connection failed"**
   - Verify MySQL server hostname/IP as seen from SSH server
   - Check MySQL credentials and database name
   - Ensure MySQL server is accessible from SSH server

4. **"Permission denied"**
   - For SSH: Check SSH key permissions or password
   - For MySQL: Verify MySQL user has proper permissions

### Debug Mode

To get more detailed error information, you can modify the script to log additional details:

```javascript
// Add this to see more SSH connection details
this.sshClient.on('debug', (info) => {
  console.log('SSH Debug:', info);
});
```

## Security Notes

- **SSH Keys**: More secure than passwords, recommended for production
- **MySQL Credentials**: Never commit real credentials to version control
- **SSL**: Consider enabling SSL for MySQL connections in production
- **Firewall**: Ensure proper firewall rules are in place

## Next Steps

Once this script works with your configuration:

1. **Integration**: Use the patterns in your main Optiqo application
2. **Error Handling**: Adapt the error handling for your specific use cases
3. **Configuration**: Move hardcoded values to environment variables
4. **UI Integration**: Connect to your existing data connections form

## Dependencies

- `mysql2`: MySQL client for Node.js
- `ssh2`: SSH2 client for Node.js
- `fs`: Built-in Node.js file system module
