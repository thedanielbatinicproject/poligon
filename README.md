# Poligon - Platforma za Akademske Radove

Moderna web aplikacija za kreiranje, uređivanje i pregled diplomskih radova i drugih akademskih dokumenata.

## Značajke

### Frontend (React.js):
- React komponente i hooks
- Moderna JavaScript (ES6+)
- Responzivni dizajn  
- SPA (Single Page Application)
- Hot reloading za razvoj
- VIEW/EDIT režimi rada
- Automatsko spremanje

### Backend (Express.js):
- RESTful API za dokumente i autentifikaciju
- Cookie-based sesije
- JSON odgovori
- CORS podrška
- Error handling
- Perzistentno pohranjivanje podataka

### Aplikacijske značajke:
- **Znanstveni editor**: TinyMCE editor s naprednim funkcionalnostima
- **Automatsko numeriranje**: Tablice, slike i jednadžbe s hijerarhijskim brojevima
- **Upload slika**: Direktno uklucivanje slika u dokumente
- **Hijerarhijska poglavlja**: 3-razinska organizacija (1, 1.1, 1.1.1)
- **VIEW/EDIT režimi**: Potpuno odvojeni načini rada za pregled i uređivanje
- **Čuvanje stanja**: Automatsko vraćanje na zadnju poziciju nakon refresh-a
- **Upravljanje dokumentima**: Kreiranje, uređivanje metapodataka i brisanje
- **Automatsko spremanje**: Gubitak rada više nije problem
- **Task & Todos sustav**: Kalendarska organizacija zadataka s povezivanjem na dokumente
- **Responzivni dizajn**: Optimiziran za sve uređaje

## Ovisnosti

- Node.js (v14 ili noviji)
- npm

### Glavni npm paketi:
- **react** - Frontend library
- **react-dom** - DOM rendering za React
- **express** - Backend web okvir
- **tinymce** - Napredni WYSIWYG editor za znanstvene radove
- **multer** - Middleware za upload datoteka
- **node-json-db** - JSON baza podataka
- **react-big-calendar** - Kalendarska komponenta za task management
- **moment** - Manipulacija datuma i vremena
- **webpack** - Module bundler
- **babel** - JavaScript transpiler
- **nodemon** - Razvojni alat za automatsko pokretanje

## Instalacija

1. Kloniraj repozitorij:
```bash
git clone https://github.com/thedanielbatinicproject/poligon.git
cd poligon
```

2. Instaliraj ovisnosti:
```bash
npm install
```

## Pokretanje

### Razvojni način rada:

1. **Backend poslužitelj** (port 3000):
```bash
npm run dev
```

2. **Frontend development server** (port 3001):
```bash
npm run dev-client
```

### Produkcijski način rada:

1. **Build React aplikacije**:
```bash
npm run build
```

2. **Pokretanje poslužitelja**:
```bash
npm start
```

**Razvojni način**: Frontend (3001) + Backend (3000)  
**Produkcijski način**: Sve na portu 3000

Aplikacija će biti dostupna na http://localhost:3000

### Načini Rada

**VIEW Režim** (bez autentifikacije):
- Pregled dokumenata u read-only načinu
- Nema toolbar-a u editoru
- Skriveni su gumbovi za uređivanje
- Pristup svim dokumentima za čitanje

**EDIT Režim** (s autentifikacijom):
- Puno uređivanje dokumenata
- TinyMCE s kompletnim toolbar-om
- Kreiranje, uređivanje i brisanje poglavlja
- Upravljanje metapodacima dokumenta

## Struktura projekta

```
poligon/
├── app.js              # Express.js backend poslužitelj
├── package.json        # npm konfiguracija
├── webpack.config.js   # Webpack konfiguracija
├── .babelrc           # Babel konfiguracija
├── README.md          # Dokumentacija
├── .gitignore         # Git ignore pravila
├── server/            # Backend kod
│   ├── routes/        # API rute
│   │   ├── auth.js    # Autentifikacijske rute
│   │   ├── theses.js  # Dokumenti API
│   │   └── tasks.js   # Task & Todos API
│   ├── models/        # Modeli podataka
│   │   └── ThesisModel.js # Model za rad s diplomskim radovima
│   └── data/          # Podaci
│       ├── sessions.json  # Korisničke sesije  
│       ├── theses.json    # Dokumenti
│       ├── tasks.json     # Zadaci (Tasks)
│       ├── todos.json     # To-do lista
│       └── users.json     # Korisnici
├── public/            # Statičke datoteke
│   └── uploads/       # Uploadane slike
├── src/               # React source kod
│   ├── index.js       # React entry point
│   ├── App.js         # Glavna React komponenta
│   ├── index.html     # HTML template
│   ├── components/    # React komponente
│   │   ├── Header.js  # Header komponenta
│   │   ├── Footer.js  # Footer komponenta
│   │   ├── ChapterEditor.js    # Hijerarhijski editor poglavlja
│   │   ├── ScientificEditor.js # TinyMCE znanstveni editor
│   │   ├── DocumentSelector.js # Selektor dokumenata
│   │   └── DocumentManager.js  # Upravljanje metapodacima i brisanje
│   ├── pages/         # React stranice
│   │   ├── Home.js          # Početna stranica
│   │   ├── About.js         # O nama stranica
│   │   ├── DocumentPage.js  # Glavna stranica s dokumentima
│   │   ├── LoginPage.js     # Stranica za prijavu
│   │   ├── Dashboard.js     # Dashboard
│   │   └── TasksTodos.js    # Task & Todos organizacija
│   ├── utils/         # Pomoćne funkcije
│   │   └── api.js     # API helper funkcije
│   └── styles/        # CSS stilovi
│       └── main.css   # Glavni CSS
└── dist/              # Webpack build output (generiran)
```

## API Rute

### Autentifikacija
- `POST /api/auth/login` - Prijava korisnika
- `POST /api/auth/logout` - Odjava korisnika  
- `GET /api/auth/status` - Status autentifikacije

### Dokumenti (Thesis)
- `GET /api/theses` - Dohvaćanje svih dokumenata
- `GET /api/theses/:id` - Dohvaćanje specifičnog dokumenta
- `POST /api/theses` - Kreiranje novog dokumenta
- `PUT /api/theses/:id` - Ažuriranje dokumenta
- `DELETE /api/theses/:id` - Brisanje dokumenta

### Poglavlja
- `POST /api/theses/:id/chapters` - Dodavanje novog poglavlja
- `PUT /api/theses/:id/chapters/:chapterId` - Ažuriranje poglavlja
- `DELETE /api/theses/:id/chapters/:chapterId` - Brisanje poglavlja (rekurzivno)

### Upload
- `POST /api/upload` - Upload slika za TinyMCE editor

### Task Management
- `GET /api/tasks` - Dohvaćanje svih zadataka (Tasks)
- `POST /api/tasks` - Kreiranje novog zadatka
- `PUT /api/tasks/:id` - Ažuriranje zadatka
- `DELETE /api/tasks/:id` - Brisanje zadatka
- `PATCH /api/tasks/:id/toggle-finished` - Promjena finished statusa zadatka

### Todos Management  
- `GET /api/todos` - Dohvaćanje svih to-do stavki
- `POST /api/todos` - Kreiranje novog to-do
- `PUT /api/todos/:id` - Ažuriranje to-do
- `DELETE /api/todos/:id` - Brisanje to-do
- `PATCH /api/todos/:id/toggle-finished` - Promjena finished statusa to-do

### Ostalo
- `GET /*` - Služi React aplikaciju (SPA routing)

## Znanstveni Editor

### TinyMCE Integracija
Aplikacija koristi TinyMCE Cloud service s besplatnim API ključem za napredne funkcionalnosti uređivanja znanstvenih dokumenata.

### Automatsko Numeriranje
- **Tablice**: Automatski generirane kao "Tablica 1.2.1" prema hijerarhiji poglavlja
- **Slike**: Numeracija "Slika 1.2.1" s automatskim caption-om
- **Jednadžbe**: Numeracija "(1.2.1)" s matematičkim formatiranjem

### Hijerarhijska Struktura
- **3 razine dubine**: Glavno poglavlje → Potpoglavlje → Sekcija
- **Automatska numeracija**: 1, 1.1, 1.1.1
- **Rekurzivno brisanje**: Briše sav sadržaj uključujući djecu
- **Drag & drop**: Reorganizacija poglavlja (planirana funkcionalnost)

### Upload Funkcionalnosti  
- **Sigurni upload**: Multer middleware s provjeram tipa datoteke
- **Ograničenja**: Maksimalno 5MB, samo slike
- **Automatsko imenovanje**: Jedinstvena imena datoteka
- **Integracija s editorom**: Direktno umetanje u TinyMCE

## Task & Todos Sustav

### Kalendarska Organizacija 
- **React Big Calendar**: Moderna kalendarska komponenta s mogućnostima pregleda
- **Moment.js lokalizacija**: Hrvatski nazivi mjeseci i dana u tjednu  
- **Kalendarski prikazi**: Mjesec, tjedan, dan i agenda prikaz
- **Interaktivni događaji**: Klik na događaj otvara detalje

### Task Management
- **Kreiranje zadataka**: Naslov, opis, datum, tip (Task/Todo), povezani dokument
- **Status praćenje**: Finished/Active stanje s vizualnim indikatorima
- **Toggle funkcionalnost**: Klik na zadatak mijenja finished status  
- **Potvrda reaktivacije**: Dijalog za potvrdu vraćanja završenih zadataka u active stanje
- **Filtriranje po tipu**: Prikazivanje samo Task-ova ili samo Todo-a

### Povezivanje s Dokumentima
- **Dropdown selektor**: Izbor postojećeg dokumenta iz thesis baze
- **Metadata integracija**: Prikaz povezanih dokumenata u task detaljima
- **Navigacija**: Direktni linkovi na povezane dokumente (planirana funkcionalnost)

### Kalendarski Prikaz
- **Vizualni indikatori**: Različite boje za Task (plava) i Todo (zelena)
- **Finished zadaci**: Siva boja, strikethrough tekst, opacity efekt
- **Hover efekti**: Interaktivni hover s tooltip informacijama
- **Responsive design**: Prilagođava se veličini ekrana

### Search & Filter
- **Live pretraživanje**: Instant pretraživanje kroz naslov i opis zadataka
- **Tip filtriranje**: Filter gumbovi za All/Tasks/Todos
- **Kombinirana pretraživanja**: Pretraživanje + tip filter rade istovremeno

### User Interface
- **Moderna CSS**: Gradijenti, animacije, shadow efekti
- **Table prikaz**: Sortirana lista svih zadataka s metapodacima
- **Form validacija**: Provjera obaveznih polja prije spremanja
- **Loading states**: Visual feedback tijekom API poziva
- **Error handling**: User-friendly poruke o greškama

### Data Persistence
- **JSON storage**: File-based baza u server/data/ direktoriju
- **Autentifikacija**: Svi CRUD pozivi zahtijevaju valid sesiju
- **Jedinstveni ID-jevi**: Automatically generirani task i todo ID-jevi
- **Timestamp praćenje**: Kreiranje i zadnje ažuriranje vremena

## Prilagođavanje

Možete lako prilagoditi aplikaciju:

1. **React komponente**: Uredite datoteke u `/src/components/` i `/src/pages/`
2. **Stilovi**: Uredite CSS datoteke u komponentama
3. **TinyMCE konfiguracija**: Modificirajte `ScientificEditor.js`
4. **Backend API**: Uredite `app.js` i `server/routes/` za nove API rute
5. **Webpack konfiguracija**: Uredite `webpack.config.js`
6. **Build proces**: Prilagodite npm skripte u `package.json`

## Tehnički Detalji

### State Management
- **localStorage persistencija**: Čuva selectedDocumentId, selectedChapterId i currentPage
- **Automatski recovery**: Vraćanje na zadnju poziciju nakon refresh-a
- **React hooks**: useState i useEffect za lokalni state

### API Design
- **RESTful endpoints**: Standardizirani pristup podacima
- **Cookie-based auth**: Sigurne sesije bez potrebe za tokenima
- **Error handling**: Konzistentno rukovanje greškama
- **File upload**: Sigurni upload s provjeram tipa i veličine

### Performance
- **Lazy loading**: React komponente se učitavaju po potrebi
- **Code splitting**: Webpack dijeli kod u chunk-ove
- **Image optimization**: Automatska optimizacija uploadanih slika
- **Caching**: Browser cache za statičke resurse

## Aplikacijska Arhitektura

### Frontend (React.js)
- **Komponente**: Modularne i ponovne komponente
- **Hooks**: useState, useEffect za state management  
- **Routing**: SPA navigacija između stranica
- **API pozivi**: Centralizirane funkcije u utils/api.js
- **Kondicionalno renderiranje**: Dinamični sadržaj
- **Hot reloading**: Instant feedback tijekom razvoja

### Backend (Express.js + Node.js)
- **Cookie-based autentifikacija**: Sigurne sesije
- **File-based baza**: JSON datoteke za jednostavnost
- **RESTful API**: Standardizirani pristup podacima
- **Middleware**: Provjera autentifikacije i CORS
- **Error handling**: Centralizirano rukovanje greškama

### Značajke aplikacije
- **Dual režimi rada**: 
  - VIEW režim: Pregled dokumenata bez autentifikacije
  - EDIT režim: Puno uređivanje za prijavljene korisnike
- **Znanstveni editor**: TinyMCE s naprednim funkcionalnostima:
  - Automatsko numeriranje tablica, slika i jednadžbi
  - Hijerarhijska numeracija prema poglavljima (1.2.3.1)
  - Upload i umetanje slika
  - Znanstveno formatiranje (A4, Times New Roman, itd.)
- **Hijerarhijska organizacija**: 3-razinska struktura poglavlja
- **Persistent stanje**: Automatsko čuvanje pozicije i sadržaja
- **Upravljanje dokumentima**: 
  - Metapodaci (naslov, autor, mentor, itd.)
  - Brisanje s konfirmacijom
  - Statistike (broj riječi, stranica)
- **Task & Todos organizacija**: 
  - Kalendarska organizacija zadataka i todo stavki
  - React Big Calendar integracija s hrvatskom lokalizacijom
  - Povezivanje zadataka s dokumentima iz thesis baze
  - Live pretraživanje i filtriranje po tipu (Task/Todo)
  - Finished/Active status s vizualnim indikatorima (strikethrough, gray boja)
  - Toggle finished funkcionalnost s potvrdom reaktivacije
  - Moderna responzivna UI s gradijentima i animacijama
- **Responzivni dizajn**: Optimiziran za sve uređaje

## Licenca

ISC
