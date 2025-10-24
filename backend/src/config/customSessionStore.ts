// src/config/customSessionStore.ts

import session from 'express-session';

import {
  getSessionById,
  upsertSession,
  deleteSessionById,
  touchSessionById
} from '../services/session.service';


class CustomSessionStore extends session.Store {

  constructor() {
    super();
  }

  async get(sid: string, callback: (err: any, session?: any) => void) {
    try {
      const session = await getSessionById(sid);
      callback(null, session);
    } catch (err) {
      callback(err);
    }
  }

  async set(sid: string, sessionData: any, callback: (err?: any) => void) {
    try {
      await upsertSession(sid, sessionData);
      callback();
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid: string, callback: (err?: any) => void) {
    try {
      await deleteSessionById(sid);
      callback();
    } catch (err) {
      callback(err);
    }
  }

  async touch(sid: string, sessionData: any, callback: (err?: any) => void) {
    try {
      await touchSessionById(sid, sessionData);
      callback();
    } catch (err) {
      callback(err);
    }
  }
}

export default CustomSessionStore;