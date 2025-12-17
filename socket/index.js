// Standalone Yjs websocket server for Poligon with LevelDB persistence + MySQL fallback
require('dotenv').config();
const { setupWSConnection, setPersistence } = require('y-websocket/bin/utils');
const { LeveldbPersistence } = require('y-leveldb');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const Y = require('yjs');
const mysql = require('mysql2/promise');

const port = process.env.PORT || 1234;
const server = http.createServer();

// Setup LevelDB persistence
const persistenceDir = process.env.YPERSISTENCE || path.join(__dirname, 'yjs-data');
console.log(`[YjsWS] Persistence directory: ${persistenceDir}`);

const ldb = new LeveldbPersistence(persistenceDir);

// MySQL connection pool for fallback
const dbPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'db_poligon',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_poligon',
  waitForConnections: true,
  connectionLimit: 5,
});

// Load document content from MySQL
async function loadFromMySQL(docId) {
  try {
    const [rows] = await dbPool.execute(
      'SELECT latex_content FROM documents WHERE document_id = ?',
      [docId]
    );
    if (rows.length > 0 && rows[0].latex_content) {
      console.log(`[YjsWS] Loaded document "${docId}" content from MySQL`);
      return rows[0].latex_content;
    }
  } catch (err) {
    console.error(`[YjsWS] MySQL error loading doc "${docId}":`, err.message);
  }
  return null;
}

// Use y-websocket's built-in persistence mechanism
setPersistence({
  bindState: async (docName, ydoc) => {
    // First, try to load from LevelDB
    const persistedYdoc = await ldb.getYDoc(docName);
    const persistedStateVector = persistedYdoc ? Y.encodeStateVector(persistedYdoc) : null;
    
    if (persistedStateVector && persistedStateVector.length > 1) {
      // Load from LevelDB cache
      const diff = Y.encodeStateAsUpdate(persistedYdoc);
      Y.applyUpdate(ydoc, diff);
      console.log(`[YjsWS] Loaded document "${docName}" from LevelDB`);
    } else {
      // Fallback: Load from MySQL
      const latexContent = await loadFromMySQL(docName);
      if (latexContent) {
        // Insert the content into the Yjs document
        const ytext = ydoc.getText('codemirror');
        ytext.insert(0, latexContent);
        console.log(`[YjsWS] Initialized document "${docName}" from MySQL`);
      } else {
        console.log(`[YjsWS] No existing data for "${docName}", starting fresh`);
      }
    }
    
    // Listen for updates and persist them to LevelDB
    ydoc.on('update', async (update) => {
      try {
        await ldb.storeUpdate(docName, update);
      } catch (err) {
        console.error(`[YjsWS] Error storing update for "${docName}":`, err);
      }
    });
  },
  writeState: async (docName, ydoc) => {
    console.log(`[YjsWS] Document "${docName}" closed, state persisted in LevelDB`);
  }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const docName = req.url?.slice(1).split('?')[0] || 'default';
  console.log(`[YjsWS] New connection for document: ${docName}`);
  setupWSConnection(ws, req, { gc: true });
});

server.listen(port, () => {
  console.log(`[YjsWS] Standalone y-websocket server running on port ${port}`);
  console.log(`[YjsWS] Documents persisted to: ${persistenceDir}`);
  console.log(`[YjsWS] MySQL fallback enabled for document recovery`);
});
