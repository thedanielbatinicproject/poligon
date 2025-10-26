# Frontend Modes and Roles

The Poligon frontend operates in four distinct modes based on user authentication and role:

- **Visitor**: Unauthenticated user. Can only view public pages and information. No access to protected features.
- **Student**: Authenticated user with the role 'student' or 'user'. Can access personal documents, submit work, and communicate with mentors.
- **Mentor**: Authenticated user with the role 'mentor'. Can review student submissions, provide feedback, and manage assigned documents.
- **Admin**: Authenticated user with the role 'admin'. Has full access to all features, user management, and system settings.

Role detection is handled after login and determines available navigation, features, and permissions throughout the app.



## Session & Role Management

The frontend uses a custom React hook (`useSession`) to fetch user and session info from `/api/status` on page load. Key session data (user_id, name, email, role, theme, sidebar state) is stored in a browser cookie (`poligon_info`) for fast UI personalization and access control. If the user is not logged in, the cookie is cleared and the app operates in visitor mode.

This system ensures robust, scalable session management and role-based rendering across all frontend modes.

## Global Font Usage

The frontend uses three custom fonts, applied globally via Chakra UI theme:

- **Playfair Display**: Used for headings and titles
- **Source Sans Pro**: Used for body text and paragraphs
- **Open Sans**: Used for descriptions and supporting text

Font files are located in `/src/assets/fonts/` and loaded via `@font-face` in the main CSS file. The Chakra UI theme is configured to use these fonts for the appropriate text styles, ensuring a consistent look across the application.
