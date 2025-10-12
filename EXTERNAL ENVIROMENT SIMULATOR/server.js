const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { SignedXml } = require('xml-crypto');
const fs = require('fs');
const path = require('path');
const forge = require('node-forge');

const app = express();
const PORT = 4000;

// Generate or load RSA key pair for signing
const KEYS_DIR = path.join(__dirname, 'keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public.pem');
const CERT_PATH = path.join(KEYS_DIR, 'cert.pem');

let privateKey, publicKey, certificate;

function initializeKeys() {
    if (!fs.existsSync(KEYS_DIR)) {
        fs.mkdirSync(KEYS_DIR);
    }
    
    if (!fs.existsSync(PRIVATE_KEY_PATH) || !fs.existsSync(PUBLIC_KEY_PATH) || !fs.existsSync(CERT_PATH)) {
        console.log('[SIMULATOR] Generating RSA key pair and X.509 certificate...');
        
        // Generate RSA key pair using node-forge
        const keys = forge.pki.rsa.generateKeyPair(2048);
        
        // Create X.509 certificate
        const cert = forge.pki.createCertificate();
        cert.publicKey = keys.publicKey;
        cert.serialNumber = '01';
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);
        
        const attrs = [{
            name: 'commonName',
            value: 'AAI@EduHr Simulator'
        }, {
            name: 'countryName',
            value: 'HR'
        }, {
            shortName: 'ST',
            value: 'Zagreb'
        }, {
            name: 'localityName',
            value: 'Zagreb'
        }, {
            name: 'organizationName',
            value: 'SRCE Simulator'
        }, {
            shortName: 'OU',
            value: 'Development'
        }];
        
        cert.setSubject(attrs);
        cert.setIssuer(attrs);
        
        // Self-sign certificate
        cert.sign(keys.privateKey, forge.md.sha256.create());
        
        // Convert to PEM format
        const privKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
        const pubKeyPem = forge.pki.publicKeyToPem(keys.publicKey);
        const certPem = forge.pki.certificateToPem(cert);
        
        // Save to files
        fs.writeFileSync(PRIVATE_KEY_PATH, privKeyPem);
        fs.writeFileSync(PUBLIC_KEY_PATH, pubKeyPem);
        fs.writeFileSync(CERT_PATH, certPem);
        
        console.log('[SIMULATOR] Keys and certificate generated successfully');
    }
    
    privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
    publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
    certificate = fs.readFileSync(CERT_PATH, 'utf8');
    
    // Extract base64 cert without headers for XML
    const certBase64 = certificate
        .replace(/-----BEGIN CERTIFICATE-----/, '')
        .replace(/-----END CERTIFICATE-----/, '')
        .replace(/\n/g, '')
        .replace(/\r/g, '');
    
    // ALWAYS export certificate to file on every startup
    const exportCertPath = path.join(__dirname, 'saml_cert_for_dotenv.txt');
    const exportContent = `# Copy this certificate to your .env file
# Location: main project .env file
# Variable: AAIEDUHR_SAML_CERT

${certBase64}

# Full certificate (for reference):
${certificate}

# Instructions:
# 1. Copy the base64 string above (without headers/footers)
# 2. Paste it into .env as: AAIEDUHR_SAML_CERT=${certBase64.substring(0, 50)}...
# 3. Restart your main application server
`;
    
    fs.writeFileSync(exportCertPath, exportContent);
    
    console.log('\n[SIMULATOR] ===================================');
    console.log('[SIMULATOR] Certificate exported to:');
    console.log('[SIMULATOR] ' + exportCertPath);
    console.log('[SIMULATOR] ===================================');
    console.log('[SIMULATOR] Base64 certificate:');
    console.log(certBase64);
    console.log('[SIMULATOR] ===================================\n');
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Initialize keys on startup
initializeKeys();

// Serve login form
app.get('/simplesaml/saml2/idp/SSOService.php', (req, res) => {
    const relayState = req.query.RelayState || '';
    const samlRequest = req.query.SAMLRequest || '';
    
    res.send(`
        <!DOCTYPE html>
        <html lang="hr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AAI@EduHr Simulator - Prijava</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .login-container {
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    max-width: 400px;
                    width: 100%;
                }
                .logo {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .logo h1 {
                    color: #667eea;
                    font-size: 24px;
                    margin-bottom: 5px;
                }
                .logo p {
                    color: #666;
                    font-size: 12px;
                }
                .simulator-badge {
                    background: #ff6b6b;
                    color: white;
                    padding: 5px 10px;
                    border-radius: 5px;
                    font-size: 11px;
                    display: inline-block;
                    margin-top: 10px;
                    font-weight: bold;
                }
                .form-group {
                    margin-bottom: 20px;
                }
                label {
                    display: block;
                    margin-bottom: 8px;
                    color: #333;
                    font-weight: 500;
                }
                input {
                    width: 100%;
                    padding: 12px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    font-size: 14px;
                    transition: border-color 0.3s;
                }
                input:focus {
                    outline: none;
                    border-color: #667eea;
                }
                .required {
                    color: #ff6b6b;
                }
                button {
                    width: 100%;
                    padding: 12px;
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.3s;
                }
                button:hover {
                    background: #5568d3;
                }
                .info {
                    margin-top: 20px;
                    padding: 15px;
                    background: #f0f4ff;
                    border-left: 4px solid #667eea;
                    border-radius: 5px;
                    font-size: 13px;
                    color: #555;
                }
                .info strong {
                    color: #667eea;
                }
                .warning {
                    margin-top: 20px;
                    padding: 20px;
                    background: #fff3e0;
                    border: 3px solid #ff6b6b;
                    border-radius: 5px;
                    font-size: 13px;
                    color: #333;
                    line-height: 1.6;
                }
                .warning strong {
                    color: #d32f2f;
                    font-weight: 700;
                }
                .warning code {
                    background: #ffebee;
                    padding: 3px 8px;
                    border-radius: 3px;
                    font-family: 'Courier New', monospace;
                    color: #c62828;
                    font-weight: 600;
                }
            </style>
        </head>
        <body>
            <div class="login-container">
                <div class="logo">
                    <h1>AAI@EduHr</h1>
                    <p>Hrvatska akademska i istraživačka infrastruktura za identitet</p>
                    <span class="simulator-badge">SIMULATOR ZA TESTIRANJE</span>
                </div>
                
                <form action="/simplesaml/saml2/idp/login" method="POST">
                    <input type="hidden" name="RelayState" value="${relayState}">
                    <input type="hidden" name="SAMLRequest" value="${samlRequest}">
                    
                    <div class="form-group">
                        <label for="email">Email adresa <span class="required">*</span></label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            placeholder="ime.prezime@fer.hr" 
                            required
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Lozinka (opcionalno za simulator)</label>
                        <input 
                            type="password" 
                            id="password" 
                            name="password" 
                            placeholder="Bilo koja lozinka ili prazno"
                        >
                    </div>
                    
                    <button type="submit">Prijavi se</button>
                    
                    <div class="info">
                        <strong>Simulator info:</strong><br>
                        Email se parsira automatski (ime.prezime@domena.hr).<br>
                        Lozinka nije obavezna i ne provjerava se.
                    </div>
                    
                    <div class="warning">
                        <strong>UPOZORENJE - OVO JE SIMULATOR!</strong><br><br>
                        Ova stranica simulira AAI@EduHr autentikaciju <strong>samo za potrebe razvoja i testiranja</strong>.<br><br>
                        <strong style="color: #d32f2f;">Lozinka se NE šalje na backend i NE provjerava se!</strong><br>
                        Bilo koja email adresa će biti prihvaćena bez provjere autentičnosti.<br><br>
                        U produkcijskom okruženju koristite pravi AAI@EduHr sustav na:<br>
                        <code>https://login.aaiedu.hr</code>
                    </div>
                </form>
            </div>
        </body>
        </html>
    `);
});

// Handle login and send SAML response
app.post('/simplesaml/saml2/idp/login', (req, res) => {
    const email = req.body.email;
    const relayState = req.body.RelayState || '';
    
    // Parse email: ime.prezime@domena.hr
    const emailParts = email.split('@');
    const localPart = emailParts[0]; // ime.prezime
    const domain = emailParts[1] || 'unknown.hr'; // domena.hr
    
    // Split ime.prezime
    const nameParts = localPart.split('.');
    let firstName = 'Nepoznato';
    let lastName = 'Ime';
    
    if (nameParts.length >= 2) {
        firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();
        lastName = nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1).toLowerCase();
    } else if (nameParts.length === 1) {
        firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();
    }
    
    const fullName = `${firstName} ${lastName}`;
    
    // Generate SAML Response (simplified, without actual XML signing)
    const samlResponse = createSamlResponse({
        cn: fullName,
        givenName: firstName,
        sn: lastName,
        mail: email,
        hrEduPersonGender: 'M', // Default for simulator
        eduPersonAffiliation: 'student' // Default role
    });
    
    // Send POST back to callback URL
    const callbackUrl = 'http://localhost:3000/api/auth/callback/aaieduhr';
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>AAI@EduHr Simulator - Preusmjeravanje</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    margin: 0;
                }
                .message {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    text-align: center;
                }
                .message h2 {
                    color: #667eea;
                    margin-bottom: 10px;
                }
                .spinner {
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #667eea;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 20px auto;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        </head>
        <body>
            <div class="message">
                <h2>Prijava uspješna!</h2>
                <p>Preusmjeravanje na aplikaciju...</p>
                <div class="spinner"></div>
                <p style="color: #666; font-size: 12px; margin-top: 20px;">
                    Korisnik: ${fullName}<br>
                    Email: ${email}
                </p>
            </div>
            <form id="samlForm" action="${callbackUrl}" method="POST">
                <input type="hidden" name="SAMLResponse" value="${samlResponse}">
                <input type="hidden" name="RelayState" value="${relayState}">
            </form>
            <script>
                setTimeout(function() {
                    document.getElementById('samlForm').submit();
                }, 2000);
            </script>
        </body>
        </html>
    `);
});

// Create SAML Response XML WITHOUT signature (for development/testing only)
function createSamlResponse(attributes) {
    const now = new Date().toISOString();
    const notOnOrAfter = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
    const assertionId = '_' + crypto.randomBytes(16).toString('hex');
    const responseId = '_' + crypto.randomBytes(16).toString('hex');
    
    // Build UNSIGNED SAML Response (simulator mode - no signature validation needed)
    const samlXml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" 
                xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" 
                ID="${responseId}" 
                Version="2.0" 
                IssueInstant="${now}" 
                Destination="http://localhost:3000/api/auth/callback/aaieduhr">
  <saml:Issuer>http://localhost:4000</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" 
                  ID="${assertionId}" 
                  Version="2.0" 
                  IssueInstant="${now}">
    <saml:Issuer>http://localhost:4000</saml:Issuer>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${attributes.mail}</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData NotOnOrAfter="${notOnOrAfter}" 
                                      Recipient="http://localhost:3000/api/auth/callback/aaieduhr"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="${now}" NotOnOrAfter="${notOnOrAfter}">
      <saml:AudienceRestriction>
        <saml:Audience>http://localhost:3000</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="${now}">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="urn:oid:2.5.4.3" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
        <saml:AttributeValue>${attributes.cn}</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="urn:oid:2.5.4.42" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
        <saml:AttributeValue>${attributes.givenName}</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="urn:oid:2.5.4.4" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
        <saml:AttributeValue>${attributes.sn}</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="urn:oid:0.9.2342.19200300.100.1.3" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
        <saml:AttributeValue>${attributes.mail}</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="urn:oid:1.3.6.1.4.1.5923.1.1.1.9" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
        <saml:AttributeValue>${attributes.eduPersonAffiliation}</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="givenName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>${attributes.givenName}</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="sn" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>${attributes.sn}</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="mail" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>${attributes.mail}</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="eduPersonAffiliation" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>${attributes.eduPersonAffiliation}</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`;
    
    // Base64 encode the XML
    return Buffer.from(samlXml).toString('base64');
}

// Metadata endpoint (optional, for completeness)
app.get('/simplesaml/saml2/idp/metadata.php', (req, res) => {
    res.type('application/xml');
    res.send(`<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="http://localhost:4000">
  <IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="http://localhost:4000/simplesaml/saml2/idp/SSOService.php"/>
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="http://localhost:4000/simplesaml/saml2/idp/SSOService.php"/>
  </IDPSSODescriptor>
</EntityDescriptor>`);
});

app.listen(PORT, () => {
    console.log(`[AAI@EduHr SIMULATOR] Server pokrenut na http://localhost:${PORT}`);
    console.log(`[AAI@EduHr SIMULATOR] SSO Login: http://localhost:${PORT}/simplesaml/saml2/idp/SSOService.php`);
});
