// Standalone Yjs websocket server for Poligon
const { setupWSConnection } = require('y-websocket/bin/utils');
const WebSocket = require('ws');
const http = require('http');

const port = process.env.PORT || 1234;
const server = http.createServer();

const wss = new WebSocket.Server({ server });
wss.on('connection', (ws, req) => {
  setupWSConnection(ws, req, { gc: true });
});

server.listen(port, () => {
  console.log(`[YjsWS] Standalone y-websocket server running on port ${port}`);
});
