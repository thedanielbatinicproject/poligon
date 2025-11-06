/**
 * HTML error templates for public document sharing endpoints.
 * These are served directly without loading the React frontend.
 * Features responsive design and navigation back to main site.
 */

const baseStyle = `
  * {
    box-sizing: border-box;
  }
  html {
    font-size: 16px;
  }
  body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    margin: 0;
    padding: 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f5f5f5;
  }
  .container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5vh 5vw;
  }
  .error { 
    background: white; 
    padding: 3rem 2.5rem; 
    border-radius: 0.75rem; 
    max-width: 40rem;
    width: 100%;
    box-shadow: 0 0.25rem 1.25rem rgba(0,0,0,0.15);
    text-align: center;
  }
  .code { 
    font-size: clamp(4rem, 10vw, 6rem);
    font-weight: bold; 
    color: #e74c3c; 
    margin: 0;
    line-height: 1;
  }
  h1 { 
    color: #333; 
    margin: 1.5rem 0 0.75rem;
    font-size: clamp(1.5rem, 4vw, 1.75rem);
    font-weight: 600;
  }
  p { 
    color: #666;
    font-size: clamp(1rem, 2.5vw, 1.125rem);
    line-height: 1.6;
    margin: 0.75rem 0;
  }
  .btn {
    display: inline-block;
    margin-top: 1.5rem;
    padding: clamp(0.875rem, 2vh, 1rem) clamp(2rem, 5vw, 2.5rem);
    background: #3498db;
    color: white;
    text-decoration: none;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: clamp(1rem, 2.5vw, 1.125rem);
    transition: background 0.2s;
    min-height: 3rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .btn:hover {
    background: #2980b9;
  }
  .btn:active {
    transform: scale(0.98);
  }
  footer {
    background: #333;
    color: #aaa;
    padding: clamp(1.25rem, 3vh, 2rem) clamp(1rem, 3vw, 2rem);
    text-align: center;
    font-size: clamp(0.875rem, 2vw, 1rem);
    line-height: 1.6;
  }
  footer a {
    color: #3498db;
    text-decoration: none;
    word-break: break-all;
  }
  footer a:hover {
    text-decoration: underline;
  }
  
  @media (max-width: 768px) {
    .container {
      padding: 3vh 4vw;
    }
    .error {
      padding: 2.5rem 1.5rem;
      border-radius: 0.5rem;
    }
    .btn {
      width: 100%;
      max-width: 20rem;
      padding: 1rem 1.5rem;
      min-height: 3.5rem;
    }
  }
  
  @media (max-width: 480px) {
    html {
      font-size: 14px;
    }
    .container {
      padding: 2vh 3vw;
    }
    .error {
      padding: 2rem 1.25rem;
    }
    .code {
      font-size: clamp(3.5rem, 12vw, 4.5rem);
    }
    .btn {
      width: 100%;
      padding: 1.125rem 1.25rem;
      min-height: 3.75rem;
      font-size: 1.125rem;
    }
    footer {
      padding: 1.5rem 1rem;
    }
  }
  
  @media (max-height: 600px) and (orientation: landscape) {
    .container {
      padding: 2vh 5vw;
    }
    .error {
      padding: 1.5rem 2rem;
    }
    .code {
      font-size: 3.5rem;
    }
    h1 {
      margin: 1rem 0 0.5rem;
      font-size: 1.25rem;
    }
    p {
      font-size: 0.95rem;
      margin: 0.5rem 0;
    }
    .btn {
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      min-height: 2.5rem;
    }
  }
`;

function createErrorPage(code: number | string, title: string, description: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${code} - ${title}</title>
      <style>${baseStyle}</style>
    </head>
    <body>
      <div class="container">
        <div class="error">
          <div class="code">${code}</div>
          <h1>${title}</h1>
          <p>${description}</p>
          <a href="https://poligon.live" class="btn">RETURN TO HOME</a>
        </div>
      </div>
      <footer>
        <p>There was an error in the backend. If you're searching for frontend, all you have to do is type <a href="https://poligon.live">https://poligon.live</a> (or click on this link :D).</p>
      </footer>
    </body>
    </html>
  `;
}

export const ErrorTemplates = {
  invalidLink: () => createErrorPage(
    404,
    'Invalid Document Link',
    'The document link you followed is invalid or has expired.'
  ),

  documentNotFound: (documentId: number) => createErrorPage(
    404,
    'Document Not Found',
    `Document with ID ${documentId} does not exist in the database.`
  ),

  noRenders: (documentId: number) => createErrorPage(
    404,
    'Document Render Not Found',
    `Document with ID ${documentId} has no renders in database!`
  ),

  pdfNotAvailable: (documentId: number) => createErrorPage(
    404,
    'PDF Not Available',
    `Document ${documentId}'s most recent version contains a record of compiled documents, but no such document was found on the backend!`
  ),

  serverError: () => createErrorPage(
    500,
    'Server Error',
    'Failed to process document request. Please try again later.'
  )
};
