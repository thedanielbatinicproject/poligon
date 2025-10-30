import { Router, Request, Response } from 'express';
import { UtilityService } from '../services/utility.service';
import { DocumentsService } from '../services/documents.service';
import { checkLogin, checkAdmin } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit.service';
import { io } from '../index'; // emiting messages via socket.io
import sessionStore from '../config/sessionStore';
import { getSessionById } from '../services/session.service';


const utilityRouter = Router();

//DOCUMENT TYPES ROUTES
// GET /api/document-types - All logged-in users can get list of document types
utilityRouter.get('/document-types', checkLogin, async (req: Request, res: Response) => {
  try {
    const types = await DocumentsService.getAllDocumentTypes();
    res.status(200).json(types);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document types from database.', details: err });
  }
});

// POST /api/document-types - Only admin can add a new document type
utilityRouter.post('/document-types', checkAdmin, async (req: Request, res: Response) => {
  const { type_name, description } = req.body;
  if (!type_name || typeof type_name !== 'string' || type_name.length > 50 || type_name.length !== 0) {
    return res.status(400).json({ error: 'Invalid type_name. Allowed: string, max 50, chars cannot be empty.' });
  }
  try {
    const type_id = await DocumentsService.createDocumentType(type_name, description || '');
    res.status(201).json({ success: true, type_id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create document type in database.', details: err });
  }
});

// PUT /api/document-types/:type_id - Only admin can edit a document type
utilityRouter.put('/document-types/:type_id', checkAdmin, async (req: Request, res: Response) => {
  const type_id = Number(req.params.type_id);
  const { type_name, description } = req.body;
  if (!type_name || typeof type_name !== 'string' || type_name.length > 50) {
    return res.status(400).json({ error: 'Invalid type_name.' });
  }
  try {
    const updated = await DocumentsService.updateDocumentType(type_id, type_name, description || '');
    if (!updated) {
      return res.status(404).json({ error: 'Document type not found or not updated.' });
    }
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update document type.', details: err });
  }
});

// DELETE /api/document-types/:type_id - Only admin can delete a document type
utilityRouter.delete('/document-types/:type_id', checkAdmin, async (req: Request, res: Response) => {
  const type_id = Number(req.params.type_id);
  try {
    const deleted = await DocumentsService.deleteDocumentType(type_id);
    if (!deleted) {
      return res.status(404).json({ error: 'Document type not found or not deleted.' });
    }
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document type.', details: err });
  }
});


//TASK ROUTES
// Add a new task
utilityRouter.post('/tasks', checkLogin, async (req: Request, res: Response) => {
  const { created_by, assigned_to, document_id, task_title, task_description, task_status } = req.body;
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'User not logged in!' });

  // If document_id is provided, check permissions
  if (document_id) {
    // Admins can always add
    if (user.role !== 'admin') {
      const doc = await DocumentsService.getDocumentById(document_id);
      if (!doc) return res.status(404).json({ error: 'Document not found.' });
      const isCreator = doc.created_by === user.user_id;
      const isEditor = await DocumentsService.isEditor(document_id, user.user_id, ['editor', 'owner', 'mentor']);
      if (!isCreator && !isEditor) {
        return res.status(403).json({ error: 'You are not allowed to add tasks for this document because you are neither the creator nor an editor.' });
      }
    }
  }

  try {
    const task_id = await UtilityService.addTask({
      created_by: req.session.user.user_id,
      assigned_to,
      document_id,
      task_title,
      task_description,
      task_status
    });
    await AuditService.createAuditLog({
        user_id: user.user_id,
        action_type: 'create',
        entity_type: 'task',
        entity_id: task_id
    });
    res.status(201).json({ success: true, task_id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task.', details: err });
  }
});

// Update a task
utilityRouter.put('/tasks/:task_id', checkLogin, async (req: Request, res: Response) => {
  const task_id = Number(req.params.task_id);
  const updates = req.body;
  // Optionally, add permission checks here if needed
  try {
    const updated = await UtilityService.updateTask(task_id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Task not found or not updated.' });
    }
    await AuditService.createAuditLog({
        user_id: req.session.user.user_id,
        action_type: 'edit',
        entity_type: 'task',
        entity_id: task_id
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task.', details: err });
  }
});

// DELETE /api/tasks/:task_id - Delete a task with permission checks
utilityRouter.delete('/tasks/:task_id', checkLogin, async (req: Request, res: Response) => {
  const task_id = Number(req.params.task_id);
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'User not logged in!' });

  try {
    // Get the task object from UtilityService
    const taskObj = await UtilityService.getTaskById(task_id);
    if (!taskObj) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Admins can always delete
    let canDelete = false;
    if (user.role === 'admin') {
      canDelete = true;
    } else if (user.role === 'student') {
      // Student can only delete their own tasks
      if (taskObj.created_by === user.user_id) canDelete = true;
    } else {
      // For other roles, check if user is document creator
      if (taskObj.document_id) {
        const doc = await DocumentsService.getDocumentById(taskObj.document_id);
        if (doc && doc.created_by === user.user_id) {
          canDelete = true;
        } else if (taskObj.created_by === user.user_id) {
          canDelete = true;
        }
      } else {
        if (taskObj.created_by === user.user_id) canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({ error: 'You are not allowed to delete this task because you are neither the creator of the task nor a document creator.' });
    }

    const deleted = await UtilityService.deleteTask(task_id);
    if (!deleted) {
      return res.status(404).json({ error: 'Task not found or not deleted.' });
    }
    await AuditService.createAuditLog({
      user_id: user.user_id,
      action_type: 'delete',
      entity_type: 'task',
      entity_id: task_id
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task.', details: err });
  }
});

// GET /api/tasks/document/:document_id — Returns all tasks for the specified document
utilityRouter.get('/tasks/document/:document_id', checkLogin, async (req: Request, res: Response) => {
  const document_id = Number(req.params.document_id);
  if (isNaN(document_id)) {
    return res.status(400).json({ error: 'Invalid document_id.' });
  }
  try {
    const tasks = await UtilityService.getTasksByDocument(document_id);
    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks for document.', details: err });
  }
});

// GET /api/tasks/user/ — Returns all tasks created by or assigned to the current logged-in user
utilityRouter.get('/tasks/user/', checkLogin, async (req: Request, res: Response) => {
  const user_id = Number(req.session.user.user_id);
  if (isNaN(user_id)) {
    return res.status(400).json({ error: 'Invalid user_id.' });
  }
  try {
    const tasks = await UtilityService.getTasksByUser(user_id);
    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks for user.', details: err });
  }
});

// GET /api/tasks/user/:user_id — Returns all tasks created by or assigned to the specified user
utilityRouter.get('/tasks/user/:user_id', checkAdmin, async (req: Request, res: Response) => {
  const user_id = Number(req.params.user_id);
  if (isNaN(user_id)) {
    return res.status(400).json({ error: 'Invalid user_id.' });
  }
  try {
    const tasks = await UtilityService.getTasksByUser(user_id);
    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks for user.', details: err });
  }
});


//USER MESAGES ROUTES
// POST /api/utility/messages - Send a message
utilityRouter.post('/messages', checkLogin, async (req: Request, res: Response) => {
  const sender_id = req.session.user.user_id;
  const { message_content } = req.body;
  const receiver_id = Number(req.body.receiver_id);
  if (!receiver_id || typeof receiver_id !== 'number' || !message_content || typeof message_content !== 'string') {
    return res.status(400).json({ error: 'receiver_id (number) and message_content (string) are required.' });
  }

  try {
    const message_id = await UtilityService.addMessage(sender_id, receiver_id, message_content);

    // Emit message via socket.io
    io.to(String(receiver_id)).emit('receive_message', {
      message_id,
      sender_id,
      receiver_id,
      message_content,
      sent_at: new Date()
    });

    res.status(201).json({ success: true, message_id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message.', details: err });
  }
});


// DELETE /api/utility/messages/:message_id - Delete a message
utilityRouter.delete('/messages/:message_id', checkLogin, async (req: Request, res: Response) => {
  const message_id = Number(req.params.message_id);
  const user_id = req.session.user.user_id;

  if (isNaN(message_id)) {
    return res.status(400).json({ error: 'Invalid message_id.' });
  }

  try {
    // Dohvati poruku iz baze
    const msg = await UtilityService.getMessageById(message_id);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    // Pokušaj brisanja
    const deleted = await UtilityService.deleteMessage(message_id, user_id);
    if (!deleted) {
      return res.status(403).json({ error: 'You are not allowed to delete this message or message not found.' });
    }

    // Emitiraj event oboma (sender i receiver)
    const otherUserId = (msg.sender_id === user_id) ? msg.receiver_id : msg.sender_id;
    io.to(String(user_id)).emit('message_deleted', { message_id });
    io.to(String(otherUserId)).emit('message_deleted', { message_id });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message.', details: err });
  }
});


// GET /api/utility/messages/:user_id - Get all messages between logged-in user and specified user
utilityRouter.get('/messages/:user_id', checkLogin, async (req: Request, res: Response) => {
  const user1_id = req.session.user.user_id;
  const user2_id = Number(req.params.user_id);
  const messages = await UtilityService.getMessagesBetweenUsers(user1_id, user2_id);
  res.status(200).json(messages);
});


// POST /api/utility/session - update multiple small session attributes (only logged-in users)
// Body may contain any subset of: last_route, last_document_id, editor_cursor_position,
// editor_scroll_line, scroll_position, sidebar_state, theme
utilityRouter.post('/session', checkLogin, async (req: Request, res: Response) => {
  try {
    // Support both session shapes: older code stored top-level user_id, newer code may store a user object.
    const sessionUser = (req.session as any).user || null;
    const sessionUserId = (req.session as any).user_id || (sessionUser && sessionUser.user_id) || null;
    if (!sessionUserId) return res.status(401).json({ error: 'Not authenticated' });

    // pick only allowed keys from body
    const {
      last_route,
      last_document_id,
      editor_cursor_position,
      editor_scroll_line,
      scroll_position,
      sidebar_state,
      theme
    } = req.body || {};

    // Build attrs object only with provided values
    const attrs: any = {};
    if (typeof last_route !== 'undefined') attrs.last_route = last_route;
    if (typeof last_document_id !== 'undefined') attrs.last_document_id = last_document_id;
    if (typeof editor_cursor_position !== 'undefined') attrs.editor_cursor_position = editor_cursor_position;
    if (typeof editor_scroll_line !== 'undefined') attrs.editor_scroll_line = editor_scroll_line;
    if (typeof scroll_position !== 'undefined') attrs.scroll_position = scroll_position;
    if (typeof sidebar_state !== 'undefined') attrs.sidebar_state = sidebar_state;
    if (typeof theme !== 'undefined') attrs.theme = theme;

    if (Object.keys(attrs).length === 0) {
      return res.status(400).json({ error: 'No session attributes provided to update' });
    }

  // 1) Update in-memory session object so subsequent handlers in this request see latest state
  Object.assign(req.session, attrs);

  // 2) Persist to DB via UtilityService. Use resolved sessionUserId.
  // Pass the current session id so only this session row is updated (prevents updating other devices)
  const affected = await UtilityService.updateSessionAttributes(sessionUserId, attrs, req.sessionID);

    // 3) Optionally, also call upsertSession to ensure serialized session_data is in sync with columns
    //    (uncomment if you want to persist full session_data JSON too)
    // await upsertSession(req.sessionID, req.session);

    // Save session and respond
    req.session.save((err: any) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      return res.status(200).json({ success: true, updated: Object.keys(attrs), affectedRows: affected });
    });
  } catch (err) {
    console.error('Failed to update session attributes:', err);
    return res.status(500).json({ error: 'Failed to update session attributes', details: String(err) });
  }
});


// GET /api/utility/session/:session_id - return full session metadata for a given session_id
// Accessible by: the session owner (user) or admin users
utilityRouter.get('/session/:session_id', checkLogin, async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.params.session_id || '').trim();
    if (!sessionId) return res.status(400).json({ error: 'session_id is required' });

    // Resolve requester id & role (support both session shapes)
    const sessionObj: any = (req.session as any).user || null;
    const requesterId = (req.session as any).user_id || (sessionObj && sessionObj.user_id) || null;
    const requesterRole = (sessionObj && sessionObj.role) || (req.session as any).role || null;

    if (!requesterId) return res.status(401).json({ error: 'Not authenticated' });

    // Read session metadata from session service (returns merged session_data + explicit columns)
    const targetSession = await getSessionById(sessionId);
    if (!targetSession) return res.status(404).json({ error: 'Session not found' });

    // Determine owner id from stored session shape
    const ownerId = (targetSession as any).user_id || ((targetSession as any).user && (targetSession as any).user.user_id) || null;

    const isOwner = Number(ownerId) === Number(requesterId);
    const isAdmin = requesterRole === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to view this session' });
    }

    // Return relevant fields only to keep response compact
    const response = {
      session_id: sessionId,
      last_route: (targetSession as any).last_route || null,
      user_agent: (targetSession as any).user_agent || null,
      ip_address: (targetSession as any).ip_address || null,
      created_at: (targetSession as any).created_at || null,
      expires_at: (targetSession as any).expires_at || null,
      // include raw session_data if useful for debug (commented out by default)
      // session_data: targetSession
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error('Failed to fetch session metadata:', err);
    return res.status(500).json({ error: 'Failed to fetch session metadata', details: String(err) });
  }
});


// DELETE /api/utility/session/:session_id - delete a session row
// - a logged-in user can delete their own session
// - an admin can delete any user's session
utilityRouter.delete('/session/:session_id', checkLogin, async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.params.session_id || '').trim();
    if (!sessionId) return res.status(400).json({ error: 'session_id is required' });

    // Resolve requester id & role (support both session shapes)
    const sessionObj: any = (req.session as any).user || null;
    const requesterId = (req.session as any).user_id || (sessionObj && sessionObj.user_id) || null;
    const requesterRole = (sessionObj && sessionObj.role) || (req.session as any).role || null;

    if (!requesterId) return res.status(401).json({ error: 'Not authenticated' });

    // Ensure sessionStore is available and implements get/destroy
    if (!sessionStore || typeof (sessionStore as any).get !== 'function' || typeof (sessionStore as any).destroy !== 'function') {
      return res.status(500).json({ error: 'Session store not available on server' });
    }

    // Promisify store.get and store.destroy
    const storeGet = (id: string) => new Promise<any>((resolve, reject) => {
      (sessionStore as any).get(id, (err: any, sess: any) => {
        if (err) return reject(err);
        resolve(sess || null);
      });
    });
    const storeDestroy = (id: string) => new Promise<void>((resolve, reject) => {
      (sessionStore as any).destroy(id, (err: any) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // Read target session from store
    const targetSession = await storeGet(sessionId);
    if (!targetSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Determine owner id from stored session shape
    const ownerId = (targetSession as any).user_id || ((targetSession as any).user && (targetSession as any).user.user_id) || null;

    const isOwner = Number(ownerId) === Number(requesterId);
    const isAdmin = requesterRole === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this session' });
    }

    // Destroy session in the store (this removes the persisted session data)
    await storeDestroy(sessionId);

    // If this was the current session, destroy req.session so user is logged out immediately
    if (sessionId === req.sessionID) {
      req.session.destroy((err: any) => {
        if (err) {
          console.error('Failed to destroy current session after store destroy:', err);
          return res.status(200).json({ success: true, destroyedCurrent: false });
        }
        return res.status(200).json({ success: true, destroyedCurrent: true });
      });
      return; // response handled in callback
    }

    // Success for non-current session deletion
    return res.status(200).json({ success: true, deletedSessionId: sessionId });
  } catch (err) {
    console.error('Failed to delete session via store:', err);
    return res.status(500).json({ error: 'Failed to delete session', details: String(err) });
  }
});




//API ALLOWANCE ROUTES
//TODO: implement API allowance management routes here

export default utilityRouter;
