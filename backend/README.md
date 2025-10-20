# Poligon Backend

Ovo je novi backend za Poligon platformu, pisan u Node.js (Express, TypeScript), spreman za povezivanje s MariaDB/MySQL bazom.

## Pokretanje

1. Instaliraj ovisnosti:
   ```bash
   npm install
   ```
2. Kopiraj `.env.example` u `.env` i postavi varijable.
3. Pokreni razvojni server:
   ```bash
   npm run dev
   ```

## Struktura
- `src/` — glavni izvorni kod (API, modeli, servisi)
- `config/` — konfiguracija (npr. baza, passport, SAML)
- `migrations/` — migracije baze
- `test/` — testovi
- `scripts/` — utility skripte

## Deployment
- Dockerfile je spreman za produkciju
- Preporučuje se koristiti reverse proxy (npr. Nginx)

## Dokumentacija
- Za API, bazu i funkcionalnosti vidi `/docs` u rootu projekta

---

Za frontend koristi postojeći `src/` i `public/` folder iz root projekta.
