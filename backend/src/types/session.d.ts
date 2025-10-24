import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user_id?: number;
    last_route?: string;
    last_document_id?: number;
    editor_cursor_position?: number;
    editor_scroll_line?: number;
    scroll_position?: number;
    sidebar_state?: 'open' | 'closed';
    theme?: 'light' | 'dark' | 'auto';
    user_agent?: string;
    ip_address?: string;
    created_at?: Date | string;
    last_activity?: Date | string;
    expires_at?: Date | string;
    // ...add more if needed
    [key: string]: any; // allows to add additional attributes in the future
  }
}