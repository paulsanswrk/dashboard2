// test-ssh-mysql.js
import { Client } from 'ssh2';
import mysql from 'mysql2/promise';
import fs from 'fs';

const sshConfig = {
    host: 'instatest.ksf.kiev.ua',
    port: 22,
    username: 'mysqlconn',
    privateKey: fs.readFileSync('./ssh.key'), // path to your private key
};

const dbConfig = {
    user: 'dispotronic_usr',
    password: 'mfjuEvc382X',   // <-- put real MySQL password here
    database: 'datapine',
};

async function main() {
    const ssh = new Client();

    ssh.on('ready', () => {
        console.log('✅ SSH Connection ready');

        ssh.forwardOut(
            'localhost', // source addr
            3307,       // source port (arbitrary)
            'localhost', // remote DB host (from SSH server’s POV)
            3306,        // remote DB port
            async (err, stream) => {
                if (err) {
                    console.error('❌ SSH forwardOut error:', err);
                    ssh.end();
                    return;
                }

                try {
                    const connection = await mysql.createConnection({
                        ...dbConfig,
                        stream, // tell mysql2 to use the SSH tunnel stream
                    });

                    const [rows] = await connection.query('SELECT NOW() AS now');
                    console.log('✅ MySQL response:', rows);

                    await connection.end();
                } catch (dbErr) {
                    console.error('❌ MySQL connection failed:', dbErr);
                } finally {
                    ssh.end();
                }
            }
        );
    });

    ssh.on('error', (err) => {
        console.error('❌ SSH connection error:', err);
    });

    ssh.connect(sshConfig);
}

main();
