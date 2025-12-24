const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const sslDir = path.join(__dirname, 'ssl');
if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir, { recursive: true });
}

try {
    //  openssl availability
    execSync('openssl version', { stdio: 'pipe' });

    const platform = os.platform();
    let command;

    if (platform === 'win32') {
        // Windows
        command = 'openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=RU/ST=Kyiv/L=Kyiv/O=Company/OU=IT/CN=localhost"';
    } else {
        // Linux/Mac
        command = 'openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=RU/ST=Kyiv/L=Kyiv/O=Company/OU=IT/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"';
    }

    execSync(command, { stdio: 'inherit' });
    console.log('SSL certificates generated successfully');

} catch (error) {
    console.warn('OpenSSL not found or failed. Generating certificates using Node.js...');

    // Reserve Node.js
    const selfsigned = require('selfsigned');
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const options = {
        days: 365,
        keySize: 4096,
        algorithm: 'sha256',
    };

    const pems = selfsigned.generate(attrs, options);
    fs.writeFileSync(path.join(sslDir, 'key.pem'), pems.private);
    fs.writeFileSync(path.join(sslDir, 'cert.pem'), pems.cert);
    console.log('SSL certificates generated using Node.js');
}

console.log('Certificate files:');
console.log('  ssl/key.pem');
console.log('  ssl/cert.pem');
console.log('\nNote: For production, use real SSL certificates from Let\'s Encrypt or other CA.');