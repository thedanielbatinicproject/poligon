# Poligon

Moderna web aplikacija za stvaranje, uređivanje i pregled znanstvenih radova i akademskih dokumenata.

## Značajke

- **Znanstveni editor**: TinyMCE s automatskim numeriranjem tablica, slika i jednadžbi
- **Hijerarhijska struktura**: 3-razinska organizacija poglavlja (1, 1.1, 1.1.1)
- **VIEW/EDIT režimi**: Odvojeni načini za pregled i uređivanje
- **Task & Todos sustav**: Kalendarska organizacija zadataka s povezivanjem na dokumente
- **Bilješke i komentari**: Sustav za dodavanje komentara na poglavlja i selektirani tekst
- **Automatsko spremanje**: Gubitak rada više nije problem
- **Responzivan dizajn**: Optimiziran za sve uređaje

Za detaljne značajke, pogledajte [docs/features.md](docs/features.md).

## Baza podataka

Aplikacija koristi relacijsku bazu podataka (MariaDB/MySQL) za skalabilno spremanje podataka.

Za detaljne informacije o strukturi baze, relacijama i uputama za postavljanje, pogledajte [docs/database.md](docs/database.md).

SQL kod za kreiranje baze: [docs/template.sql](docs/template.sql).

## Instalacija

1. Klonirajte repozitorij:
```bash
git clone https://github.com/thedanielbatinicproject/poligon.git
cd poligon
```

2. Instalirajte ovisnosti:
```bash
npm install
```

3. Postavite bazu podataka prema uputama u [docs/database.md](docs/database.md).

## Konfiguracija

Stvorite `.env` datoteku u korijenskom direktoriju:

```bash
# Server konfiguracija
PORT=3000

# Admin korisnik
ADMIN_USERNAME=admin1
ADMIN_PASSWORD=admin

# TinyMCE konfiguracija
TINYMCE_API_KEY=your_tinymce_api_key_here
```

### TinyMCE API ključ

Aplikacija zahtijeva besplatni TinyMCE API ključ:

1. Registrirajte se na https://www.tiny.cloud/
2. Dohvatite besplatni API ključ iz Vaše nadzorne ploče
3. Dodajte ključ u `.env` datoteku

**Napomena**: Bez API ključa, uređivač se neće učitati.

## Pokretanje

### Razvojni način

Backend poslužitelj (port 3000):
```bash
npm run dev
```

Backend poslužitelj (port 3000):
```bash
npm run dev
```

Frontend razvojni poslužitelj (port 3001):
```bash
npm run dev-client
```

### Produkcijski način

Build React aplikacije:
```bash
npm run build
```

Pokretanje poslužitelja:
```bash
npm start
```

Aplikacija će biti dostupna na http://localhost:3000

## Dokumentacija

- **[NPM skripte](docs/scripts.md)** - Popis svih dostupnih npm naredbi
- **[API dokumentacija](docs/api.md)** - Popis svih API ruta i endpointa
- **[Detaljne značajke](docs/features.md)** - Opširni opis svih funkcionalnosti
- **[Baza podataka](docs/database.md)** - Struktura baze i upute za postavljanje

### Produkcijski nacin

Build React aplikacije:
```bash
npm run build
```

Pokretanje poslu�itelja:
```bash
npm start
```

Aplikacija ce biti dostupna na http://localhost:3000

## Dokumentacija

- **[API dokumentacija](docs/api.md)** - Popis svih API ruta i endpointa
- **[Detaljne znacajke](docs/features.md)** - Opširni opis svih funkcionalnosti
- **[Baza podataka](docs/database.md)** - Struktura baze i upute za postavljanje

## Struktura projekta

```
poligon/
├── server/                 # Backend kod
│   ├── index.js            # Express.js backend poslužitelj
│   ├── routes/             # API rute
│   │   ├── auth.js         # Autentifikacija
│   │   ├── theses.js       # Dokumenti
│   │   ├── tasks.js        # Tasks i Todos
│   │   ├── notes.js        # Bilješke
│   │   ├── users.js        # Korisnici
│   │   └── admin-documents.js  # Admin dokumenti
│   ├── models/             # Modeli podataka
│   │   └── ThesisModel.js  # Model za radove
│   ├── middleware/         # Middleware funkcije
│   │   └── auth.js         # Autentifikacija middleware
│   ├── utils/              # Pomoćne funkcije
│   │   └── JsonDB.js       # JSON baza handler
│   ├── data/               # JSON baza podataka
│   └── uploads/            # Uploadane datoteke
├── src/                    # React frontend kod
│   ├── components/         # React komponente
│   │   ├── ChapterEditor/
│   │   ├── ScientificEditor/
│   │   ├── DocumentSelector/
│   │   ├── DocumentManager/
│   │   ├── DocumentsManager/
│   │   ├── NotesPanel/
│   │   ├── ChapterTasks/
│   │   ├── DocumentTasks/
│   │   ├── ConfirmModal/
│   │   ├── Header/
│   │   └── Footer/
│   ├── pages/              # React stranice
│   │   ├── Home/
│   │   ├── About/
│   │   ├── DocumentPage/
│   │   ├── LoginPage/
│   │   ├── Dashboard/
│   │   ├── AdminPanel/
│   │   └── TasksTodos/
│   ├── utils/              # Pomoćne funkcije
│   │   └── api.js          # API helper
│   └── styles/             # CSS stilovi
│       └── main.css
├── public/                 # Statičke datoteke
│   ├── uploads/            # Public uploads
│   ├── manifest.json
│   ├── robots.txt
│   └── sitemap.xml
├── docs/                   # Dokumentacija
│   ├── database.md
│   ├── features.md
│   ├── api.md
│   ├── scripts.md
│   └── template.sql
├── dist/                   # Build output (generiran)
├── .env                    # Environment varijable
├── .gitignore              # Git ignore
├── package.json            # NPM konfiguracija
├── webpack.config.js       # Webpack konfiguracija
└── .babelrc                # Babel konfiguracija
```

## Tehnologije

- **Frontend**: React 18, Webpack 5, Babel
- **Backend**: Express.js, Node.js
- **Editor**: TinyMCE 6
- **Baza podataka**: MariaDB/MySQL
- **Ostalo**: React Big Calendar, Moment.js, Multer

## Licenca

ISC
