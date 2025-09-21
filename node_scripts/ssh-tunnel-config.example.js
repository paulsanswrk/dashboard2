/**
 * SSH Tunnel Configuration Example
 * 
 * Copy this file to ssh-tunnel-config.js and update with your actual values.
 * Then import this configuration in test-ssh-mysql-connection.js
 */

// Example SSH Configuration
const SSH_CONFIG = {
  // SSH Server Details
  host: 'ssh.example.com',              // Your SSH server hostname or IP
  port: 22,                            // SSH server port (usually 22)
  username: 'your-username',           // Your SSH username
  
  // Authentication Method 1: SSH Key (Recommended)
  // privateKey: (await import('fs')).readFileSync('/home/user/.ssh/id_rsa'),
  
  // Authentication Method 2: Password (Alternative - comment out privateKey above)
  // password: 'your-ssh-password',
  
  // SSH Tunnel Configuration
  localPort: 3307,                     // Local port for the tunnel (must be free)
  remoteHost: 'mysql.internal.com',    // MySQL server hostname/IP (as seen from SSH server)
  remotePort: 3306                     // MySQL server port (usually 3306)
};

// Example MySQL Configuration
const MYSQL_CONFIG = {
  host: '127.0.0.1',                  // Always localhost when using tunnel
  port: SSH_CONFIG.localPort,         // Use the same local port as SSH tunnel
  user: 'mysql_user',                 // MySQL username
  password: 'mysql_password',         // MySQL password
  database: 'your_database',          // MySQL database name
  
  // Connection Options
  connectTimeout: 10000,              // 10 seconds timeout
  acquireTimeout: 10000,
  timeout: 10000,
  
  // SSL Configuration (uncomment if needed)
  // ssl: {
  //   rejectUnauthorized: false      // Only for development/testing
  // }
};

// Example configurations for different scenarios
const EXAMPLE_CONFIGS = {
  // Scenario 1: Local development with remote database
  development: {
    ssh: {
      host: 'dev-server.company.com',
      port: 22,
      username: 'developer',
      // privateKey: (await import('fs')).readFileSync('/home/dev/.ssh/dev_key'),
      localPort: 3307,
      remoteHost: 'mysql-dev.internal',
      remotePort: 3306
    },
    mysql: {
      host: '127.0.0.1',
      port: 3307,
      user: 'dev_user',
      password: 'dev_password',
      database: 'development_db'
    }
  },
  
  // Scenario 2: Production database access
  production: {
    ssh: {
      host: 'bastion.company.com',
      port: 2222,
      username: 'prod_user',
      // privateKey: (await import('fs')).readFileSync('/home/user/.ssh/prod_key'),
      localPort: 3308,
      remoteHost: 'mysql-prod.internal',
      remotePort: 3306
    },
    mysql: {
      host: '127.0.0.1',
      port: 3308,
      user: 'prod_mysql_user',
      password: 'secure_prod_password',
      database: 'production_db',
      ssl: {
        rejectUnauthorized: true
      }
    }
  },
  
  // Scenario 3: AWS RDS through EC2 bastion
  aws: {
    ssh: {
      host: 'ec2-user@bastion.aws.com',
      port: 22,
      username: 'ec2-user',
      // privateKey: (await import('fs')).readFileSync('/home/user/.ssh/aws-key.pem'),
      localPort: 3309,
      remoteHost: 'rds-instance.region.rds.amazonaws.com',
      remotePort: 3306
    },
    mysql: {
      host: '127.0.0.1',
      port: 3309,
      user: 'rds_user',
      password: 'rds_password',
      database: 'application_db'
    }
  }
};

export {
  SSH_CONFIG,
  MYSQL_CONFIG,
  EXAMPLE_CONFIGS
};
