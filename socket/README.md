# Poligon Socket (Standalone Yjs WebSocket Server)

This project runs a standalone y-websocket server for Yjs collaborative editing, intended to be deployed as a separate service (e.g. on port 1234) alongside your main backend/frontend.

## Usage

1. Install dependencies:
   ```
   npm install
   ```
2. Start the websocket server (default port 1234):
   ```
   npm start
   ```
   Or specify a custom port:
   ```
   npx y-websocket-server --port 5678
   ```

## Deployment
- Deploy this folder as a separate Node.js project (e.g. via aaPanel or systemd).
- Optionally, use nginx to reverse proxy /yjs to this port for HTTPS and path-based routing.

## Notes
- No custom backend logic or logging is included—this is a pure y-websocket server.
- For advanced features (auth, logging), fork y-websocket or use a custom wrapper.
