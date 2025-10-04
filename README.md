# Poligon
- **Automatsko spremanje**: Gubitak rada više nije problem
- **Task & Todos sustav**: Kalendarska organizacija zadataka s povezivanjem na dokumente, funkcionalnosti uređivanja/brisanja s korisničkim dozvolama Radove

Moderna web aplikacija za stvaranje, uređivanje i pregled diplomskih radova i drugih akademskih dokumenata.

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
- **Znanstveni editor**: TinyMCE editor s naprednim funkcionalnostima i konfigurabilnim API ključem
- **Automatsko numeriranje**: Tablice, slike i jednadžbe s hijerarhijskim brojevima
- **Prijenos slika**: Direktno uključivanje slika u dokumente
- **Hijerarhijska poglavlja**: 3-razinska organizacija (1, 1.1, 1.1.1)
- **VIEW/EDIT režimi**: Potpuno odvojeni načini rada za pregled i uređivanje
- **Bilješke i komentari**: Sustav za dodavanje bilješki na poglavlja i selektirani tekst s kaskadnim brisanjem
- **Čuvanje stanja**: Automatsko vraćanje na zadnju poziciju nakon refresh-a
- **Upravljanje dokumentima**: Kreiranje, uređivanje metapodataka i brisanje s automatskim brisanjem povezanih bilješki
- **Automatsko spremanje**: Gubitak rada više nije problem
- **Task & Todos sustav**: Kalendarska organizacija zadataka s povezivanjem na dokumente, edit/delete funkcionalnosti s korisničkim dozvolama
- **Responzivni dizajn**: Optimiziran za sve uređaje

## Ovisnosti

- Node.js (v14 ili noviji)
- npm

### Glavni npm paketi:
- **react** - Frontend biblioteka
- **react-dom** - DOM renderiranje za React
- **express** - Backend web okvir
- **tinymce** - Napredni WYSIWYG uređivač za znanstvene radove
- **multer** - Middleware za prijenos datoteka
- **node-json-db** - JSON baza podataka
- **react-big-calendar** - Kalendarska komponenta za upravljanje zadacima
- **moment** - Manipulacija datuma i vremena
- **webpack** - Paketnik modula
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

## Konfiguracija

### Environment Variables (.env)

Aplikacija koristi varijable okruženja za konfiguraciju. Stvorite `.env` datoteku u korijenskom direktoriju sa sljedećim postavkama:

```bash
# Server konfiguracija
PORT=3000

# Admin korisnik za autentifikaciju
ADMIN_USERNAME=admin1
ADMIN_PASSWORD=admin

# TinyMCE konfiguracija
TINYMCE_API_KEY=your_tinymce_api_key_here
```

### TinyMCE API Ključ

Aplikacija koristi TinyMCE Cloud servis za napredne funkcionalnosti uređivača. Za funkcioniranje aplikacije potreban je besplatni TinyMCE API ključ:

1. **Registrirajte se na**: https://www.tiny.cloud/
2. **Dohvatite besplatni API ključ** iz vaše nadzorne ploče
3. **Dodajte ključ u .env datoteku**: `TINYMCE_API_KEY=your_api_key`

**Napomena**: Bez API ključa, uređivač se neće učitati. API ključ se automatski primjenjuje kroz cijelu aplikaciju.

## Pokretanje

### Razvojni način rada:

1. **Backend poslužitelj** (port 3000):
```bash
npm run dev
```

2. **Frontend razvojni poslužitelj** (port 3001):
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
- Pregled dokumenata u načinu samo za čitanje
- Nema alatne trake u uređivaču
- Skriveni su gumbovi za uređivanje
- Pristup svim dokumentima za čitanje

**EDIT Režim** (s autentifikacijom):
- Potpuno uređivanje dokumenata
- TinyMCE s potpunom alatnom trakom
- Stvaranje, uređivanje i brisanje poglavlja
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
│       ├── notes.json     # Bilješke i komentari
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
│   │   ├── DocumentManager.js  # Upravljanje metapodacima i brisanje
│   │   └── NotesPanel.js       # Panel za bilješke i komentare
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

### Prijenos
- `POST /api/upload` - Prijenos slika za TinyMCE uređivač

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

### Notes Management
- `GET /api/notes` - Dohvaćanje svih bilješki ili filtriranih po thesisId/chapterId
- `POST /api/notes` - Kreiranje nove bilješke
- `PUT /api/notes/:id` - Ažuriranje bilješke
- `PATCH /api/notes/:id/approve` - Prihvaćanje/odbacivanje bilješke
- `DELETE /api/notes/:id` - Brisanje bilješke
- `DELETE /api/notes/thesis/:thesisId` - Brisanje svih bilješki za određeni thesis (kaskadno brisanje)

### Konfiguracija
- `GET /api/tinymce-config` - Dohvaćanje TinyMCE API ključa za uređivač

### Ostalo
- `GET /*` - Služi React aplikaciju (SPA routing)

## Znanstveni Editor

### TinyMCE Integracija
Aplikacija koristi TinyMCE Cloud servis s besplatnim API ključem za napredne funkcionalnosti uređivanja znanstvenih dokumenata.

### Automatsko Numeriranje
- **Tablice**: Automatski generirane kao "Tablica 1.2.1" prema hijerarhiji poglavlja
- **Slike**: Numeracija "Slika 1.2.1" s automatskim opisom
- **Jednadžbe**: Numeracija "(1.2.1)" s matematičkim formatiranjem

### Hijerarhijska Struktura
- **3 razine dubine**: Glavno poglavlje → Potpoglavlje → Sekcija
- **Automatska numeracija**: 1, 1.1, 1.1.1
- **Rekurzivno brisanje**: Briše sav sadržaj uključujući djecu
- **Povuci i ispusti**: Reorganizacija poglavlja (planirana funkcionalnost)

### Funkcionalnosti prijenosa  
- **Sigurni prijenos**: Multer middleware s provjerama tipa datoteke
- **Ograničenja**: Maksimalno 5MB, samo slike
- **Automatsko imenovanje**: Jedinstvena imena datoteka
- **Integracija s uređivačem**: Direktno umetanje u TinyMCE

## Korisnički Sustav i Dozvole

### Upravljanje Korisnicima
- **Administratorska ploča**: Potpuno upravljanje korisnicima (stvaranje, uređivanje, brisanje)
- **Pristup temeljen na ulogama**: Admin, User i Anonymous razine dozvola
- **Upravljanje sesijama**: Autentifikacija temeljena na kolačićima s mehanizmima isteka
- **Korisnički profili**: Detaljni korisnički profili s akademskim informacijama

### Sustav Dozvola
- **Kontrola pristupa dokumentima**:
  - Vlasnici dokumenata mogu potpuno uređivati
  - Uređivači imaju ograničene dozvole uređivanja
  - Neregistrirani korisnici imaju pristup samo za čitanje
- **Task/Todo dozvole**:
  - Admin može upravljati svim stavkama
  - Korisnici mogu upravljati samo vlastite stavke
  - Neregistrirani mogu stvarati samo todoove, ne taskove
- **API sigurnost**: Provjera dozvola na strani poslužitelja za sve CRUD operacije

### Vlasništvo podataka
- **Vlasništvo temeljeno na ID korisnika**: Vlasništvo stavki vezano uz ID korisnika umjesto korisničkog imena
- **Otpornost na promjenu korisničkog imena**: Promjena korisničkog imena ne utječe na vlasništvo
- **Upravljanje uređivačima**: Dodavanje/uklanjanje uređivača na dokumentima
- **Nasljeđivanje dozvola**: Hijerarhijske dozvole kroz strukturu dokument-poglavlje

## Task & Todos Sustav

### Kalendarska Organizacija 
- **React Big Calendar**: Moderna kalendarska komponenta s mogućnostima pregleda
- **Moment.js lokalizacija**: Hrvatski nazivi mjeseci i dana u tjednu  
- **Kalendarski prikazi**: Mjesec, tjedan, dan i agenda prikaz
- **Interaktivni događaji**: Klik na događaj otvara detalje

### Upravljanje zadacima
- **Stvaranje zadataka**: Naslov, opis, datum, tip (Task/Todo), povezani dokument
- **Praćenje statusa**: Finished/Active stanje s vizualnim indikatorima
- **Funkcionalnost prebacivanja**: Klik na zadatak mijenja finished status
- **Potvrda reaktivacije**: Dijalog za potvrdu vraćanja završenih zadataka u aktivno stanje
- **Filtriranje po tipu**: Prikazivanje samo Task-ova ili samo Todo-a
- **Upravljanje zadataka**: Funkcionalnosti uređivanja/brisanja s dozvolama temeljenim na korisniku
- **Sustav dozvola**: 
  - Admin može uređivati i brisati sve zadatke i todoove
  - Korisnici mogu uređivati i brisati samo vlastite stavke
  - Neregistrirani korisnici ne mogu stvarati taskove, samo todoove
  - Vlasništvo se prati kroz userID umjesto korisničkog imena za bolju postojanost

### Povezivanje s Dokumentima
- **Dropdown selektor**: Izbor postojećeg dokumenta iz thesis baze
- **Pametno filtriranje**: Padajući izbornik prikazuje samo dokumente koje korisnik može uređivati
- **Kontrola pristupa dokumentima**: 
  - Korisnici vide vlastite dokumente i one u kojima su dodani kao uređivači
  - Neregistrirani korisnici vide samo "GLOBAL" opciju
  - Admin vidi sve dokumente
- **Metadata integracija**: Prikaz povezanih dokumenata u task detaljima
- **Navigacija**: Direktne veze na povezane dokumente (planirana funkcionalnost)

### Kalendarski Prikaz
- **Vizualni indikatori**: Različite boje za Task (plava) i Todo (zelena)
- **Finished zadaci**: Siva boja, strikethrough tekst, opacity efekt
- **Efekti postavljanja pokazivača**: Interaktivno postavljanje pokazivača s informacijama u oblačiću
- **Prilagodljivi dizajn**: Prilagođava se veličini ekrana

### Search & Filter
- **Live pretraživanje**: Instant pretraživanje kroz naslov i opis zadataka
- **Tip filtriranje**: Filter gumbovi za All/Tasks/Todos
- **Kombinirana pretraživanja**: Pretraživanje + tip filter rade istovremeno

### User Interface
- **Moderna CSS**: Gradijenti, animacije, shadow efekti
- **Table prikaz**: Sortirana lista svih zadataka s metapodacima
- **Provjera valjanosti obrasca**: Provjera obaveznih polja prije spremanja
- **Stanja učitavanja**: Vizualna povratna informacija tijekom API poziva
- **Rukovanje greškama**: Korisno prikladne poruke o greškama

### Data Persistence
- **JSON storage**: File-based baza u server/data/ direktoriju
- **Role-based sigurnost**: Server-side provjera dozvola za sve API pozive
- **Upravljanje sesijama**: Autentifikacija temeljena na kolačićima s automatskim čišćenjem
- **Jedinstveni ID-jevi**: Automatski generirani task i todo ID-jevi
- **Praćenje vremenske oznake**: Stvaranje i zadnje ažuriranje vremena
- **Anti-scroll modalni sustav**: Blokiranje skrolanja tijekom potvrda i dijaloga

## Sustav Bilješki i Komentara

### Osnovna Funkcionalnost
Aplikacija podržava napredni sustav bilješki koji omogućava korisnicima dodavanje komentara na specifične dijelove dokumenata. Sustav radi u oba režima (VIEW i EDIT) i ne zahtijeva autentifikaciju za osnovne funkcionalnosti.

### Način Rada s Bilješkama

**1. Dodavanje Bilješki na Poglavlja:**
- U desnom panelu (`notes-container`) nalazi se gumb "Dodaj bilješku"
- Svako poglavlje, potpoglavlje i sekcija ima odvojene bilješke
- Bilješke mogu dodavati svi korisniki (registrirani i neregistrirani)
- Neregistrirani korisnici se označavaju kao "Visitor"

**2. Dodavanje Bilješki na Selektirani Tekst:**
- U VIEW režimu omogućena je selekcija teksta (bez uređivanja)
- Kada se selektira tekst, pojavljuje se gumb "Dodaj bilješku" iznad selekcije
- Gumb prati poziciju skrolanja i nestaje kada tekst nije vidljiv
- Automatsko povezivanje s brojem linije u dokumentu

### Vizualni Prikaz
- **Layout 3:1**: Editor zauzima 3/4 širine, notes panel 1/4
- **Kolapsibilni panel**: Notes panel se može sakriti animacijom prema desno
- **Moderne animacije**: Smooth prijelazi i hover efekti
- **Prilagodljivi dizajn**: Prilagođava se različitim veličinama ekrana

### Funkcionalnosti Bilješki
- **Opis bilješke**: Obavezno polje za sadržaj komentara
- **Autor**: Ime korisnika ili "Visitor" za nelogirane
- **Datum kreiranja**: Automatski timestamp
- **Broj linije**: Automatski izračun za selektirani tekst
- **Selektirani tekst**: Čuva se izvorni selektirani sadržaj
- **Status odobrenja**: Pending/Approved stanje s vizualnim indikatorima

### Upravljanje Bilješkama
- **Prihvaćanje**: Bilješke mogu biti odobrene (postaju sivije)
- **Brisanje**: Mogućnost brisanja s potvrdom
- **Sortiranje**: Najnovije bilješke prikazane prvo
- **Filtriranje**: Automatsko filtriranje po thesis/chapter ID

### Tehnička Implementacija
- **Backend API**: Zasebne /api/notes rute za CRUD operacije
- **JSON pohrana**: notes.json datoteka u server/data/
- **TinyMCE integracija**: Prilagođeno rukovanje selekcijom za VIEW režim
- **React hooks**: useState/useEffect za upravljanje stanjem
- **CSS Grid/Flexbox**: Moderan prilagodljivi izgled

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

### Performanse
- **Lijeno učitavanje**: React komponente se učitavaju po potrebi
- **Dijeljenje koda**: Webpack dijeli kod u blokove
- **Optimizacija slika**: Automatska optimizacija prenesenih slika
- **Predmemoriranje**: Predmemorija preglednika za statičke resurse

## Aplikacijska Arhitektura

### Frontend (React.js)
- **Komponente**: Modularne i ponovne komponente
- **Hooks**: useState, useEffect za upravljanje stanjem  
- **Usmjeravanje**: SPA navigacija između stranica
- **API pozivi**: Centralizirane funkcije u utils/api.js
- **Uvjetno renderiranje**: Dinamični sadržaj
- **Vruće ponovno učitavanje**: Trenutna povratna informacija tijekom razvoja

### Backend (Express.js + Node.js)
- **Autentifikacija temeljena na kolačićima**: Sigurne sesije
- **Baza temeljena na datotekama**: JSON datoteke za jednostavnost
- **RESTful API**: Standardizirani pristup podacima
- **Middleware**: Provjera autentifikacije i CORS
- **Rukovanje greškama**: Centralizirano rukovanje greškama

### Značajke aplikacije
- **Dual režimi rada**: 
  - VIEW režim: Pregled dokumenata bez autentifikacije
  - EDIT režim: Puno uređivanje za prijavljene korisnike
- **Znanstveni uređivač**: TinyMCE s naprednim funkcionalnostima:
  - Automatsko numeriranje tablica, slika i jednadžbi
  - Hijerarhijska numeracija prema poglavljima (1.2.3.1)
  - Prijenos i umetanje slika
  - Znanstveno formatiranje (A4, Times New Roman, itd.)
- **Hijerarhijska organizacija**: 3-razinska struktura poglavlja
- **Postojano stanje**: Automatsko čuvanje pozicije i sadržaja
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
  - Moderna prilagodljiva UI s gradijentima i animacijama
- **Prilagodljivi dizajn**: Optimiziran za sve uređaje

## Licenca

ISC
