/**
 * AIS WebSocket Relay Server for Azure Container Apps
 * Proxies aisstream.io data to browsers via WebSocket
 */

const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

const AISSTREAM_URL = 'wss://stream.aisstream.io/v0/stream';
const API_KEY = process.env.AISSTREAM_API_KEY;
const PORT = process.env.PORT || 8080;

if (!API_KEY) {
  console.error('[Relay] Error: AISSTREAM_API_KEY environment variable not set');
  process.exit(1);
}

let upstreamSocket = null;
let clients = new Set();
let messageCount = 0;
let lastMessageTime = Date.now();

// HTTP server for health checks
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Upgrade, Connection');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      clients: clients.size,
      messages: messageCount,
      connected: upstreamSocket?.readyState === WebSocket.OPEN,
      lastMessage: new Date(lastMessageTime).toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

function connectUpstream() {
  if (upstreamSocket?.readyState === WebSocket.OPEN) return;

  console.log('[Relay] Connecting to aisstream.io...');
  upstreamSocket = new WebSocket(AISSTREAM_URL);

  upstreamSocket.on('open', () => {
    console.log('[Relay] Connected to aisstream.io');
    // Subscribe to position reports worldwide
    upstreamSocket.send(JSON.stringify({
      APIKey: API_KEY,
      BoundingBoxes: [[[-90, -180], [90, 180]]],
      FilterMessageTypes: ['PositionReport'],
    }));
  });

  upstreamSocket.on('message', (data) => {
    messageCount++;
    lastMessageTime = Date.now();
    
    if (messageCount % 1000 === 0) {
      console.log(`[Relay] ${messageCount} messages, ${clients.size} clients`);
    }
    
    const message = data.toString();
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  });

  upstreamSocket.on('close', () => {
    console.log('[Relay] Disconnected from upstream, reconnecting in 5s...');
    upstreamSocket = null;
    setTimeout(connectUpstream, 5000);
  });

  upstreamSocket.on('error', (err) => {
    console.error('[Relay] Upstream error:', err.message);
  });
}

// WebSocket server for browser clients
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`[Relay] Client connected from ${clientIp}`);
  clients.add(ws);
  
  // Connect to upstream if not already connected
  connectUpstream();

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[Relay] Client disconnected, ${clients.size} remaining`);
  });

  ws.on('error', (err) => {
    console.error('[Relay] Client error:', err.message);
    clients.delete(ws);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Relay] AIS WebSocket relay listening on port ${PORT}`);
  console.log(`[Relay] Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Relay] Shutting down...');
  wss.close();
  server.close();
  if (upstreamSocket) upstreamSocket.close();
  process.exit(0);
});
