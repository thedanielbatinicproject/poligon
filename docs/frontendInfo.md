

# Frontend Page Access and Roles

## Page List and Access Rules

- **Home.tsx** (`/`)
  - Access: All visitors (anyone who opens the website)

- **Profile.tsx** (`/profile`)
  - Access: All authenticated users (regardless of role)

- **Documents.tsx** (`/documents`)
  - Access: All authenticated users

- **Files.tsx** (`/files`)
  - Access: All authenticated users

- **Tasks.tsx** (`/tasks`)
  - Access: All authenticated users

- **AdminPanel.tsx** (`/admin`)
  - Access: Only authenticated users with role = admin

- **MentorPanel.tsx** (`/mentor`)
  - Access: Only authenticated users with role = mentor

- **NotFound.tsx** (`*`)
  - Access: Functional page, rendered for errors or non-existent routes

## Role-based Navigation

- **Visitor**: Access only to Home page
- **User/Student**: Access to Home, Profile, Documents, Files, Tasks
- **Mentor**: Access to Home, Profile, Documents, Files, Tasks, MentorPanel
- **Admin**: Access to Home, Profile, Documents, Files, Tasks, AdminPanel

Login and role detection is handled via a custom React hook (`useSession`) which fetches data from `/api/status` and stores it in the `poligon_info` cookie.

Based on the user's role, the frontend renders the appropriate pages and navigation.

## Global Font Usage

The frontend uses three custom fonts, defined in global styles:
- **Playfair Display**: Headings
- **Source Sans Pro**: Body text
- **Open Sans**: Descriptions

Font files are located in `/src/assets/fonts/` and loaded via `@font-face` in the main CSS file.
