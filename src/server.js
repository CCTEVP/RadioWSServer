import { WebSocketServer } from 'ws';
import http from 'http';

const PORT = process.env.PORT || 8080;

// Basic HTTP server (optional for health check / upgrade flexibility)
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

// Utility to send JSON safely
function sendJson(ws, obj) {
  try {
    ws.send(JSON.stringify(obj));
  } catch (err) {
    console.error('Failed to send JSON', err);
  }
}

wss.on('connection', (ws, req) => {
  const clientAddress = req.socket.remoteAddress + ':' + req.socket.remotePort;
  console.log('Client connected', clientAddress);

  // Send a welcome message
  sendJson(ws, { type: 'welcome', message: 'Connected to broadcast server', time: Date.now() });

  ws.on('message', (data, isBinary) => {
    // Accept text or binary but expect JSON when text
    if (isBinary) {
      console.warn('Binary message received; ignoring broadcast.');
      return;
    }

    let payload;
    try {
      payload = JSON.parse(data.toString());
    } catch (err) {
      sendJson(ws, { type: 'error', error: 'Invalid JSON payload' });
      return;
    }

    // Basic validation (ensure object)
    if (typeof payload !== 'object' || payload === null) {
      sendJson(ws, { type: 'error', error: 'Payload must be a JSON object' });
      return;
    }

    const enriched = {
      type: 'broadcast',
      from: clientAddress,
      receivedAt: Date.now(),
      data: payload
    };

    // Broadcast to all other connected clients
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === client.OPEN) {
        sendJson(client, enriched);
      }
    });
  });

  ws.on('close', (code, reason) => {
    console.log('Client disconnected', clientAddress, 'code=', code, 'reason=', reason.toString());
  });

  ws.on('error', (err) => {
    console.error('WebSocket error from', clientAddress, err);
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket broadcast server running on ws://localhost:${PORT}`);
  console.log('Health check: http://localhost:' + PORT + '/health');
});
