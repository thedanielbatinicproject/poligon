/**
 * HTML error templates for public document sharing endpoints.
 * These are served directly without loading the React frontend.
 */

const baseStyle = `
  body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    text-align: center; 
    padding: 50px; 
    background: #f5f5f5;
    margin: 0;
  }
  .error { 
    background: white; 
    padding: 40px; 
    border-radius: 8px; 
    display: inline-block; 
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    max-width: 500px;
  }
  .code { 
    font-size: 72px; 
    font-weight: bold; 
    color: #e74c3c; 
    margin: 0;
    line-height: 1;
  }
  h1 { 
    color: #333; 
    margin: 20px 0 10px;
    font-size: 24px;
  }
  p { 
    color: #666;
    font-size: 16px;
    line-height: 1.5;
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
      <div class="error">
        <div class="code">${code}</div>
        <h1>${title}</h1>
        <p>${description}</p>
      </div>
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
    `Latest version of document ${documentId} has no compiled PDF.`
  ),

  serverError: () => createErrorPage(
    500,
    'Server Error',
    'Failed to process document request. Please try again later.'
  )
};
