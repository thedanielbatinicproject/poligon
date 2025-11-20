import { Router, Request, Response } from 'express';
import { UtilityService } from '../services/utility.service';
import { DocumentsService } from '../services/documents.service';
import { checkLogin, checkAdmin } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit.service';
import { io } from '../index'; // emiting messages via socket.io
import sessionStore from '../config/sessionStore';
import { getSessionById } from '../services/session.service';
import { getAllSessions } from '../services/user.service';

import {
  getRendersForIp,
  incrementRendersForIp,
} from '../services/playground.service';

import { renderLatex } from '../render/renderer';


const utilityRouter = Router();

// POST /api/utility/playground/compile - Render LaTeX and stream PDF as binary (no save)
utilityRouter.post('/playground/compile', async (req: Request, res: Response) => {
  try {
    const content = req.body?.content;
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Missing or invalid LaTeX content.' });
    }
    // Render with 20s timeout
    const result = await renderLatex(content, 20000, false);
    if (!result.success || !result.pdf) {
      return res.status(400).json({ error: result.error || 'Failed to render PDF.' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="playground.pdf"');
    res.send(result.pdf);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal error during PDF render', details: String(err) });
  }
});

// PLAYGROUND RENDER LIMIT ROUTES
// POST /api/utility/playground/render - Attempt a render (enforces limit for unlogged users)
utilityRouter.post('/playground/render', async (req: Request, res: Response) => {
  // If logged in, allow unlimited
  if (req.session && req.session.user_id) {
    return res.status(200).json({ allowed: true, unlimited: true });
  }
  // Get IP (trusts proxy if set up, else req.ip)
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip;
  const limit = 15;
  try {
    const count = await getRendersForIp(String(ip));
    if (count >= limit) {
      return res.status(429).json({ allowed: false, reason: 'limit', count, limit });
    }
    await incrementRendersForIp(String(ip));
    return res.status(200).json({ allowed: true, count: count + 1, limit });
  } catch (err) {
    return res.status(500).json({ allowed: false, error: 'Failed to check or increment renders', details: String(err) });
  }
});

// GET /api/utility/playground/renders - Get today's render count for this IP
utilityRouter.get('/playground/renders', async (req: Request, res: Response) => {
  if (req.session && req.session.user_id) {
    return res.status(200).json({ unlimited: true });
  }
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip;
  const limit = Number(process.env.PLAYGROUND_RENDER_LIMIT_UNLOGGED) || 15;
  try {
    const count = await getRendersForIp(String(ip));
    return res.status(200).json({ count, limit });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get render count', details: String(err) });
  }
});

//DOCUMENT TYPES ROUTES
// GET /api/document-types - All logged-in users can get list of document types
utilityRouter.get('/document-types', checkLogin, async (req: Request, res: Response) => {
  try {
    // Cache for 5 minutes - document types rarely change
    res.setHeader('Cache-Control', 'public, max-age=300');
    
    const types = await DocumentsService.getAllDocumentTypes();
    res.status(200).json(types);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document types from database.', details: err });
  }
});

// POST /api/document-types - Only admin can add a new document type
utilityRouter.post('/document-types', checkAdmin, async (req: Request, res: Response) => {
  const { type_name, description } = req.body;
  if (!type_name || typeof type_name !== 'string' || type_name.trim().length === 0 || type_name.length > 50) {
    return res.status(400).json({ error: 'Invalid type_name. Allowed: string, max 50 chars, cannot be empty.' });
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
  // Accept 'from' and 'due' from request body (ISO datetime strings). 'from' is required.
  const { created_by, assigned_to, document_id, task_title, task_description, task_status, from, due } = req.body;
  // Support both session shapes: nested user object or top-level user_id
  const sessionUser = (req.session as any).user || null;
  const sessionUserId = (req.session as any).user_id || (sessionUser && sessionUser.user_id) || null;
  const sessionRole = (sessionUser && sessionUser.role) || (req.session as any).role || null;
  if (!sessionUserId) return res.status(401).json({ error: 'User not logged in!' });

  // If document_id is provided, check permissions
  if (document_id) {
    // Admins can always add
    if (sessionRole !== 'admin') {
      const doc = await DocumentsService.getDocumentById(document_id);
      if (!doc) return res.status(404).json({ error: 'Document not found.' });
      const isCreator = doc.created_by === Number(sessionUserId);
      const isEditor = await DocumentsService.isEditor(document_id, Number(sessionUserId), ['editor', 'owner', 'mentor']);
      if (!isCreator && !isEditor) {
        return res.status(403).json({ error: 'You are not allowed to add tasks for this document because you are neither the creator nor an editor.' });
      }
    }
  }

  try {
    const task_id = await UtilityService.addTask({
      created_by: Number(sessionUserId),
      assigned_to,
      document_id,
      task_title,
      task_description,
      task_status,
      task_from: from,
      task_due: due ?? null
    });
  await AuditService.createAuditLog({
    user_id: Number(sessionUserId),
    action_type: 'create',
    entity_type: 'task',
    entity_id: task_id
  });
  res.status(201).json({ success: true, task_id });
  } catch (err) {
    console.error('[utility.routes] Failed creating task:', err);
    res.status(500).json({ error: 'Failed to create task.', details: String(err) });
  }
});

// PUT /api/tasks/:task_id - Update a task (with permission checks)
utilityRouter.put('/tasks/:task_id', checkLogin, async (req: Request, res: Response) => {
  const task_id = Number(req.params.task_id);
  // support both session shapes
  const sessionUser = (req.session as any).user || null;
  const userId = (req.session as any).user_id || (sessionUser && sessionUser.user_id) || null;
  const role = (req.session as any).role || (sessionUser && sessionUser.role) || null;
  if (!userId) return res.status(401).json({ error: 'User not logged in!' });
  if (isNaN(task_id)) return res.status(400).json({ error: 'Invalid task_id' });

  try {
    const existing = await UtilityService.getTaskById(task_id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    // Permission rules:
    // - admin/mentor can edit any task
    // - task creator can edit
    // - assigned user may only change the task_status (mark closed/reopen)
    const role = (req.session as any).role || (req.session as any).user?.role || null;
    let canEditAny = false;
    if (role === 'admin' || role === 'mentor') canEditAny = true;
    if (existing.created_by === Number(userId)) canEditAny = true;

    // Determine if requester is the assigned user
    const assignedTo = existing.assigned_to != null ? Number(existing.assigned_to) : null;
    const isAssignedUser = assignedTo !== null && Number(userId) === Number(assignedTo);

    // Inspect requested updates to decide if a limited edit by assigned user is allowed
    const allowed = ['task_title','task_description','assigned_to','document_id','task_status','from','due','task_from','task_due'];
    const requestedKeys = Object.keys(req.body).filter(k => allowed.includes(k));

    // If not allowed to edit any field, allow only assigned user to change task_status
    if (!canEditAny) {
      if (!(isAssignedUser && requestedKeys.length === 1 && (requestedKeys[0] === 'task_status' || requestedKeys[0] === 'task_status' ))) {
        return res.status(403).json({ error: 'Not authorized to edit this task' });
      }
    }

    const updates: any = {};
    // Accept both body keys 'from'/'due' and 'task_from'/'task_due'
    for (const k of requestedKeys) {
      if (k === 'from' || k === 'task_from') updates.task_from = req.body[k];
      else if (k === 'due' || k === 'task_due') updates.task_due = req.body[k];
      else updates[k] = req.body[k];
    }

    const ok = await UtilityService.updateTask(task_id, updates);
  if (!ok) return res.status(400).json({ error: 'No valid fields provided or update failed' });
  await AuditService.createAuditLog({ user_id: Number(userId), action_type: 'edit', entity_type: 'task', entity_id: task_id });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task.', details: String(err) });
  }
});

// DELETE /api/tasks/:task_id - Delete a task with permission checks
utilityRouter.delete('/tasks/:task_id', checkLogin, async (req: Request, res: Response) => {
  const task_id = Number(req.params.task_id);
  // support both session shapes: nested user object or top-level user_id/role
  const sessionUser = (req.session as any).user || null;
  const userId = (req.session as any).user_id || (sessionUser && sessionUser.user_id) || null;
  const userRole = (sessionUser && sessionUser.role) || (req.session as any).role || null;
  if (!userId) return res.status(401).json({ error: 'User not logged in!' });

  try {
    // Get the task object from UtilityService
    const taskObj = await UtilityService.getTaskById(task_id);
    if (!taskObj) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Admins can always delete. Students may delete their own tasks. Others may delete if they are document creator or task creator.
    let canDelete = false;
    const uid = Number(userId);
    const role = userRole;
    if (role === 'admin') {
      canDelete = true;
    } else if (role === 'student') {
      if (taskObj.created_by === uid) canDelete = true;
    } else {
      if (taskObj.document_id) {
        const doc = await DocumentsService.getDocumentById(taskObj.document_id);
        if (doc && doc.created_by === uid) {
          canDelete = true;
        } else if (taskObj.created_by === uid) {
          canDelete = true;
        }
      } else {
        if (taskObj.created_by === uid) canDelete = true;
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
      user_id: Number(userId),
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
    // Resolve requester id & role (support both session shapes)
    const sessionUser = (req.session as any).user || null;
    const requesterId = (req.session as any).user_id || (sessionUser && sessionUser.user_id) || null;
    const requesterRole = (sessionUser && sessionUser.role) || (req.session as any).role || null;

    // If admin/mentor return full list, otherwise restrict to tasks the user created or is assigned to
    if (requesterRole === 'admin' || requesterRole === 'mentor') {
      const tasks = await UtilityService.getTasksByDocument(document_id);
      return res.status(200).json(tasks);
    }

  if (!requesterId) return res.status(401).json({ error: 'Not authenticated' });
  const tasks = await UtilityService.getTasksByDocumentFiltered(document_id, Number(requesterId));
  return res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks for document.', details: err });
  }
});

// GET /api/tasks/user/ — Returns all tasks created by or assigned to the current logged-in user
utilityRouter.get('/tasks/user/', checkLogin, async (req: Request, res: Response) => {
  // support both session shapes
  const sessionUser = (req.session as any).user || null;
  const userId = (req.session as any).user_id || (sessionUser && sessionUser.user_id) || null;
  if (!userId || isNaN(Number(userId))) {
    return res.status(400).json({ error: 'Invalid user_id.' });
  }
  try {
    // Determine role so admins/mentors can see ALL global tasks, others only their own
    const role = (sessionUser && sessionUser.role) || (req.session as any).role || null;
    let tasks: any[] = [];
    if (role === 'admin' || role === 'mentor') {
      // Admins/mentors see all global tasks
      tasks = await UtilityService.getGlobalTasks();
    } else {
      // Regular users see only tasks they created or are assigned to (global scope)
      tasks = await UtilityService.getGlobalTasksFiltered(Number(userId));
    }
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
  // Support both session shapes: top-level user_id or nested user object
  const sessionUser = (req.session as any).user || null
  const sender_id = (req.session as any).user_id || (sessionUser && sessionUser.user_id) || null
  if (!sender_id) return res.status(401).json({ error: 'Not authenticated' })
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
  // support both session shapes: top-level user_id or nested user object
  const sessionUser = (req.session as any).user || null;
  const user_id = (req.session as any).user_id || (sessionUser && sessionUser.user_id) || null;

  if (isNaN(message_id)) {
    return res.status(400).json({ error: 'Invalid message_id.' });
  }
  if (!user_id) return res.status(401).json({ error: 'Not authenticated' });

  try {
    // Dohvati poruku iz baze
    const msg = await UtilityService.getMessageById(message_id);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    // Permission check: non-admins may only delete messages they sent
    const sessionUser = (req.session as any).user || null;
    const userRole = (sessionUser && sessionUser.role) || (req.session as any).role || null;
    if (userRole !== 'admin' && msg.sender_id !== Number(user_id)) {
      return res.status(403).json({ error: 'You are not allowed to delete this message.' });
    }

    // Attempt deletion (service may perform additional checks)
    const deleted = await UtilityService.deleteMessage(message_id, user_id);
    if (!deleted) {
      return res.status(403).json({ error: 'You are not allowed to delete this message or message not found.' });
    }

    // Emitiraj event oboma (sender i receiver)
    const otherUserId = (msg.sender_id === user_id) ? msg.receiver_id : msg.sender_id;
  // include sender and receiver ids so clients can determine which conversation
  const payload = { message_id, sender_id: msg.sender_id, receiver_id: msg.receiver_id };
  io.to(String(user_id)).emit('message_deleted', payload);
  io.to(String(otherUserId)).emit('message_deleted', payload);

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message.', details: err });
  }
});
// GET /api/utility/messages/partners - Return a list of user_id's with whom the logged-in user has message history
utilityRouter.get('/messages/partners', checkLogin, async (req: Request, res: Response) => {
  try {
    const sessionUser = (req.session as any).user || null;
    const userId = (req.session as any).user_id || (sessionUser && sessionUser.user_id) || null;
    // Add debug to help trace session resolution
    console.debug('[utility.routes] /messages/partners sessionUser=', sessionUser, 'session_user_id=', (req.session as any).user_id, 'resolved userId=', userId);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const partners = await UtilityService.getMessagePartners(Number(userId));
    // partners is an array of numbers (user_id)
    res.status(200).json(partners);
  } catch (err) {
    console.error('Failed to fetch message partners:', err);
    res.status(500).json({ error: 'Failed to fetch message partners!', details: String(err) });
  }
});


// GET /api/utility/messages/:user_id - Get all messages between logged-in user and specified user
utilityRouter.get('/messages/:user_id', checkLogin, async (req: Request, res: Response) => {
  try {
    const sessionUser = (req.session as any).user || null;
    const user1_id = (req.session as any).user_id || (sessionUser && sessionUser.user_id) || null;
    if (!user1_id) {
      console.warn('GET /api/utility/messages/:user_id called without authenticated session. sessionID=', req.sessionID);
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user2_id = Number(req.params.user_id);
    if (isNaN(user2_id)) return res.status(400).json({ error: 'Invalid user_id parameter' });

    const messages = await UtilityService.getMessagesBetweenUsers(Number(user1_id), user2_id);
    res.status(200).json(messages);
  } catch (err) {
    console.error('Failed to fetch messages between users:', err);
    res.status(500).json({ error: 'Failed to fetch messages', details: String(err) });
  }
});


//SESSION ROUTES
// POST /api/utility/session - update multiple small session attributes (only logged-in users)
// Body may contain any subset of: last_route, last_document_id, editor_cursor_position,
// editor_scroll_line, scroll_position, sidebar_state, theme
utilityRouter.post('/session', checkLogin, async (req: Request, res: Response) => {
  try {
    // Support both session shapes: older code stored top-level user_id, newer code may store a user object.
    const sessionUser = (req.session as any).user || null;
    const sessionUserIdRaw = (req.session as any).user_id || (sessionUser && sessionUser.user_id) || null;
    if (!sessionUserIdRaw) return res.status(401).json({ error: 'Not authenticated' });
    
    const sessionUserId = Number(sessionUserIdRaw);
    if (isNaN(sessionUserId)) return res.status(400).json({ error: 'Invalid user ID in session' });

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

// ADMIN STATISTICS ROUTES
// GET /api/utility/storage - Returns database and folder storage sizes (admin only)
utilityRouter.get('/storage', checkLogin, checkAdmin, async (req: Request, res: Response) => {
  try {
    const databaseSize = await UtilityService.getUploadsStorageSize();
    const folderSize = await UtilityService.getUploadsFolderSize();
    res.status(200).json({ database_size: databaseSize, folder_size: folderSize });
  } catch (err) {
    console.error('Failed to fetch storage statistics:', err);
    res.status(500).json({ error: 'Failed to fetch storage statistics', details: String(err) });
  }
});

// GET /api/utility/sessions/count - Returns count of active sessions (admin only)
utilityRouter.get('/sessions/count', checkLogin, checkAdmin, async (req: Request, res: Response) => {
  try {
    const activeSessionsCount = await UtilityService.getActiveSessionsCount();
    res.status(200).json({ active_sessions: activeSessionsCount });
  } catch (err) {
    console.error('Failed to fetch sessions count:', err);
    res.status(500).json({ error: 'Failed to fetch sessions count', details: String(err) });
  }
});

// GET /api/utility/render-service/status - Check LaTeX render service availability (admin only)
utilityRouter.get('/render-service/status', checkLogin, checkAdmin, async (req: Request, res: Response) => {
  try {
    const status = await UtilityService.checkRenderServiceStatus();
    res.status(200).json(status);
  } catch (err) {
    console.error('Failed to check render service status:', err);
    res.status(500).json({ error: 'Failed to check render service status', details: String(err) });
  }
});

// GET /api/utility/sessions/all - Get all active sessions with user info (admin-only)
utilityRouter.get('/sessions/all', checkLogin, checkAdmin, async (req: Request, res: Response) => {
  try {
    const sessions = await getAllSessions();
    res.status(200).json(sessions);
  } catch (err) {
    console.error('Failed to fetch all sessions:', err);
    res.status(500).json({ error: 'Failed to fetch all sessions', details: String(err) });
  }
});

export default utilityRouter;


