# NPM skripte

Ovaj dokument opisuje sve dostupne npm skripte u projektu.

## Razvojne skripte

### `npm run dev`
Pokreće backend poslužitelj u razvojnom načinu s automatskim restariranjem (nodemon).
- Port: 3000
- Automatski restartira server pri promjenama u server/ folderu

### `npm run dev-client`
Pokreće Webpack dev server za frontend razvoj.
- Port: 3001
- Hot reloading omogućen
- Proxy za /api rute prema http://localhost:3000

### `npm start`
Pokreće produkcijski backend poslužitelj.
- Port: 3000
- Koristi build iz dist/ foldera

## Build skripte

### `npm run build`
Kreira produkcijski build aplikacije.
- Webpack u production modu
- Minifikacija koda
- Optimizacija bundle veličine
- Output: dist/ folder

### `npm run build-dev`
Kreira razvojni build aplikacije.
- Webpack u development modu
- Source maps omogućeni
- Brži build, veći fileovi
- Output: dist/ folder

### `npm run clean`
Briše dist/ folder i sve generirane fileove.

## Test skripte

### `npm test`
Pokreće sve testove (trenutno nije konfigurirano).

### `npm run test:unit`
Pokreće unit testove (potrebno konfigurirati, npr. Jest).

### `npm run test:integration`
Pokreće integration testove (potrebno konfigurirati).

### `npm run test:api`
Pokreće API testove (potrebno konfigurirati, npr. Supertest).

### `npm run test:e2e`
Pokreće end-to-end testove (potrebno konfigurirati, npr. Cypress, Playwright).

## Baza podataka skripte

### `npm run db:migrate`
Pokreće migracije baze podataka (potrebno konfigurirati).

### `npm run db:seed`
Puni bazu podataka test podacima (potrebno konfigurirati).

## Utility skripte

### `npm run lint`
Pokreće linting (potrebno konfigurirati, npr. ESLint).

### `npm run logs`
Prikazuje sadržaj stderr.log datoteke.

### `npm run logs:clear`
Briše stderr.log datoteku.

## Primjeri korištenja

### Razvojno okruženje (preporučeno)
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
npm run dev-client
```

### Produkcijski build i pokretanje
```bash
# Build aplikacije
npm run build

# Pokreni server
npm start
```

### Čišćenje i rebuild
```bash
# Obriši stare fileove
npm run clean

# Napravi novi build
npm run build
```

## Napomene

- Sve test skripte su pripremljene za buduću konfiguraciju test frameworka
- Database skripte su placeholder za buduću integraciju s relacijskom bazom
- Za razvojni rad preporučuje se koristiti `npm run dev` i `npm run dev-client` istovremeno
- Produkcijski build optimiziran je za performanse i malu veličinu bundle-a
