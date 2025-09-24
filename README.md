# Poligon - React.js Web Aplikacija Predložak

Početni predložak za full-stack web aplikacije s React.js frontend-om i Express.js backend-om.

## 🚀 Značajke

### Frontend (React.js):
- React komponente i hooks
- Moderna JavaScript (ES6+)
- Responzivni dizajn
- SPA (Single Page Application)
- Hot reloading za razvoj

### Backend (Express.js):
- RESTful API
- JSON odgovori
- CORS podrška
- Error handling
- Statičko služenje React build-a

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

1. **Backend poslužitelj** (Terminal 1):
```bash
npm run dev
```

2. **Frontend development server** (Terminal 2):
```bash
npm run dev-client
```

Frontend će biti dostupan na http://localhost:3001
Backend API na http://localhost:3000

### Produkcijski način rada:

1. **Build React aplikacije**:
```bash
npm run build
```

2. **Pokretanje produkcijskog poslužitelja**:
```bash
npm start
```

Aplikacija će biti dostupna na http://localhost:3000

Aplikacija će biti dostupna na http://localhost:3000

## 📁 Struktura projekta

```
poligon/
├── app.js              # Express backend poslužitelj
├── package.json        # npm konfiguracija
├── webpack.config.js   # Webpack konfiguracija
├── .babelrc           # Babel konfiguracija
├── README.md          # Dokumentacija
├── .gitignore         # Git ignore pravila
├── src/               # React frontend kod
│   ├── index.js       # React entry point
│   ├── App.js         # Glavna React komponenta
│   ├── index.html     # HTML template
│   ├── components/    # React komponente
│   │   ├── Header.js  # Header komponenta
│   │   └── Footer.js  # Footer komponenta
│   ├── pages/         # React stranice
│   │   ├── Home.js    # Početna stranica
│   │   ├── About.js   # O nama stranica
│   │   └── NotFound.js # 404 stranica
│   └── styles/        # CSS stilovi
│       └── main.css   # Glavni CSS
├── dist/              # Build output (generirano)
└── public/            # Stari statički fajlovi (za uklanjanje)
```

## 🛣️ API Rute

- `GET /api/status` - Status poslužitelja
- `GET /api/about` - Podaci o aplikaciji
- `GET /*` - Služi React aplikaciju (catch-all)

## 🎨 Prilagođavanje

Možete lako prilagoditi aplikaciju:

1. **React komponente**: Uredite datoteke u `/src/components/` i `/src/pages/`
2. **Stilovi**: Uredite `/src/styles/main.css`
3. **API**: Dodajte nove rute u `app.js`
4. **Build konfiguracija**: Uredite `webpack.config.js`

## 🎯 React Features

- **Komponente**: Modularne i ponovne komponente
- **Hooks**: useState, useEffect za state management
- **Event handling**: Interaktivni elementi
- **API pozivi**: Fetch za komunikaciju s backend-om
- **Kondicionalno renderiranje**: Dinamični sadržaj
- **Hot reloading**: Instant feedback tijekom razvoja

## 📝 Licenca

ISC
