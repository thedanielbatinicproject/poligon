import React, { useState, useEffect } from 'react';
import { useSession } from '../lib/session';
import './home.css';
import { is } from 'date-fns/locale';

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
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);

  // Track screen size for mobile-specific content
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          <p>Poligon is a modern collaborative platform designed for managing academic, group, and personal documents, including theses and projects. Built with technologies such as Node.js and React, it offers a seamless experience for students, mentors (professors), and administrators. One of Poligon’s key advantages is its use of a dedicated service for LaTeX rendering, allowing users to work smoothly without installing a full LaTeX environment locally. {isMobile ? ' (Since you are logged in on a mobile device, only the reduced home page is available in page view.)' : ''}</p>
          <p><strong>Author:</strong> Daniel Batinić</p>
          <p><strong>Contact:</strong> <a href={`mailto:${adminEmail}`}>{adminEmail}</a></p>
          <p><strong>GitHub Repository:</strong> <a href="https://github.com/thedanielbatinicproject/poligon" target="_blank" rel="noopener noreferrer">github.com/thedanielbatinicproject/poligon</a></p>
        </>
      ),
    },
    {
      id: 'themes',
      title: 'Light & Dark Theme',
      content: 'Poligon supports both light and dark themes, which you can switch using the theme toggle in the header navigation. Your selection is saved automatically and persists across sessions. The entire interface adjusts to your chosen theme using CSS variables, ensuring a consistent and unified experience.' + (isMobile ? ' (Note: Theme toggle is not available on mobile devices.)' : ''),
    },
    {
      id: 'playground',
      title: 'LaTeX Playground',
      content:
        'The Poligon Playground allows you to experiment with LaTeX code directly within the platform, providing instant rendering and debugging feedback. It is especially useful for users who want to test LaTeX code without navigating to the /documents page. Currently, the playground is publicly accessible to all users, including guests (non-logged-in users), who have a limit of 15 renders per day. This limit is easily removed by registering locally or logging in via AAI@Edu.hr — registered users can render LaTeX code in the playground without restrictions.' +
        (isMobile
          ? ' (Since you are on mobile, the main menu is not available. You can access the playground by visiting /playground directly or by using Poligon on a desktop device.)'
          : ''),
    },

    {
      id: 'registration',
      title: 'Registration & Authentication',
      forLoggedIn: false,
      content: (
        <>
          <p>Poligon uses <strong>AAI@EduHr authentication</strong> to ensure secure access, while still supporting local registration. To register or log in:</p>
          {isMobile ? '' : (
            <ol>
              <li>Click the <strong>Login</strong> button in the header navigation.</li>
              <li>You will be redirected to the AAI@EduHr authentication portal.</li>
              <li>Sign in using your institutional credentials (university email and password).</li>
              <li>After successful authentication, you will be redirected back to Poligon with an active session.</li>
            </ol>
          )}
          {isMobile ? <p>Please use the desktop version to register or log in.</p> : ''}
          <p>No separate registration is required — your account is automatically created upon your first login using your AAI identity.</p>
          <p>If you register locally, there is no need to worry. Your account will still be linked to your AAI credentials, and the system will not create a duplicate user. Poligon is designed to use email addresses as the primary user identifier.</p>
        </>
      ),
    },
    {
      id: 'roles',
      title: 'User Roles & Permissions',
      forLoggedIn: false,
      content: (
        <>
          <p>Poligon defines three primary user roles:</p>
          <ul>
            <li>
              <strong>Student:</strong> Edit documents created by mentors, collaborate with peers, submit work for review, and monitor task progress.
            </li>
            <li>
              <strong>Mentor:</strong> Create and manage documents, guide students, review submissions, grade work, assign tasks, and oversee document workflows.
            </li>
            <li>
              <strong>Admin:</strong> Access all system features, including user management, document type configuration, storage monitoring, system analytics and more.
            </li>
          </ul>
          <p>Your role is assigned automatically based on your institutional affiliation or manually by an administrator.</p>
          <p>If the system is unable to determine your role, it will assign the default <i>User</i> role to your account upon registration or login.</p>
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
            <li>
              <strong>/profile</strong> – View and update your personal information, manage active sessions, and adjust your preferences.
            </li>
            <li>
              <strong>/playground</strong> – Experiment with the LaTeX rendering engine and other features. This is a simplified version of the main Poligon editor and does not include collaboration, temporary compilations, and several other advanced capabilities.
            </li>
            <li>
              <strong>/documents</strong> – Browse and edit documents you own or those where you have been added as an editor, viewer, or mentor. Most users will spend the majority of their time on this page.
            </li>
            <li>
              <strong>/tasks</strong> – View and manage tasks assigned to you or created by you. Track deadlines and collaborate on work related to your documents.
            </li>
            <li>
              <strong>/mentor</strong> (Mentors only) – Access advanced document management tools, workflow controls, grading features, student oversight, and more.
            </li>
            <li>
              <strong>/admin</strong> (Admins only) – System administration dashboard with user management, storage monitoring, configuration tools, and additional system-level features.
            </li>
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
          <p>To begin working with documents in Poligon:</p>
          <ol>
            <li>
              Ask your mentor to create a document for you (only mentors and administrators are allowed to
              create documents).
            </li>
            <li>
              Navigate to <strong>/documents</strong> using the header menu to access documents shared with
              you.
            </li>
            <li>
              Select a document from the document selector to open the editor. Your selection is saved
              automatically and linked to your session, ensuring it is applied across the entire platform.
            </li>
            <li>
              Edit the LaTeX content and abstract directly in your browser using the integrated editor.
            </li>
            <li>
              Press <strong>CTRL + S</strong> to save your changes. This triggers an automatic server save,
              storing the entire document and merging simultaneous edits from multiple collaborators.
            </li>
            <li>
              Press <strong>CTRL + E</strong> to perform a temporary compile of your document. The PDF
              preview will appear on the right side of the editor. While one user is compiling, others
              cannot start another temporary compile. Once the backend render worker finishes, all connected 
              collaborators automatically receive the updated preview.
            </li>
            <li>
              When you believe your document is ready, click <strong>“Submit for review”</strong>.
              <strong> This disables further editing for users with the “editor” role on that document.</strong> 
              At this stage, the system waits for the mentor to either return the document to draft
              (rejection) or assign a grade (0–100).
            </li>
            <li>
              Your mentor may generate a permanent PDF version of your document at any time. These
              “document versions” are incremental (v1, v2, …). The permanent share link (prototype:
              "https://poligon.live/d/...document-hash...") will always point to the latest permanent
              version.
            </li>
            <li>
              Documents can have several statuses: <em>draft</em> (still being edited), <em>under_review</em> 
              (sent to mentors), <em>graded</em> (reviewed and graded by mentor), <em>submitted</em> (sent to 
              the faculty), and <em>finished</em> (finalized by the faculty).
            </li>
          </ol>
        </>
      ),

    },
    {
      id: 'latex-editor',
      title: 'LaTeX Editor & Compilation',
      forLoggedIn: true,
      content: (
      <>
        <p>Poligon features a powerful LaTeX editor with real-time editing and compilation:</p>
        <ul>
          <li>
            <strong>Syntax Highlighting:</strong> Code is highlighted for improved readability and adapts
            automatically to the selected light or dark theme.
          </li>
          <li>
            <strong>Auto-save:</strong> Your work will be saved automatically when the system detects
            significant changes <i>(feature coming soon)</i>.
          </li>
          <li>
            <strong>Compile to PDF:</strong> Click the compile button to generate a temporary PDF preview
            of your document.
          </li>
          <li>
            <strong>Version History:</strong> Each permanent compilation performed by a mentor creates a
            version snapshot that you can restore at any time.
          </li>
          <li>
            <strong>File Uploads:</strong> Upload images, bibliography files, and other resources to use
            within your document.
          </li>
          <li>
            <strong>\insertimage:</strong> This autocomplete command allows you to quickly insert
            uploaded images directly into your LaTeX document.
          </li>
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
          <p>Poligon enables <strong>live multi-user editing</strong> for documents:</p>
          <ul>
            <li><strong>Live Cursors:</strong> View the real-time editing locations of other collaborators.</li>
            <li><strong>Presence Indicators:</strong> See who is currently viewing or editing the document.</li>
            <li><strong>Conflict-Free Sync:</strong> Changes from multiple users are merged automatically without conflicts.</li>
            <li><strong>Document Editors:</strong> Add mentors, peers, or reviewers as editors or viewers with configurable permission levels.</li>
          </ul>
          <p>
            To add or remove collaborators, only document owners (creators), mentors, or system administrators
            can manage editors via the <strong>Change Document Editors</strong> panel.
          </p>
        </>
      ),
    },
    {
      id: 'tasks',
      title: 'Task Management',
      forLoggedIn: true,
      content: (
        <>
          <p>Tasks help organize work and track deadlines:</p>
          <ul>
            <li>
              <strong>Create Tasks:</strong> Go to <strong>/tasks</strong> and use the <em>Create New Task</em> form.
            </li>
            <li>
              <strong>Assign Tasks:</strong> Mentors and administrators can assign tasks to others, while
              students can create tasks for themselves.
            </li>
            <li>
              <strong>Link to Documents:</strong> Associate tasks with specific documents for better organization.
            </li>
            <li>
              <strong>Track Progress:</strong> Mark tasks as open or closed, and view them in calendar or list view.
            </li>
            <li>
              <strong>Edit & Delete:</strong> Task creators, mentors, and administrators can edit or delete tasks. 
              Assigned users can only update task status.
            </li>
          </ul>
        </>
      ),
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
            <li><strong>Real-Time Messaging:</strong> Messages are delivered instantly via the WebSocket server at <i>socket.poligon.live</i>.</li>
            <li><strong>Persistent History:</strong> All messages are saved and accessible across all user sessions.</li>
            <li><strong>Draggable Widget:</strong> Move the chat widget anywhere on the screen, or click it to collapse it into a small tab.</li>
            <li><strong>Disable Chat:</strong> Hide the chat widget by visiting the <strong>/profile</strong> page and toggling the chat visibility option.</li>
          </ul>
          <p>Access the chat widget through the floating icon in the bottom-right corner of the screen (available on all pages except mobile).</p>
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
            <li><strong>Draft:</strong> Initial state; the document is being written and edited.</li>
            <li><strong>Under Review:</strong> The student submits the document for mentor review (from draft status).</li>
            <li><strong>Finished:</strong> The document is complete and ready for grading (status set by mentor).</li>
            <li><strong>Graded:</strong> The mentor has assigned a final grade to the document.</li>
          </ul>
          <p>
            Students can submit documents for review, while mentors manage all other status changes
            via the <strong>/mentor</strong> panel. Each status change is recorded in the workflow history
            for full traceability.
          </p>
        </>
      ),
    },
    {
      id: 'mobile',
      title: 'Mobile Compatibility',
      content: (
        <>
          <p>
            This Home page is fully responsive and optimized for mobile devices. However, most other pages
            (editor, tasks, mentor panel, admin) are designed primarily for desktop use due to their
            complexity.
          </p>
          <p>On mobile devices:</p>
          <ul>
            <li>The main navigation menu is hidden to improve readability.</li>
            <li>Content is stacked vertically and optimized for touch interactions.</li>
            <li>The chat widget is disabled to conserve screen space.</li>
          </ul>
          <p>
            For the best experience, we recommend accessing Poligon from a desktop or laptop computer.
          </p>
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
        <h1 className="home-title">{isMobile ? 'Welcome to Poligon' : 'Poligon'}</h1>
        <p className="home-subtitle">Collaborative LaTeX Document Management Platform</p>
        {!isLoggedIn && (
          <p className="home-cta">
            {isMobile 
              ? 'This is a simplified mobile view of the Poligon platform. For full functionality, please log in via a desktop browser. You can explore the platform details below.'
              : 'Get started by logging in with your AAI@EduHr credentials'}
          </p>
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