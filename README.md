# Poligon - Platforma za Akademske Radove

Moderna web aplikacija za kreiranje, uređivanje i pregled diplomskih radova i drugih akademskih dokumenata.

## 🚀 Značajke

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
- **Napredni editor**: TipTap editor s formatiranjem teksta
- **Organizacija poglavlja**: Strukturirano upravljanje sadržajem
- **VIEW režim**: Pregled dokumenata bez potrebe za prijavom
- **EDIT režim**: Puno uređivanje za prijavljene korisnike
- **Automatsko spremanje**: Gubitak rada više nije problem
- **Responzivni dizajn**: Radi na svim uređajima

## 📋 Ovisnosti

- Node.js (v14 ili noviji)
- npm

### Glavni npm paketi:
- **react** - Frontend library
- **react-dom** - DOM rendering za React
- **express** - Backend web okvir
- **webpack** - Module bundler
- **babel** - JavaScript transpiler
- **nodemon** - Razvojni alat za automatsko pokretanje

## 🛠️ Instalacija

1. Kloniraj repozitorij:
```bash
git clone https://github.com/thedanielbatinicproject/poligon.git
cd poligon
```

2. Instaliraj ovisnosti:
```bash
npm install
```

## 🏃‍♂️ Pokretanje

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

## 📁 Struktura projekta

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
│   │   └── theses.js  # Dokumenti API
│   └── data/          # Podaci
│       ├── sessions.json  # Korisničke sesije  
│       ├── theses.json    # Dokumenti
│       └── users.json     # Korisnici
├── src/               # React source kod
│   ├── index.js       # React entry point
│   ├── App.js         # Glavna React komponenta
│   ├── index.html     # HTML template
│   ├── components/    # React komponente
│   │   ├── Header.js  # Header komponenta
│   │   ├── Footer.js  # Footer komponenta
│   │   ├── ChapterEditor.js    # Editor poglavlja
│   │   ├── DocumentSelector.js # Selektor dokumenata
│   │   └── DocumentManager.js  # Upravljanje dokumentima
│   ├── pages/         # React stranice
│   │   ├── Home.js          # Početna stranica
│   │   ├── About.js         # O nama stranica
│   │   ├── DocumentPage.js  # Glavna stranica s dokumentima
│   │   ├── LoginPage.js     # Stranica za prijavu
│   │   └── Dashboard.js     # Dashboard
│   ├── utils/         # Pomoćne funkcije
│   │   └── api.js     # API helper funkcije
│   └── styles/        # CSS stilovi
│       └── main.css   # Glavni CSS
└── dist/              # Webpack build output (generiran)
```

## 🛣️ API Rute

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
- `PATCH /api/theses/:id/autosave` - Automatsko spremanje

### Ostalo
- `GET /*` - Služi React aplikaciju (SPA routing)

## 🎨 Prilagođavanje

Možete lako prilagoditi aplikaciju:

1. **React komponente**: Uredite datoteke u `/src/components/` i `/src/pages/`
2. **Stilovi**: Uredite `/src/styles/main.css`
3. **Backend API**: Uredite `app.js` za dodavanje novih API ruta
4. **Webpack konfiguracija**: Uredite `webpack.config.js`
5. **Build proces**: Prilagodite npm skripte u `package.json`

## ⚛️ Aplikacijska Arhitektura

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
- **Dual režim**: VIEW (neautentificirani) i EDIT (autentificirani) 
- **Real-time editor**: TipTap s bogatim formatiranjem
- **Strukturirani sadržaj**: Organizacija po poglavljima
- **Automatsko spremanje**: Bez straha od gubitka rada
- **Responzivni dizajn**: Optimiziran za sve uređaje

## 📝 Licenca

ISC
