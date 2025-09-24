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
├── src/               # React source kod
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
└── dist/              # Webpack build output (generiran)
```

## 🛣️ API Rute

## 🛣️ API Rute

- `GET /api/status` - Status API endpoint
- `GET /api/about` - Podaci za O nama stranicu
- `GET /*` - Služi React aplikaciju (SPA routing)
- `GET /api/about` - Podaci o aplikaciji
- `GET /*` - Služi React aplikaciju (catch-all)

## 🎨 Prilagođavanje

Možete lako prilagoditi aplikaciju:

1. **React komponente**: Uredite datoteke u `/src/components/` i `/src/pages/`
2. **Stilovi**: Uredite `/src/styles/main.css`
3. **Backend API**: Uredite `app.js` za dodavanje novih API ruta
4. **Webpack konfiguracija**: Uredite `webpack.config.js`
5. **Build proces**: Prilagodite npm skripte u `package.json`

## ⚛️ React Features

- Funkcionalne komponente s Hooks
- State management s useState i useEffect
- API pozivi s fetch
- Jednostavan SPA routing
- Komponente za ponovno korištenje
- Modern JavaScript (ES6+)

## 🎯 React Features

- **Komponente**: Modularne i ponovne komponente
- **Hooks**: useState, useEffect za state management
- **Event handling**: Interaktivni elementi
- **API pozivi**: Fetch za komunikaciju s backend-om
- **Kondicionalno renderiranje**: Dinamični sadržaj
- **Hot reloading**: Instant feedback tijekom razvoja

## 📝 Licenca

ISC
