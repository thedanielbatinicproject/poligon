# Poligon - Diplomski Rad Builder

Napredna web aplikacija za kreiranje i upravljanje diplomskim radovima s podrškom za verzioniranje, kolaboraciju i automatsko generiranje sadržaja.

## Značajke

### Autentifikacija i dozvole:
- Admin pristup s JWT autentifikacijom
- Kolačići s podrškom za "zapamti me"
- Dva režima rada: VIEW i EDIT
- Gostinski pristup za čitanje

### Frontend (React.js):
- Responzivni dizajn optimiziran za sve uređaje
- Moderne React komponente s hooks
- Intuitivno korisničko sučelje
- Real-time prebacivanje između VIEW/EDIT režima
- Mobilno-optimizirani UI

### Backend (Express.js):
- RESTful API arhitektura
- JSON datoteke kao baza podataka
- Sigurno rukovanje sessionima
- CORS podrška za razvoj
- Middleware za autentifikaciju

## Preduvjeti

- Node.js (v16 ili noviji)
- npm ili yarn

### Ključni npm paketi:

#### Backend:
- **express** - Web framework
- **jsonwebtoken** - JWT autentifikacija
- **bcrypt** - Hash lozinki
- **cookie-parser** - Upravljanje kolačićima
- **multer** - Upload datoteka
- **cors** - Cross-Origin Resource Sharing

#### Frontend:
- **react** - UI library
- **react-dom** - DOM rendering
- **webpack** - Module bundler
- **babel** - JavaScript transpiler

#### Development:
- **nodemon** - Auto-restart servera
- **concurrently** - Paralelno pokretanje skripti

## Instalacija

1. **Kloniraj repozitorij:**
```bash
git clone https://github.com/thedanielbatinicproject/poligon.git
cd poligon
```

2. **Instaliraj ovisnosti:**
```bash
npm install
```

3. **Kreiraj .env datoteku:**
```bash
PORT=3000
NODE_ENV=development
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_DURATION_HOURS=2
REMEMBER_ME_DURATION_DAYS=30
```

## Pokretanje

### Razvojni način rada:
```bash
npm run dev  # Pokreće backend i frontend paralelno
```

Ili zasebno:
```bash
npm run dev-server  # Backend na portu 3000
npm run dev-client  # Frontend na portu 3001
```

### Produkcijski način rada:
```bash
npm run build  # Build React aplikacije
npm start      # Pokreće production server na portu 3000
```

## Korištenje

### Prijava:
- **URL:** http://localhost:3000
- **Admin korisničko ime:** admin (ili iz .env)
- **Admin lozinka:** admin123 (ili iz .env)
- **Zapamti me:** Postavlja kolačić na 30 dana

### Režimi rada:

#### VIEW režim:
- Dostupan svim korisnicima (i neautentificiranima)
- Pregledavanje dokumenata
- Čitanje sadržaja
- Pregled povijesti promjena
- Dodavanje komentara

#### EDIT režim:
- Dostupan samo autentificiranim korisnicima
- Kreiranje novih dokumenata
- Editiranje postojećeg sadržaja
- Upload slika i datoteka
- Upravljanje verzijama
- Sve funkcionalnosti VIEW režima

## Struktura projekta

```
poligon/
├── app.js                  # Express server
├── package.json            # Dependencies i skripte
├── webpack.config.js       # Webpack konfiguracija
├── .babelrc               # Babel konfiguracija
├── .env                   # Environment varijable
├── data.json              # JSON baza podataka
├── uploads/               # Uploadane datoteke
├── server/                # Backend kod
│   ├── middleware/        # Express middleware
│   │   └── auth.js       # Autentifikacija
│   ├── routes/           # API rute
│   │   └── auth.js      # Auth endpoint-i
│   └── utils/           # Utility funkcije
│       └── JsonDB.js    # JSON baza wrapper
├── src/                  # React frontend
│   ├── components/      # React komponente
│   │   ├── Header.js   # Navigacija
│   │   ├── Footer.js   # Podnožje
│   │   └── LoadingSpinner.js
│   ├── pages/          # Stranice
│   │   ├── LoginPage.js  # Prijava
│   │   └── Dashboard.js  # Glavna stranica
│   ├── styles/         # CSS stilovi
│   │   └── main.css   # Glavni CSS
│   ├── App.js         # Glavna React komponenta
│   ├── index.js       # Entry point
│   └── index.html     # HTML template
└── dist/              # Build output (generirano)
```

## API Endpoint-i

### Autentifikacija:
- `POST /api/auth/login` - Prijava korisnika
- `POST /api/auth/logout` - Odjava korisnika
- `GET /api/auth/status` - Provjera autentifikacije

### Općenito:
- `GET /api/status` - Status aplikacije

## Razvojne značajke

- **Hot reloading** - Automatsko osvježavanje tijekom razvoja
- **Source maps** - Lakše debugging
- **Error handling** - Sveobuhvatan error handling
- **Logging** - Detaljno logiranje za debug
- **CORS** - Konfiguriran za razvoj i produkciju

## Sigurnost

- JWT tokeni s HTTP-only kolačićima
- Bcrypt za hash lozinki
- CORS konfiguracija
- Input validacija
- Environment varijable za osjetljive podatke

## Browser podrška

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobilni preglednici (iOS Safari, Chrome Mobile)

## Buduće značajke

Planirane značajke za proširenje:
- TipTap editor za strukturirano editiranje
- Verzioniranje dokumenata (git-like)
- Real-time kolaboracija
- Automatsko generiranje popisa slika/tablica
- PDF export
- Komentar sustav
- Backup i restore funkcionalnost

## Licenca

ISC