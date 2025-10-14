const db = require('../db');

function _getDocumentIdFromReq(req) {
  return (
    (req.params && (req.params.id || req.params.document_id || req.params.documentId)) ||
    (req.body && (req.body.document_id || req.body.id || req.body.documentId)) ||
    (req.query && (req.query.document_id || req.query.id))
  );
}

/* require that the authenticated user is an editor for the document (or the mentor) */
async function requireDocumentEditor(req, res, next) {
  if (!req.user) {
    res.set('X-Auth-Error', 'unauthorized');
    return res.sendStatus(401);
  }

  const documentId = _getDocumentIdFromReq(req);
  if (!documentId) {
    res.set('X-Auth-Error', 'missing-id');
    return res.sendStatus(400);
  }

  try {
    const [rows] = await db.raw(
      'SELECT 1 FROM document_editors WHERE document_id = ? AND user_id = ? LIMIT 1',
      [documentId, req.user.user_id]
    );
    if (rows && rows.length) return next();

    const [docRows] = await db.raw('SELECT mentor_id FROM documents WHERE document_id = ? LIMIT 1', [documentId]);
    if (docRows && docRows[0] && docRows[0].mentor_id === req.user.user_id) return next();

    res.set('X-Auth-Error', 'forbidden');
    return res.sendStatus(403);
  } catch (err) {
    res.set('X-Auth-Error', 'server-error');
    return res.sendStatus(500);
  }
}

/* require that the authenticated user is recorded as mentor for the document */
async function requireMentorForDocument(req, res, next) {
  if (!req.user) {
    res.set('X-Auth-Error', 'unauthorized');
    return res.sendStatus(401);
  }

  const documentId = _getDocumentIdFromReq(req);
  if (!documentId) {
    res.set('X-Auth-Error', 'missing-id');
    return res.sendStatus(400);
  }

  try {
    const [rows] = await db.raw(
      'SELECT 1 FROM document_mentors WHERE document_id = ? AND user_id = ? LIMIT 1',
      [documentId, req.user.user_id]
    );
    if (rows && rows.length) return next();

    const [docRows] = await db.raw('SELECT mentor_id FROM documents WHERE document_id = ? LIMIT 1', [documentId]);
    if (docRows && docRows[0] && docRows[0].mentor_id === req.user.user_id) return next();

    res.set('X-Auth-Error', 'forbidden');
    return res.sendStatus(403);
  } catch (err) {
    res.set('X-Auth-Error', 'server-error');
    return res.sendStatus(500);
  }
}

/* require that the authenticated user has role 'mentor' */
function requireMentor(req, res, next) {
  if (!req.user) {
    res.set('X-Auth-Error', 'unauthorized');
    return res.sendStatus(401);
  }
  if (req.user.role && req.user.role === 'mentor') return next();
  res.set('X-Auth-Error', 'forbidden-role');
  return res.sendStatus(403);
}

/* session-based auth: ensures req.user is populated */
async function requireAuth(req, res, next) {
  try {
    const sessionId = req.cookies && req.cookies.sessionId;
    if (!sessionId) {
      res.set('X-Auth-Error', 'no-session');
      return res.sendStatus(401);
    }

    const [sessions] = await db.raw(
      'SELECT session_id, user_id, session_data, last_activity, expires_at FROM sessions WHERE session_id = ? AND expires_at > NOW()',
      [sessionId]
    );

    if (!sessions || sessions.length === 0) {
      if (res && res.clearCookie) res.clearCookie('sessionId');
      res.set('X-Auth-Error', 'invalid-session');
      return res.sendStatus(401);
    }

    const session = sessions[0];
    let userData;
    try {
      userData = JSON.parse(session.session_data);
    } catch (e) {
      userData = session.session_data;
    }

    await db.raw('UPDATE sessions SET last_activity = NOW() WHERE session_id = ?', [sessionId]);

    req.user = userData;
    req.sessionId = sessionId;
    return next();
  } catch (error) {
    res.set('X-Auth-Error', 'server-error');
    return res.sendStatus(500);
  }
}

/* role-checker factory */
function requireRole(role) {
  return function (req, res, next) {
    if (!req.user) {
      res.set('X-Auth-Error', 'unauthorized');
      return res.sendStatus(401);
    }

    if (req.user.role !== role && req.user.role !== 'admin') {
      res.set('X-Auth-Error', 'insufficient-perms');
      return res.sendStatus(403);
    }

    next();
  };
}

/* optional auth: attempt to populate req.user, but don't fail request */
async function optionalAuth(req, res, next) {
  try {
    const sessionId = req.cookies && req.cookies.sessionId;
    if (!sessionId) {
      req.user = null;
      return next();
    }

    const [sessions] = await db.raw(
      'SELECT session_id, user_id, session_data, last_activity, expires_at FROM sessions WHERE session_id = ? AND expires_at > NOW()',
      [sessionId]
    );

    if (!sessions || sessions.length === 0) {
      if (res && res.clearCookie) res.clearCookie('sessionId');
      req.user = null;
      return next();
    }

    const session = sessions[0];
    let userData;
    try {
      userData = JSON.parse(session.session_data);
    } catch (e) {
      userData = session.session_data;
    }

    await db.raw('UPDATE sessions SET last_activity = NOW() WHERE session_id = ?', [sessionId]);

    req.user = userData;
    req.sessionId = sessionId;
    return next();
  } catch (error) {
    req.user = null;
    return next();
  }
}

module.exports = {
  requireAuth,
  requireRole,
  optionalAuth,
  requireDocumentEditor,
  requireMentorForDocument,
  requireMentor
};