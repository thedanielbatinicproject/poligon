import * as Y from 'yjs';
import { WebSocket, WebSocketServer } from 'ws';
import * as http from 'http';
import { YjsService } from '../services/yjs.service';

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
  const wss = new WebSocketServer({ 
    server,
    path: '/yjs',
    verifyClient: (info, callback) => {
      // TODO: Add session verification here
      // For now, allow all connections
      callback(true);
    }
  });


  wss.on('connection', async (ws: WebSocket, request) => {
    console.log('[YjsWS] New WebSocket connection');

    // DEBUG: Log cookies and session info
    const cookieHeader = request.headers['cookie'];
    let sessionId = null;
    if (cookieHeader) {
      // Try to extract session id from cookie string (assume connect.sid or poligon.sid)
      const match = cookieHeader.match(/(connect\.sid|poligon\.sid)=([^;]+)/);
      if (match) sessionId = match[2];
    }
    console.log('[YjsWS][DEBUG] Cookie header:', cookieHeader);
    console.log('[YjsWS][DEBUG] Extracted session id:', sessionId);
    if (sessionId) {
      try {
        const { getSessionById } = await import('./session.service');
        const session = await getSessionById(sessionId);
        console.log('[YjsWS][DEBUG] Session from DB:', session);
        if (session) {
          console.log('[YjsWS][DEBUG] Session user_id:', session.user_id);
        } else {
          console.warn('[YjsWS][DEBUG] No session found for session_id:', sessionId);
        }
      } catch (err) {
        console.error('[YjsWS][DEBUG] Error fetching session:', err);
      }
    } else {
      console.warn('[YjsWS][DEBUG] No session id found in cookie header');
    }

    // Parse document ID from URL query params
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const documentIdParam = url.searchParams.get('documentId');
    
    if (!documentIdParam) {
      console.error('[YjsWS] No documentId provided');
      ws.close();
      return;
    }

    const documentId = parseInt(documentIdParam, 10);
    if (isNaN(documentId)) {
      console.error('[YjsWS] Invalid documentId');
      ws.close();
      return;
    }

    console.log(`[YjsWS] Client connected to document ${documentId}`);

    // Get or create Y.Doc for this document
    let ydoc = docs.get(documentId);
    if (!ydoc) {
      ydoc = await YjsService.initializeYjsDocument(documentId);
      docs.set(documentId, ydoc);
      
      // Setup update handler for persistence
      ydoc.on('update', (update: Uint8Array) => {
        handleDocumentUpdate(documentId, ydoc!, update);
      });
    }

    // Add connection to document's connection set
    if (!connections.has(documentId)) {
      connections.set(documentId, new Set());
    }
    connections.get(documentId)!.add(ws);

    // Send initial state to new client
    const stateUpdate = Y.encodeStateAsUpdate(ydoc);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(createMessage('sync', stateUpdate));
    }

    // Broadcast connected user count
    broadcastUserCount(documentId);

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = parseMessage(data);
        
        if (message.type === 'update') {
          // Apply update to document
          Y.applyUpdate(ydoc!, message.update);
          
          // Broadcast to other clients
          broadcastUpdate(documentId, data, ws);
        } else if (message.type === 'awareness') {
          // Broadcast awareness update (cursor positions, etc.)
          broadcastAwareness(documentId, data, ws);
        }
      } catch (err) {
        console.error('[YjsWS] Error processing message:', err);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      console.log(`[YjsWS] Client disconnected from document ${documentId}`);
      
      // Remove connection
      const docConnections = connections.get(documentId);
      if (docConnections) {
        docConnections.delete(ws);
        
        // Broadcast updated user count
        broadcastUserCount(documentId);
        
        // If no more connections, clean up after delay
        if (docConnections.size === 0) {
          setTimeout(() => {
            if (connections.get(documentId)?.size === 0) {
              console.log(`[YjsWS] Cleaning up document ${documentId} (no active connections)`);
              
              // Save final state
              const doc = docs.get(documentId);
              if (doc) {
                YjsService.saveYjsState(documentId, Y.encodeStateAsUpdate(doc));
                YjsService.syncToLatexContent(documentId, doc);
              }
              
              // Remove from memory
              docs.delete(documentId);
              connections.delete(documentId);
              
              // Clear save timer
              const timer = saveTimers.get(documentId);
              if (timer) {
                clearTimeout(timer);
                saveTimers.delete(documentId);
              }
            }
          }, 30000); // 30 second grace period
        }
      }
    });

    ws.on('error', (err) => {
      console.error('[YjsWS] WebSocket error:', err);
    });
  });

  console.log('[YjsWS] WebSocket server initialized on /yjs');
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
