import React, { useState } from 'react';
import { useSession } from '../lib/session';
import './home.css';

interface AccordionItem {
  id: string;
  title: string;
  content: string | JSX.Element;
  forLoggedIn?: boolean; // if true, only show when logged in; if false, only when logged out; if undefined, show always
}

export default function Home(): JSX.Element {
  const { session } = useSession();
  const isLoggedIn = !!session?.user_id;
  const [openCard, setOpenCard] = useState<string | null>(null);

  const adminEmail = import.meta.env.VITE_ADMIN_MAIL || 'daniel.batinic@fer.hr';

  const toggleCard = (id: string) => {
    setOpenCard(prev => prev === id ? null : id);
  };

  const items: AccordionItem[] = [
    {
      id: 'intro',
      title: 'Welcome to Poligon',
      content: (
        <>
          <p>Poligon is a modern collaborative platform for managing academic documents, theses, and projects. Built with cutting-edge web technologies, it provides a seamless experience for students, mentors, and administrators.</p>
          <p><strong>Author:</strong> Daniel Batinić</p>
          <p><strong>Contact:</strong> <a href={`mailto:${adminEmail}`}>{adminEmail}</a></p>
          <p><strong>GitHub Repository:</strong> <a href="https://github.com/thedanielbatinicproject/poligon" target="_blank" rel="noopener noreferrer">github.com/thedanielbatinicproject/poligon</a></p>
        </>
      ),
    },
    {
      id: 'themes',
      title: 'Light & Dark Theme',
      content: 'Poligon supports both light and dark themes. Toggle between them using the theme switcher in the header navigation. Your preference is automatically saved and persists across sessions. The entire interface adapts to your chosen theme using CSS variables for a consistent experience.',
    },
    {
      id: 'registration',
      title: 'Registration & Authentication',
      forLoggedIn: false,
      content: (
        <>
          <p>Poligon uses <strong>AAI@EduHr authentication</strong> for secure access. To register or log in:</p>
          <ol>
            <li>Click the <strong>Login</strong> button in the header navigation.</li>
            <li>You will be redirected to the AAI@EduHr portal.</li>
            <li>Sign in using your institutional credentials (university email and password).</li>
            <li>After successful authentication, you will be redirected back to Poligon with an active session.</li>
          </ol>
          <p>No separate registration is required - your account is automatically created on first login using your AAI identity.</p>
        </>
      ),
    },
    {
      id: 'roles',
      title: 'User Roles & Permissions',
      forLoggedIn: false,
      content: (
        <>
          <p>Poligon has three main user roles:</p>
          <ul>
            <li><strong>Student:</strong> Edit documents created by mentors, collaborate with peers, submit work for review, and track task progress.</li>
            <li><strong>Mentor:</strong> Create and manage documents, guide students, review submissions, grade work, assign tasks, and control document workflows.</li>
            <li><strong>Admin:</strong> Full system access including user management, document type configuration, storage monitoring, and system statistics.</li>
          </ul>
          <p>Your role is assigned automatically based on your institutional affiliation or manually by an administrator.</p>
        </>
      ),
    },
    {
      id: 'navigation',
      title: 'Platform Navigation',
      forLoggedIn: false,
      content: (
        <>
          <p>After logging in, you will have access to the following pages:</p>
          <ul>
            <li><strong>/profile</strong> - View and edit your personal information, manage sessions, and update preferences.</li>
            <li><strong>/documents</strong> - Browse and edit documents you own or have been added to as an editor, viewer, or mentor.</li>
            <li><strong>/tasks</strong> - View and manage tasks assigned to you or created by you. Track deadlines and collaborate on document-related work.</li>
            <li><strong>/mentor</strong> (Mentors only) - Advanced document management, workflow control, grading, and student oversight.</li>
            <li><strong>/admin</strong> (Admins only) - System administration dashboard with user management, storage monitoring, and configuration tools.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'getting-started',
      title: 'Getting Started with Documents',
      forLoggedIn: true,
      content: (
        <>
          <p>To start working with documents in Poligon:</p>
          <ol>
            <li>Ask your mentor to create a document for you (only mentors and administrators can create documents).</li>
            <li>Navigate to <strong>/documents</strong> from the header menu to access documents shared with you.</li>
            <li>Select a document from the dropdown to start editing.</li>
            <li>Edit LaTeX content and abstract directly in the browser using the integrated editor.</li>
            <li>Your mentor can compile your document to PDF using the built-in LaTeX rendering service.</li>
            <li>When ready, submit your document for review using the <strong>Submit for Review</strong> button.</li>
          </ol>
        </>
      )
    },
    {
      id: 'latex-editor',
      title: 'LaTeX Editor & Compilation',
      forLoggedIn: true,
      content: (
        <>
          <p>Poligon includes a powerful LaTeX editor with real-time editing and compilation:</p>
          <ul>
            <li><strong>Syntax Highlighting:</strong> Code is highlighted for better readability.</li>
            <li><strong>Auto-save:</strong> Your work is automatically saved as you type.</li>
            <li><strong>Compile to PDF:</strong> Click the compile button to generate a PDF preview of your document.</li>
            <li><strong>Version History:</strong> Every compilation creates a version snapshot that you can restore later.</li>
            <li><strong>File Uploads:</strong> Upload images, bibliography files, and other resources to use in your document.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'collaboration',
      title: 'Real-Time Collaboration',
      forLoggedIn: true,
      content: (
        <>
          <p>Poligon supports <strong>live multi-user editing</strong> for documents:</p>
          <ul>
            <li><strong>Live Cursors:</strong> See where other collaborators are editing in real-time.</li>
            <li><strong>Presence Indicators:</strong> Know who is currently viewing or editing the document.</li>
            <li><strong>Conflict-Free Sync:</strong> Changes from multiple users are merged automatically without conflicts.</li>
            <li><strong>Document Editors:</strong> Add mentors, peers, or reviewers as editors or viewers with different permission levels.</li>
          </ul>
          <p>To add or remove collaborators: Only document owners (creators) or administrators can manage editors via the <strong>Change Document Editors</strong> panel.</p>
        </>
      ),
    },
    {
      id: 'tasks',
      title: 'Task Management',
      forLoggedIn: true,
      content: (
        <>
          <p>Tasks help organize work and deadlines:</p>
          <ul>
            <li><strong>Create Tasks:</strong> Navigate to <strong>/tasks</strong> and use the <em>Create New Task</em> form.</li>
            <li><strong>Assign Tasks:</strong> Mentors and administrators can assign tasks to others. Students can create tasks for themselves.</li>
            <li><strong>Link to Documents:</strong> Associate tasks with specific documents for better organization.</li>
            <li><strong>Track Progress:</strong> Mark tasks as open or closed. View tasks on a calendar or list view.</li>
            <li><strong>Edit & Delete:</strong> Task creators, mentors, and administrators can edit or delete tasks. Assigned users can change task status.</li>
          </ul>
        </>
      )
    },
    {
      id: 'live-chat',
      title: 'Live Chat & Messaging',
      forLoggedIn: true,
      content: (
        <>
          <p>Poligon includes a built-in <strong>live chat widget</strong> for instant communication:</p>
          <ul>
            <li><strong>User Search:</strong> Find any user by name or email to start a conversation.</li>
            <li><strong>Real-Time Messages:</strong> Messages are delivered instantly using WebSocket technology.</li>
            <li><strong>Persistent History:</strong> All messages are stored and accessible across sessions.</li>
            <li><strong>Draggable Widget:</strong> Move the chat widget anywhere on the screen for convenience.</li>
          </ul>
          <p>Access the chat widget from the floating chat icon in the bottom-right corner of the screen (available on all pages except mobile).</p>
        </>
      ),
    },
    {
      id: 'workflow',
      title: 'Document Workflow & Status',
      forLoggedIn: true,
      content: (
        <>
          <p>Documents progress through a structured workflow:</p>
          <ul>
            <li><strong>Draft:</strong> Initial state. The document is being written and edited.</li>
            <li><strong>Under Review:</strong> Student submits the document for mentor review (submitted from draft status).</li>
            <li><strong>Finished:</strong> Document is complete and ready for grading (mentor can set this status).</li>
            <li><strong>Graded:</strong> Final grade has been assigned by the mentor.</li>
          </ul>
          <p>Students can submit documents for review. Mentors control other status changes from the <strong>/mentor</strong> panel. Each status change is logged in the workflow history for full traceability.</p>
        </>
      ),
    },
    {
      id: 'mobile',
      title: 'Mobile Compatibility',
      content: (
        <>
          <p>This Home page is fully responsive and optimized for mobile devices. However, most other pages (editor, tasks, mentor panel, admin) are designed for desktop use due to their complexity.</p>
          <p>On mobile devices:</p>
          <ul>
            <li>The main navigation menu is hidden for better readability.</li>
            <li>Content is stacked vertically and touch-optimized.</li>
            <li>The chat widget is disabled to preserve screen space.</li>
          </ul>
          <p>For the best experience, we recommend using Poligon on a desktop or laptop computer.</p>
        </>
      ),
    },
    {
      id: 'support',
      title: 'Need Help?',
      content: (
        <>
          <p>If you encounter issues or have questions:</p>
          <ul>
            <li>Contact the platform administrator at <a href={`mailto:${adminEmail}`}>{adminEmail}</a></li>
            <li>Check the GitHub repository for documentation and issue tracking: <a href="https://github.com/thedanielbatinicproject/poligon" target="_blank" rel="noopener noreferrer">github.com/thedanielbatinicproject/poligon</a></li>
            <li>Review this guide for answers to common questions.</li>
          </ul>
        </>
      ),
    },
  ];

  // Filter items based on login state
  const filteredItems = items.filter(item => {
    if (item.forLoggedIn === true) return isLoggedIn;
    if (item.forLoggedIn === false) return !isLoggedIn;
    return true; // show if forLoggedIn is undefined
  });

  return (
    <div className="home-container">
      <div className="home-hero">
        <h1 className="home-title">Poligon</h1>
        <p className="home-subtitle">Collaborative Document Management Platform</p>
        {!isLoggedIn && (
          <p className="home-cta">Get started by logging in with your AAI@EduHr credentials</p>
        )}
      </div>

      <div className="home-accordion">
        {filteredItems.map(item => (
          <div key={item.id} className={`accordion-card ${openCard === item.id ? 'open' : ''}`}>
            <button
              className="accordion-header"
              onClick={() => toggleCard(item.id)}
              aria-expanded={openCard === item.id}
            >
              <span className="accordion-title">{item.title}</span>
              <span className="accordion-icon">{openCard === item.id ? '−' : '+'}</span>
            </button>
            <div className="accordion-content">
              <div className="accordion-body">
                {typeof item.content === 'string' ? <p>{item.content}</p> : item.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      <footer className="home-footer">
        <p>Built with React, TypeScript, Node.js, and MySQL</p>
        <p>&copy; {new Date().getFullYear()} Poligon. All rights reserved.</p>
      </footer>
    </div>
  );
}