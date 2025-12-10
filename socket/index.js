// Standalone Yjs websocket server for Poligon with LevelDB persistence
const { setupWSConnection, docs } = require('y-websocket/bin/utils');
const { LeveldbPersistence } = require('y-leveldb');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const port = process.env.PORT || 1234;
const server = http.createServer();

// Setup LevelDB persistence
const persistenceDir = process.env.YPERSISTENCE || path.join(__dirname, 'yjs-data');
console.log(`[YjsWS] Persistence directory: ${persistenceDir}`);

const ldb = new LeveldbPersistence(persistenceDir);

// Override the default getYDoc to load from LevelDB
const getYDoc = async (docName) => {
  // Check if doc already exists in memory
  let doc = docs.get(docName);
  if (doc) return doc;
  
  // Try to load from LevelDB
  try {
    doc = await ldb.getYDoc(docName);
    if (doc) {
      console.log(`[YjsWS] Loaded document "${docName}" from LevelDB`);
      docs.set(docName, doc);
      
      // Setup persistence for future updates
      doc.on('update', async (update) => {
        try {
          await ldb.storeUpdate(docName, update);
        } catch (err) {
          console.error(`[YjsWS] Error storing update for "${docName}":`, err);
        }
      });
      
      return doc;
    }
  } catch (err) {
    console.log(`[YjsWS] No existing data for "${docName}", creating new doc`);
  }
  
  // Create new doc if not found
  const Y = require('yjs');
  doc = new Y.Doc();
  docs.set(docName, doc);
  
  // Setup persistence for new doc
  doc.on('update', async (update) => {
    try {
      await ldb.storeUpdate(docName, update);
    } catch (err) {
      console.error(`[YjsWS] Error storing update for "${docName}":`, err);
    }
  });
  
  console.log(`[YjsWS] Created new document "${docName}"`);
  return doc;
};

const wss = new WebSocket.Server({ server });

wss.on('connection', async (ws, req) => {
  // Extract document name from URL (e.g., /123 -> "123")
  const docName = req.url?.slice(1).split('?')[0] || 'default';
  console.log(`[YjsWS] New connection for document: ${docName}`);
  
  // Ensure doc is loaded from persistence before setting up connection
  await getYDoc(docName);
  
  setupWSConnection(ws, req, { gc: true });
});

server.listen(port, () => {
  console.log(`[YjsWS] Standalone y-websocket server running on port ${port}`);
  console.log(`[YjsWS] Documents will be persisted to: ${persistenceDir}`);
});
