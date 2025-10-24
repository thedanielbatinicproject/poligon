export interface User {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: 'user' | 'student' | 'mentor' | 'admin';
  preferred_language: 'hr' | 'en';
  created_at: Date | string;
  updated_at: Date | string;
}