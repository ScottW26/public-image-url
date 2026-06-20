#!/usr/bin/env node
/* ---------------------------------------------------------------------------
   Shelf local server.
   - Serves the app's static files on http://localhost:8000
   - Proxies email checks to the Reoon Email Verifier so the browser never has
     to (avoids CORS, and your key is sent only to this local process):
        GET /__verify?email=<addr>&key=<reoon_key>   ->  { "emailStatus": "..." }

   Nothing leaves your machine except the Reoon API call itself. Run via
   start.command, or:  node server.js
--------------------------------------------------------------------------- */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;
const ROOT = __dirname;
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' };

// Map a Reoon verdict to the app's status. Adjust here if Reoon's schema changes.
function mapStatus(r) {
  const s = String(r.status || r.result || '').toLowerCase();
  const safe = r.is_safe_to_send === true || r.safe_to_send === true;
  if (safe || s === 'safe' || s === 'valid') return 'verified';
  if (s === 'invalid' || s === 'disposable' || s === 'spamtrap') return 'invalid';
  if (!s) return 'risky';
  return 'risky';
}

function reoon(email, key) {
  return new Promise((resolve) => {
    const url = `https://emailverifier.reoon.com/api/v1/verify?email=${encodeURIComponent(email)}&key=${encodeURIComponent(key)}&mode=power`;
    const rq = https.get(url, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve({ status: 'unknown' }); } });
    });
    rq.on('error', () => resolve({ status: 'unknown' }));
    rq.setTimeout(8000, () => { rq.destroy(); resolve({ status: 'unknown' }); });
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);

  if (u.pathname === '/__verify') {
    const email = u.searchParams.get('email'), key = u.searchParams.get('key');
    res.setHeader('Content-Type', 'application/json');
    if (!email || !key) { res.writeHead(400); return res.end(JSON.stringify({ error: 'email and key required' })); }
    const r = await reoon(email, key);
    return res.end(JSON.stringify({ emailStatus: mapStatus(r) }));
  }

  // static files
  let p = decodeURIComponent(u.pathname);
  if (p === '/' || p === '') p = '/index.html';
  const file = path.join(ROOT, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`▶  Shelf running at http://localhost:${PORT}  (with Reoon verification)`));
