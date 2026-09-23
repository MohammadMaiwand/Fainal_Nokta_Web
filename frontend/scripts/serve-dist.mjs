import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const port = Number(process.env.FRONTEND_PORT || 4173);
const host = process.env.FRONTEND_HOST || '127.0.0.1';
const backendPort = Number(process.env.BACKEND_PORT || process.env.API_PORT || 8081);
const backendHost = process.env.BACKEND_HOST || '127.0.0.1';

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf']
]);

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': contentTypes.get(ext) || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

function proxyToBackend(req, res) {
  const target = `http://${backendHost}:${backendPort}${req.url || '/'}`;
  const headers = { ...req.headers, host: `${backendHost}:${backendPort}` };
  delete headers['accept-encoding'];

  const proxyReq = http.request(
    target,
    {
      method: req.method,
      headers
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ success: false, message: 'Local API is not reachable. Start the backend.' }));
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url || '/', `http://${host}:${port}`).pathname);

  // Same-origin proxy so offline builds do not depend on CORS or public internet.
  if (urlPath === '/api' || urlPath.startsWith('/api/') || urlPath === '/health' || urlPath.startsWith('/uploads/')) {
    proxyToBackend(req, res);
    return;
  }

  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const requestedPath = path.join(distDir, safePath);
  const filePath = fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()
    ? requestedPath
    : path.join(distDir, 'index.html');

  if (!filePath.startsWith(distDir) || !fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  sendFile(res, filePath);
});

server.listen(port, host, () => {
  console.log(`Nokta frontend running at http://${host}:${port}/`);
  console.log(`Proxying /api /uploads /health → http://${backendHost}:${backendPort}`);
});
