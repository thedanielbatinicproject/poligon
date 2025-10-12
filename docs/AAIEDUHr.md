# AAI@EduHr Integracija

Ovaj dokument opisuje kako je implementirana integracija sa **AAI@EduHr (Autentikacijska i Autorizacijska Infrastruktura)** sustavom koji omogućava studentima i zaposlenicima hrvatskih sveučilišta prijavu koristeći svoje akademske identitete.

## Što je AAI@EduHr?

AAI@EduHr je nacionalni sustav jedinstvene prijave (Single Sign-On) za visoko obrazovanje u Hrvatskoj kojim upravlja **SRCE (Sveučilišni računski centar)**. Omogućava:

- Prijavu sa akademskim računom (ISVU, email sa @student.unizg.hr, itd.)
- Bez potrebe za stvaranjem dodatnih lozinki
- Automatsko preuzimanje podataka (ime, prezime, email) iz akademskog sustava
- Sigurnost kroz SAML 2.0 protokol

## Tehnička implementacija

### Protokol
- **SAML 2.0** (Security Assertion Markup Language)
- **Service Provider (SP)**: Naša aplikacija
- **Identity Provider (IdP)**: AAI@EduHr (login.aaiedu.hr)

### Korištene biblioteke
```json
{
  "passport": "^0.7.0",
  "@node-saml/passport-saml": "^4.0.4",
  "express-session": "^1.18.0"
}
```

### Flow dijagram

```
1. Korisnik → Klikne "Prijavi se sa AAI@EduHr" na /login
2. Aplikacija → Redirect na https://login.aaiedu.hr (IdP)
3. Korisnik → Unese akademske kredencijale (email + lozinka)
4. AAI@EduHr → Validira korisnika
5. AAI@EduHr → Šalje SAML Assertion nazad na /api/auth/callback/aaieduhr
6. Aplikacija → Parsira SAML response, dohvaća atribute (email, ime, prezime)
7. Aplikacija → Provjeri da li korisnik postoji u bazi
   - AKO NE: Kreiraj novog korisnika sa rolom 'student'
   - AKO DA: Dohvati postojećeg korisnika
8. Aplikacija → Kreiraj sesiju u sessions tablici
9. Aplikacija → Postavi sessionId cookie
10. Korisnik → Redirect na /dashboard
```

## Konfiguracija

### .env varijable

```env
# AAI@EduHr SAML Configuration
AAIEDUHR_SAML_ENTRY_POINT=https://login.aaiedu.hr/simplesaml/saml2/idp/SSOService.php
AAIEDUHR_SAML_ISSUER=https://yourdomain.com
AAIEDUHR_SAML_CALLBACK_URL=https://yourdomain.com/api/auth/callback/aaieduhr
AAIEDUHR_SAML_CERT=MIIDXTCCAkWgAwIBAgIJ...
```

### Registracija aplikacije u AAI@EduHr

**Koraci:**

1. **Testiraj na AAI@EduHr Lab okruženju**
   - URL: https://lablogin.aaiedu.hr/
   - Dokumentacija: https://wiki.srce.hr/pages/viewpage.action?pageId=69501697

2. **Registriraj aplikaciju u Registru resursa**
   - Prijavi se na https://registar.aaiedu.hr/
   - Dodaj novu uslugu (Service Provider)
   - Unesi metapodatke (Entity ID, Callback URL, Certificate)

3. **Preuzmi certifikat od IdP-a**
   - Metapodaci: https://login.aaiedu.hr/simplesaml/saml2/idp/metadata.php
   - Kopiraj `<ds:X509Certificate>` sadržaj u .env

4. **Testiraj na Lab okruženju**
   - Promijeni ENTRY_POINT na https://lablogin.aaiedu.hr/simplesaml/saml2/idp/SSOService.php
   - Koristi test korisničke račune (dostupni u Lab dokumentaciji)

5. **Certificiranje za produkciju**
   - Dokumentacija: https://wiki.srce.hr/spaces/AAIUPUTE/pages/197729297/
   - Nakon prolaska testova, aplikacija se prebacuje na produkciju

## API Endpoints

### GET /api/auth/login/aaieduhr
Pokreće SAML prijavu, redirect na AAI@EduHr.

**Request:**
```bash
GET /api/auth/login/aaieduhr
```

**Response:**
- Redirect 302 na https://login.aaiedu.hr/...

### POST /api/auth/callback/aaieduhr
Callback endpoint koji prima SAML Assertion.

**Request:**
```bash
POST /api/auth/callback/aaieduhr
Content-Type: application/x-www-form-urlencoded

SAMLResponse=PHNhbWxwOlJlc3...
```

**Response:**
- Redirect 302 na /dashboard (uspjeh)
- Redirect 302 na /login?error=... (greška)

### POST /api/auth/login (disabled)
Klasična prijava sa username/password je onemogućena.

**Response:**
```json
{
  "success": false,
  "message": "Direktna prijava nije dostupna. Molimo koristite AAI@EduHr prijavu.",
  "redirect": "/api/auth/login/aaieduhr"
}
```

### GET /api/auth/status
Provjera stanja sesije.

**Response:**
```json
{
  "success": true,
  "authenticated": true,
  "isAuthenticated": true,
  "user": {
    "user_id": 123,
    "first_name": "Ivan",
    "last_name": "Horvat",
    "email": "ivan.horvat@student.unizg.hr",
    "role": "student"
  }
}
```

### POST /api/auth/logout
Odjava korisnika.

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

## Dohvaćanje atributa iz SAML

AAI@EduHr šalje sljedeće atribute:

| Atribut | OID | Opis |
|---------|-----|------|
| `email` | `urn:oid:0.9.2342.19200300.100.1.3` | Email adresa |
| `givenName` | `urn:oid:2.5.4.42` | Ime |
| `sn` | `urn:oid:2.5.4.4` | Prezime |
| `displayName` | `urn:oid:2.16.840.1.113730.3.1.241` | Puno ime |
| `eduPersonPrincipalName` | `urn:oid:1.3.6.1.4.1.5923.1.1.1.6` | Jedinstveni identifikator |
| `eduPersonAffiliation` | `urn:oid:1.3.6.1.4.1.5923.1.1.1.1` | Tip korisnika (student, faculty, staff) |

**Kod u `auth.js`:**
```javascript
const email = profile.email || profile['urn:oid:0.9.2342.19200300.100.1.3'] || profile.nameID;
let firstName = profile.givenName || profile['urn:oid:2.5.4.42'] || '';
let lastName = profile.sn || profile['urn:oid:2.5.4.4'] || '';

// Fallback ako ime ili prezime nisu dostupni
if (!firstName || firstName.trim() === '') {
    firstName = 'Nepoznato';
}
if (!lastName || lastName.trim() === '') {
    lastName = 'Ime';
}

// Određivanje role na osnovu eduPersonAffiliation
const affiliation = profile.eduPersonAffiliation || profile['urn:oid:1.3.6.1.4.1.5923.1.1.1.1'] || '';
let role = 'user'; // Default role

if (Array.isArray(affiliation)) {
    if (affiliation.includes('faculty') || affiliation.includes('staff')) {
        role = 'mentor';
    } else if (affiliation.includes('student')) {
        role = 'student';
    }
} else if (typeof affiliation === 'string') {
    if (affiliation.includes('faculty') || affiliation.includes('staff')) {
        role = 'mentor';
    } else if (affiliation.includes('student')) {
        role = 'student';
    }
}
```

## Database schema

### users tablica
```sql
CREATE TABLE users (
  user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role ENUM('user', 'student', 'mentor', 'admin') NOT NULL DEFAULT 'user',
  preferred_language ENUM('hr', 'en') DEFAULT 'hr',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
```

**Napomena:** 
- NEMA `password_hash` kolone jer korisnici se prijavljuju kroz AAI@EduHr
- `email` je UNIQUE i koristi se za identifikaciju korisnika
- Novi korisnici se automatski kreiraju pri prvoj prijavi
- Role se automatski dodjeljuje na osnovu `eduPersonAffiliation` atributa:
  - `'user'` - default ako affiliation nije dostupan
  - `'student'` - ako je affiliation 'student'
  - `'mentor'` - ako je affiliation 'faculty' ili 'staff'
  - `'admin'` - mora se ručno postaviti u bazi

### sessions tablica
```sql
CREATE TABLE sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  session_data LONGTEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  last_activity DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

## Frontend integracija

### Login stranica

```jsx
// LoginPage/index.js
import React from 'react';
import './LoginPage.css';

const LoginPage = () => {
    const handleAAILogin = () => {
        window.location.href = '/api/auth/login/aaieduhr';
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-form">
                    <h2>Prijava u sustav</h2>
                    <p className="login-description">
                        Prijava putem AAI@EduHr korisničkog računa:
                    </p>
                    <div className="aai-login-section">
                        <img 
                            src="/images/aaieduhr.png" 
                            alt="AAI@EduHr Login" 
                            className="aai-login-logo"
                            onClick={handleAAILogin}
                            style={{ cursor: 'pointer' }}
                            onError={(e) => {
                                e.target.src = '/images/aaieduhr.svg';
                            }}
                        />
                    </div>
                    <div className="login-info">
                        <p>
                            <small>
                                Za pristup sustavu potreban je AAI@EduHr račun (ISVU pristup).
                                <br />
                                Studenti i nastavnici hrvatskih visokih učilišta mogu se prijaviti
                                koristeći svoje institucionalne pristupne podatke.
                            </small>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
    <div className="login-container">
      <h1>Prijava</h1>
      <button onClick={handleAAILogin} className="btn-aaieduhr">
        Prijavi se sa AAI@EduHr
      </button>
      <p className="help-text">
        Koristi svoj akademski račun (email@student.unizg.hr)
      </p>
    </div>
  );
}

export default LoginPage;
```

## Troubleshooting

### Problem: SAML Response validation failed
**Uzrok:** Netočan certifikat ili signature algorithm

**Rješenje:**
1. Provjeri da li `AAIEDUHR_SAML_CERT` točno odgovara IdP certifikatu
2. Preuzmi najnovije metapodatke: https://login.aaiedu.hr/simplesaml/saml2/idp/metadata.php
3. Kopiraj sadržaj između `<ds:X509Certificate>` i `</ds:X509Certificate>` tagova

### Problem: Korisnik se ne kreira automatski
**Uzrok:** Email nije pronađen u SAML response-u

**Rješenje:**
1. Provjeri console log output: `console.log('SAML Profile:', profile)`
2. Provjeri koje atribute IdP šalje
3. Ažuriraj parsing logiku u `auth.js` prema dostupnim atributima

### Problem: Redirect loop nakon prijave
**Uzrok:** Session ne perzistira ili cookie nije postavljen

**Rješenje:**
1. Provjeri da li `sessionId` cookie postoji u browser DevTools
2. Provjeri `maxAge` i `httpOnly` postavke
3. Provjeri `secure` flag (mora biti `false` za localhost, `true` za HTTPS)

## Resursi i dokumentacija

- **AAI@EduHr Web:** https://www.aaiedu.hr/
- **Upute za davatelje usluga:** https://www.aaiedu.hr/davatelji-usluga
- **SRCE Wiki:** https://wiki.srce.hr/display/AAIUPUTE
- **AAI@EduHr Lab:** https://wiki.srce.hr/pages/viewpage.action?pageId=69501697
- **Registar resursa:** https://registar.aaiedu.hr/
- **SAML metadata (production):** https://login.aaiedu.hr/simplesaml/saml2/idp/metadata.php
- **SAML metadata (Lab):** https://lablogin.aaiedu.hr/simplesaml/saml2/idp/metadata.php

## Kontakt za podršku

**SRCE Helpdesk:**
- Email: helpdesk@srce.hr
- Tel: +385 1 6165 555
- Web: https://www.srce.unizg.hr/podrska

---

**Zadnje ažurirano:** 12. listopada 2025.
