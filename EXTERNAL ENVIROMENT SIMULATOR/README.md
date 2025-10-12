# AAI@EduHr Simulator

Simulator AAI@EduHr SAML servera za testiranje integracije bez pristupa pravom AAI@EduHr sustavu.

## Kako koristiti

1. Instaliraj dependencies:
```bash
npm install
```

2. Pokreni simulator server:
```bash
npm start
```

Server se pokreće na `http://localhost:4000`

## Što simulator radi

- Prima SAML autentikacijske zahtjeve na `/simplesaml/saml2/idp/SSOService.php`
- Prikazuje login formu (lozinka nije obavezna)
- Parsira email adresu u formatu `ime.prezime@domena.hr`
- Automatski ekstrahira ime i prezime iz email adrese
- Šalje SAML response natrag na callback URL aplikacije

## Email format

Email mora biti u formatu: `ime.prezime@domena.hr`

Primjeri:
- `marko.markovic@fer.hr` → Marko Marković
- `ana.anic@pmf.hr` → Ana Anić
- `ivan.horvat@fsb.hr` → Ivan Horvat

## SAML atributi koje simulator šalje

1. **cn** - Puno ime i prezime (npr. "Marko Marković")
2. **givenName** - Ime (npr. "Marko")
3. **sn** - Prezime (npr. "Marković")
4. **mail** - Email adresa (npr. "marko.markovic@fer.hr")
5. **eduPersonAffiliation** - Uvijek "student" (za testiranje)
6. **hrEduPersonGender** - Uvijek "M" (za testiranje)

## Napomena

Ovo je simulator za DEVELOPMENT. Ne koristi se u produkciji!
