import * as Y from 'yjs';
import { WebSocket, WebSocketServer } from 'ws';
import * as http from 'http';
import { YjsService } from '../services/yjs.service';
// We'll require y-websocket utils at runtime to avoid TypeScript import resolution
// issues during compilation; the runtime package is present in package.json.

/**
 * Yjs WebSocket Server for real-time collaborative editing
 * Manages document synchronization and persistence
 */

// Store active Y.Doc instances per document
const docs: Map<number, Y.Doc> = new Map();

// Store WebSocket connections per document
const connections: Map<number, Set<WebSocket>> = new Map();

// Debounce timers for saving state
const saveTimers: Map<number, NodeJS.Timeout> = new Map();

/**
 * Initialize WebSocket server for Yjs
 */
export function setupYjsWebSocketServer(server: http.Server) {
  // Use the standard y-websocket setup to ensure protocol compatibility
  const wss = new WebSocketServer({
    server,
    path: '/yjs',
    perMessageDeflate: false,
    maxPayload: 10 * 1024 * 1024 // 10MB
  });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    try {
      // Dynamically require the y-websocket setup function to avoid
      // TypeScript compile-time resolution issues.
      const utils = require('y-websocket/bin/utils');
      const setup = utils && (utils.setupWSConnection || utils.default && utils.default.setupWSConnection);
      if (!setup) throw new Error('setupWSConnection not found in y-websocket/bin/utils');
      // Delegate to the standard implementation which handles sync/awareness
      // using the document name derived from req.url (e.g. /yjs/<docName>).
      setup(ws, req, { gc: true });
    } catch (err) {
      console.error('[YjsWS] setupWSConnection error:', err);
      try { ws.close(); } catch (e) {}
    }
  });

  console.log('[YjsWS] y-websocket server initialized on /yjs');
  return wss;
}

/**
 * Handle document updates - save to database with debouncing
 */
function handleDocumentUpdate(documentId: number, ydoc: Y.Doc, update: Uint8Array) {
  // Save incremental update (optional)
  YjsService.saveYjsUpdate(documentId, update).catch(() => {});
  
  // Debounce full state save (every 5 seconds)
  const existingTimer = saveTimers.get(documentId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  
  const timer = setTimeout(async () => {
    try {
      // Save full Yjs state
      await YjsService.saveYjsState(documentId, Y.encodeStateAsUpdate(ydoc));
      
      // Sync to latex_content for backwards compatibility
      await YjsService.syncToLatexContent(documentId, ydoc);
      
      console.log(`[YjsWS] Saved state for document ${documentId}`);
    } catch (err) {
      console.error(`[YjsWS] Failed to save document ${documentId}:`, err);
    }
  }, 5000);
  
  saveTimers.set(documentId, timer);
}

/**
 * Broadcast update to all clients except sender
 */
function broadcastUpdate(documentId: number, data: Buffer, sender: WebSocket) {
  const docConnections = connections.get(documentId);
  if (!docConnections) return;
  
  docConnections.forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

/**
 * Broadcast awareness update to all clients except sender
 */
function broadcastAwareness(documentId: number, data: Buffer, sender: WebSocket) {
  const docConnections = connections.get(documentId);
  if (!docConnections) return;
  
  docConnections.forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

/**
 * Broadcast connected user count to all clients
 */
function broadcastUserCount(documentId: number) {
  const docConnections = connections.get(documentId);
  if (!docConnections) return;
  
  const count = docConnections.size;
  const message = createMessage('userCount', new TextEncoder().encode(String(count)));
  
  docConnections.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Create binary message with type prefix
 */
function createMessage(type: string, data: Uint8Array): Buffer {
  const typeBytes = new TextEncoder().encode(type);
  const message = new Uint8Array(1 + typeBytes.length + data.length);
  message[0] = typeBytes.length;
  message.set(typeBytes, 1);
  message.set(data, 1 + typeBytes.length);
  return Buffer.from(message);
}

/**
 * Parse incoming message
 */
function parseMessage(data: Buffer): { type: string; update: Uint8Array } {
  const typeLength = data[0];
  const type = new TextDecoder().decode(data.slice(1, 1 + typeLength));
  const update = data.slice(1 + typeLength);
  return { type, update };
}
