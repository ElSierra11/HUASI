import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = parseInt(process.env.PORT, 10) || 8080;

const BACKEND_URL = process.env.BACKEND_URL || 'https://huasi.onrender.com';
const backendTarget = new URL(BACKEND_URL);

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // 1. Redirigir y hacer proxy de llamadas /api, /chat-socket y /socket.io al backend de Render
  if (urlPath.startsWith('/api') || urlPath.startsWith('/chat-socket') || urlPath.startsWith('/socket.io')) {
    const isHttps = backendTarget.protocol === 'https:';
    const client = isHttps ? https : http;

    const proxyHeaders = { ...req.headers };
    proxyHeaders.host = backendTarget.hostname;
    // Evitar problemas de compresión en el streaming del proxy si es necesario
    delete proxyHeaders['accept-encoding'];

    const proxyReq = client.request({
      protocol: backendTarget.protocol,
      hostname: backendTarget.hostname,
      port: backendTarget.port || (isHttps ? 443 : 80),
      method: req.method,
      path: req.url,
      headers: proxyHeaders,
      timeout: 60000 // 60s timeout para soportar cold-starts en Render
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'El servidor HUASI se está iniciando. Por favor, reintenta en unos segundos.' }));
      }
    });

    proxyReq.on('error', (err) => {
      console.error('[Proxy Error]:', err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Error de comunicación con el backend HUASI.' }));
      }
    });

    // Evitar fugas si el cliente cierra la pestaña o cancela
    req.on('aborted', () => proxyReq.destroy());
    res.on('close', () => {
      if (!res.writableEnded) proxyReq.destroy();
    });

    req.pipe(proxyReq);
    return;
  }

  // 2. Servir archivos estáticos
  const safeSuffix = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(DIST_DIR, safeSuffix);

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    } else if (path.extname(safeSuffix) && path.extname(safeSuffix) !== '.html') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } else {
      // 3. Fallback SPA: siempre devuelve index.html para rutas de React Router
      const indexPath = path.join(DIST_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error cargando aplicación HUASI');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
          res.end(content);
        }
      });
    }
  });
});

// Proxy para conexiones WebSocket (chat)
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/chat-socket') || req.url.startsWith('/socket.io')) {
    const isHttps = backendTarget.protocol === 'https:';
    const proxyHeaders = { ...req.headers };
    proxyHeaders.host = backendTarget.hostname;

    const proxyReq = (isHttps ? https : http).request({
      protocol: backendTarget.protocol,
      hostname: backendTarget.hostname,
      port: backendTarget.port || (isHttps ? 443 : 80),
      method: 'GET',
      path: req.url,
      headers: proxyHeaders,
    });

    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      socket.write(`HTTP/${proxyRes.httpVersion} ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n`);
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (Array.isArray(value)) {
          for (const v of value) socket.write(`${key}: ${v}\r\n`);
        } else {
          socket.write(`${key}: ${value}\r\n`);
        }
      }
      socket.write('\r\n');
      if (proxyHead && proxyHead.length) socket.write(proxyHead);
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
    });

    proxyReq.on('error', (err) => {
      console.error('[WS Proxy Error]:', err.message);
      socket.destroy();
    });

    proxyReq.end();
  } else {
    socket.destroy();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Servidor Frontend activo en 0.0.0.0:${PORT}`);
  console.log(`🔗 Proxy configurado hacia backend: ${BACKEND_URL}`);
});
