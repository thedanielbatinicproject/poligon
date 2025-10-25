# Frontend Modes and Roles

The Poligon frontend operates in four distinct modes based on user authentication and role:

- **Visitor**: Unauthenticated user. Can only view public pages and information. No access to protected features.
- **Student**: Authenticated user with the role 'student' or 'user'. Can access personal documents, submit work, and communicate with mentors.
- **Mentor**: Authenticated user with the role 'mentor'. Can review student submissions, provide feedback, and manage assigned documents.
- **Admin**: Authenticated user with the role 'admin'. Has full access to all features, user management, and system settings.

Role detection is handled after login and determines available navigation, features, and permissions throughout the app.

Further details on UI and feature restrictions for each mode will be documented as the frontend is developed.
