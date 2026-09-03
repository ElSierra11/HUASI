const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'Auth',       dir: 'services/auth' },
  { name: 'Hosts',      dir: 'services/hosts' },
  { name: 'Bookings',   dir: 'services/bookings' },
  { name: 'Chat',       dir: 'services/chat' },
  { name: 'Gateway',    dir: 'services/gateway' },
];

console.log('\n🚀 Iniciando Backend HUASI en Render...\n');

services.forEach(({ name, dir }) => {
  const cwd = path.join(__dirname, dir);
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'npm.cmd' : 'npm';
  const child = spawn(cmd, ['start'], { cwd, shell: true });

  child.stdout.on('data', (data) => {
    console.log(`[${name}] ${data.toString().trim()}`);
  });

  child.stderr.on('data', (data) => {
    console.error(`[${name} ERR] ${data.toString().trim()}`);
  });

  child.on('error', (err) => {
    console.error(`[${name}] ❌ Error al iniciar: ${err.message}`);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo backend...');
  process.exit(0);
});
