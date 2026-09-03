const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'Gateway',    dir: 'services/gateway',    color: '\x1b[36m' }, // Cyan
  { name: 'Auth',       dir: 'services/auth',       color: '\x1b[33m' }, // Yellow
  { name: 'Hosts',      dir: 'services/hosts',      color: '\x1b[35m' }, // Magenta
  { name: 'Bookings',   dir: 'services/bookings',   color: '\x1b[32m' }, // Green
  { name: 'Chat',       dir: 'services/chat',       color: '\x1b[96m' }, // Light Cyan
  { name: 'Frontend',   dir: 'frontend',            color: '\x1b[34m' }, // Blue
  { name: 'Admin',      dir: 'admin-panel',         color: '\x1b[91m' }, // Light Red
];

const reset = '\x1b[0m';

console.log('\n🚀 Starting StayU Microservices...\n');
console.log('─'.repeat(50));

services.forEach(({ name, dir, color }) => {
  const cwd = path.join(__dirname, dir);
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'npm.cmd' : 'npm';
  const child = spawn(cmd, ['run', 'dev'], { cwd, shell: true });

  const prefix = `${color}[${name.padEnd(10)}]${reset}`;

  child.stdout.on('data', (data) => {
    data.toString().split('\n').filter(Boolean).forEach(line => {
      console.log(`${prefix} ${line}`);
    });
  });

  child.stderr.on('data', (data) => {
    data.toString().split('\n').filter(Boolean).forEach(line => {
      console.log(`${prefix} ${line}`);
    });
  });

  child.on('error', (err) => {
    console.error(`${prefix} ❌ Failed to start: ${err.message}`);
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.log(`${prefix} ⚠️  Exited with code ${code}`);
    }
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down all services...');
  process.exit(0);
});
