# API dokumentacija

## Autentifikacija
- `POST /api/auth/login` - Prijava korisnika
- `POST /api/auth/logout` - Odjava korisnika  
- `GET /api/auth/status` - Status autentifikacije

## Korisnici
- `GET /api/users` - Dohvaćanje svih korisnika (samo admin)
- `GET /api/users/public` - Dohvaćanje javnih podataka o korisnicima
- `POST /api/users` - Kreiranje novog korisnika (samo admin)
- `PUT /api/users/:id` - Ažuriranje korisnika (samo admin)
- `DELETE /api/users/:id` - Brisanje korisnika (samo admin)
- `POST /api/users/change-admin-password` - Promjena admin lozinke (samo admin)

## Dokumenti (Thesis)
- `GET /api/theses` - Dohvaćanje svih dokumenata
- `GET /api/theses/:id` - Dohvaćanje specifičnog dokumenta
- `POST /api/theses` - Kreiranje novog dokumenta
- `PUT /api/theses/:id` - Ažuriranje dokumenta
- `DELETE /api/theses/:id` - Brisanje dokumenta

## Poglavlja
- `POST /api/theses/:id/chapters` - Dodavanje novog poglavlja
- `PUT /api/theses/:id/chapters/:chapterId` - Ažuriranje poglavlja
- `DELETE /api/theses/:id/chapters/:chapterId` - Brisanje poglavlja (rekurzivno)

## Prijenos datoteka
- `POST /api/upload` - Prijenos slika za TinyMCE uređivač

## Task Management
- `GET /api/tasks` - Dohvaćanje svih zadataka (Tasks)
- `POST /api/tasks` - Kreiranje novog zadatka
- `PUT /api/tasks/:id` - Ažuriranje zadatka
- `DELETE /api/tasks/:id` - Brisanje zadatka
- `PATCH /api/tasks/:id/toggle-finished` - Promjena finished statusa zadatka

## Todos Management  
- `GET /api/todos` - Dohvaćanje svih to-do stavki
- `POST /api/todos` - Kreiranje novog to-do
- `PUT /api/todos/:id` - Ažuriranje to-do
- `DELETE /api/todos/:id` - Brisanje to-do
- `PATCH /api/todos/:id/toggle-finished` - Promjena finished statusa to-do

## Notes Management
- `GET /api/notes` - Dohvaćanje svih bilješki ili filtriranih po thesisId/chapterId
- `POST /api/notes` - Kreiranje nove bilješke
- `PUT /api/notes/:id` - Ažuriranje bilješke
- `PATCH /api/notes/:id/approve` - Prihvaćanje/odbacivanje bilješke
- `DELETE /api/notes/:id` - Brisanje bilješke
- `DELETE /api/notes/thesis/:thesisId` - Brisanje svih bilješki za određeni thesis (kaskadno brisanje)

## Admin Dokumenti
- Admin rute za upravljanje dokumentima (detaljnije rute definirane u admin-documents.js)

## Konfiguracija
- `GET /api/tinymce-config` - Dohvaćanje TinyMCE API ključa za uređivač

## Ostalo
- `GET /*` - Služi React aplikaciju (SPA routing)
