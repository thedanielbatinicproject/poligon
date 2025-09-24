# Poligon - Node.js Web Aplikacija Predložak

Početni predložak za Node.js web aplikacije s Express.js okvirom i EJS template engine-om.

## 🚀 Značajke

- Express.js poslužitelj
- EJS template engine za dinamičko renderiranje
- Statičke datoteke (CSS, JavaScript)
- API rute
- Rukovanje greškama
- Responzivni dizajn
- Nodemon za razvoj

## 📋 Ovisnosti

- Node.js (v14 ili noviji)
- npm

### Glavni npm paketi:
- **express** - Web okvir
- **ejs** - Template engine
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

### Razvojni način rada (s nodemon):
```bash
npm run dev
```

### Produkcijski način rada:
```bash
npm start
```

Aplikacija će biti dostupna na http://localhost:3000

## 📁 Struktura projekta

```
poligon/
├── app.js              # Glavna datoteka poslužitelja
├── package.json        # npm konfiguracija
├── README.md          # Dokumentacija
├── .gitignore         # Git ignore pravila
├── views/             # EJS template stranice
│   ├── index.ejs      # Početna stranica
│   ├── about.ejs      # O nama stranica
│   ├── 404.ejs        # 404 greška stranica
│   └── layout.ejs     # Layout template (za buduće proširenje)
└── public/            # Statičke datoteke
    ├── css/
    │   └── style.css  # Stilovi
    └── js/
        └── main.js    # Frontend JavaScript
```

## 🛣️ API Rute

- `GET /` - Početna stranica
- `GET /about` - O nama stranica
- `GET /api/status` - Status API endpoint

## 🎨 Prilagođavanje

Možete lako prilagoditi aplikaciju:

1. **Stilovi**: Uredite `/public/css/style.css`
2. **JavaScript**: Uredite `/public/js/main.js`
3. **EJS template stranice**: Uredite datoteke u `/views/` direktoriju
4. **Logika poslužitelja**: Uredite `app.js`
5. **Template varijable**: Proslijedite dodatne podatke iz ruta u EJS template-e

## 🎯 EJS Template značajke

- Dinamičko renderiranje sadržaja
- Prenos podataka iz poslužitelja u template-e
- Iteriranje kroz nizove i objekte
- Uvjetno renderiranje
- Mogućnost stvaranja layout template-a

## 📝 Licenca

ISC
