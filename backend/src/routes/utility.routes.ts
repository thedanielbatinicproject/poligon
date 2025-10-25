import { Router, Request, Response } from 'express';
import { UtilityService } from '../services/utility.service';
import { DocumentsService } from '../services/documents.service';
import { checkLogin, checkAdmin } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit.service';
import { io } from '../index'; // emiting messages via socket.io


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


//API ALLOWANCE ROUTES
//TODO: implement API allowance management routes here

export default utilityRouter;
