// Simple LiveKit JWT service implementing MSC4143 /sfu/get endpoint
// Validates Matrix access tokens and returns LiveKit JWTs

const http = require('http');
const https = require('https');
const { AccessToken } = require('livekit-server-sdk');

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL; // wss://livekit.tokenchat.dev
const MATRIX_HOMESERVER_URL = process.env.MATRIX_HOMESERVER_URL;

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL || !MATRIX_HOMESERVER_URL) {
  console.error('Missing required env vars');
  process.exit(1);
}

// Validate a Matrix access token and return the user ID
async function validateMatrixToken(token) {
  return new Promise((resolve, reject) => {
    const url = new URL('/_matrix/client/v3/account/whoami', MATRIX_HOMESERVER_URL);
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    };
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(data).user_id); }
          catch { reject(new Error('Invalid JSON from whoami')); }
        } else {
          reject(new Error(`Auth failed: ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  if (req.method !== 'POST' || req.url !== '/sfu/get') {
    res.writeHead(404); res.end('Not found'); return;
  }

  try {
    // Get Matrix token from Authorization header
    const auth = req.headers['authorization'] || '';
    const matrixToken = auth.replace(/^Bearer\s+/i, '');
    if (!matrixToken) {
      res.writeHead(401); res.end(JSON.stringify({ error: 'Missing token' })); return;
    }

    // Validate Matrix token
    const userId = await validateMatrixToken(matrixToken);

    // Parse request body for room info
    let body = '';
    for await (const chunk of req) body += chunk;
    const { room } = JSON.parse(body || '{}');
    const roomName = room || 'default';

    // Generate LiveKit JWT
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: userId,
      ttl: '4h',
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });
    const jwt = await at.toJwt();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ url: LIVEKIT_URL, jwt }));
  } catch (err) {
    console.error('Error:', err.message);
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(8080, () => {
  console.log(`LiveKit JWT service listening on :8080`);
  console.log(`LiveKit URL: ${LIVEKIT_URL}`);
});
