# Detaljne značajke aplikacije

## Korisnički sustav i dozvole

### Upravljanje korisnicima
- **Administratorska ploča**: Potpuno upravljanje korisnicima (stvaranje, uređivanje, brisanje)
- **Pristup temeljen na ulogama**: Admin, User i Anonymous razine dozvola
- **Upravljanje sesijama**: Autentifikacija temeljena na kolačićima s mehanizmima isteka
- **Korisnički profili**: Detaljni korisnički profili s akademskim informacijama

### Sustav dozvola
- **Kontrola pristupa dokumentima**:
  - Vlasnici dokumenata mogu potpuno uređivati
  - Uređivači imaju ograničene dozvole uređivanja
  - Neregistrirani korisnici imaju pristup samo za čitanje
- **Task/Todo dozvole**:
  - Admin može upravljati svim stavkama
  - Korisnici mogu upravljati samo vlastitim stavkama
  - Neregistrirani mogu stvarati samo todoove, ne taskove
- **API sigurnost**: Provjera dozvola na strani poslužitelja za sve CRUD operacije

### Vlasništvo podataka
- **Vlasništvo temeljeno na ID korisnika**: Vlasništvo stavki vezano uz ID korisnika umjesto korisničkog imena
- **Otpornost na promjenu korisničkog imena**: Promjena korisničkog imena ne utječe na vlasništvo
- **Upravljanje uređivačima**: Dodavanje/uklanjanje uređivača na dokumentima
- **Nasljeđivanje dozvola**: Hijerarhijske dozvole kroz strukturu dokument-poglavlje

## Task & Todos sustav

### Kalendarska organizacija 
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

### Povezivanje s dokumentima
- **Dropdown selektor**: Izbor postojećeg dokumenta iz thesis baze
- **Pametno filtriranje**: Padajući izbornik prikazuje samo dokumente koje korisnik može uređivati
- **Kontrola pristupa dokumentima**: 
  - Korisnici vide vlastite dokumente i one u kojima su dodani kao uređivači
  - Neregistrirani korisnici vide samo "GLOBAL" opciju
  - Admin vidi sve dokumente
- **Metadata integracija**: Prikaz povezanih dokumenata u task detaljima
- **Navigacija**: Direktne veze na povezane dokumente (planirana funkcionalnost)

### Kalendarski prikaz
- **Vizualni indikatori**: Različite boje za Task (plava) i Todo (zelena)
- **Finished zadaci**: Siva boja, strikethrough tekst, opacity efekt
- **Efekti postavljanja pokazivača**: Interaktivno postavljanje pokazivača s informacijama u oblačiću
- **Prilagodljiv dizajn**: Prilagođava se veličini ekrana

### Search & Filter
- **Live pretraživanje**: Instant pretraživanje kroz naslov i opis zadataka
- **Tip filtriranje**: Filter gumbovi za All/Tasks/Todos
- **Kombinirana pretraživanja**: Pretraživanje + tip filter rade istovremeno

### User Interface
- **Moderan CSS**: Gradijenti, animacije, shadow efekti
- **Table prikaz**: Sortirana lista svih zadataka s metapodacima
- **Provjera valjanosti obrasca**: Provjera obaveznih polja prije spremanja
- **Stanja učitavanja**: Vizualna povratna informacija tijekom API poziva
- **Rukovanje greškama**: Korisnički prikladne poruke o greškama

### Data Persistence
- **JSON storage**: File-based baza u server/data/ direktoriju
- **Role-based sigurnost**: Server-side provjera dozvola za sve API pozive
- **Upravljanje sesijama**: Autentifikacija temeljena na kolačićima s automatskim čišćenjem
- **Jedinstveni ID-jevi**: Automatski generirani task i todo ID-jevi
- **Praćenje vremenske oznake**: Stvaranje i zadnje ažuriranje vremena
- **Anti-scroll modalni sustav**: Blokiranje skrolanja tijekom potvrda i dijaloga

## Sustav bilješki i komentara

### Osnovna funkcionalnost
Aplikacija podržava napredni sustav bilješki koji omogućava korisnicima dodavanje komentara na specifične dijelove dokumenata. Sustav radi u oba režima (VIEW i EDIT) i ne zahtijeva autentifikaciju za osnovne funkcionalnosti.

### Način rada s bilješkama

**1. Dodavanje bilješki na poglavlja:**
- U desnom panelu (`notes-container`) nalazi se gumb "Dodaj bilješku"
- Svako poglavlje, potpoglavlje i sekcija ima odvojene bilješke
- Bilješke mogu dodavati svi korisnici (registrirani i neregistrirani)
- Neregistrirani korisnici se označavaju kao "Visitor"

**2. Dodavanje bilješki na selektirani tekst:**
- U VIEW režimu omogućena je selekcija teksta (bez uređivanja)
- Kada se selektira tekst, pojavljuje se gumb "Dodaj bilješku" iznad selekcije
- Gumb prati poziciju skrolanja i nestaje kada tekst nije vidljiv
- Automatsko povezivanje s brojem linije u dokumentu

### Vizualni prikaz
- **Layout 3:1**: Editor zauzima 3/4 širine, notes panel 1/4
- **Kolapsibilni panel**: Notes panel se može sakriti animacijom prema desno
- **Moderne animacije**: Smooth prijelazi i hover efekti
- **Prilagodljiv dizajn**: Prilagođava se različitim veličinama ekrana

### Funkcionalnosti bilješki
- **Opis bilješke**: Obavezno polje za sadržaj komentara
- **Autor**: Ime korisnika ili "Visitor" za nelogirane
- **Datum kreiranja**: Automatski timestamp
- **Broj linije**: Automatski izračun za selektirani tekst
- **Selektirani tekst**: Čuva se izvorni selektirani sadržaj
- **Status odobrenja**: Pending/Approved stanje s vizualnim indikatorima

### Upravljanje bilješkama
- **Prihvaćanje**: Bilješke mogu biti odobrene (postaju sivije)
- **Brisanje**: Mogućnost brisanja s potvrdom
- **Sortiranje**: Najnovije bilješke prikazane prvo
- **Filtriranje**: Automatsko filtriranje po thesis/chapter ID

### Tehnička implementacija
- **Backend API**: Zasebne /api/notes rute za CRUD operacije
- **JSON pohrana**: notes.json datoteka u server/data/
- **TinyMCE integracija**: Prilagođeno rukovanje selekcijom za VIEW režim
- **React hooks**: useState/useEffect za upravljanje stanjem
- **CSS Grid/Flexbox**: Moderan prilagodljiv izgled

## Znanstveni editor

### TinyMCE integracija
Aplikacija koristi TinyMCE Cloud servis s besplatnim API ključem za napredne funkcionalnosti uređivanja znanstvenih dokumenata.

### Automatsko numeriranje
- **Tablice**: Automatski generirane kao "Tablica 1.2.1" prema hijerarhiji poglavlja
- **Slike**: Numeracija "Slika 1.2.1" s automatskim opisom
- **Jednadžbe**: Numeracija "(1.2.1)" s matematičkim formatiranjem

### Hijerarhijska struktura
- **3 razine dubine**: Glavno poglavlje → Potpoglavlje → Sekcija
- **Automatska numeracija**: 1, 1.1, 1.1.1
- **Rekurzivno brisanje**: Briše sav sadržaj uključujući djecu
- **Povuci i ispusti**: Reorganizacija poglavlja (planirana funkcionalnost)

### Funkcionalnosti prijenosa  
- **Sigurni prijenos**: Multer middleware s provjerama tipa datoteke
- **Ograničenja**: Maksimalno 5MB, samo slike
- **Automatsko imenovanje**: Jedinstvena imena datoteka
- **Integracija s uređivačem**: Direktno umetanje u TinyMCE
