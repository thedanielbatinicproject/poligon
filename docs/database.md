# Postavljanje i struktura baze podataka

Ovaj dokument detaljno opisuje kako se postavlja i koristi relacijska baza podataka za sustav znanstvenih radova. Svi koraci i sheme su prilagođeni za MariaDB/MySQL okruženje.

## 1. Postavljanje baze podataka

1. Kreirajte novu bazu podataka putem web sučelja (npr. DirectAdmin, phpMyAdmin).
2. Postavite encoding baze na `utf8mb4` i collation na `utf8mb4_unicode_ci` radi potpune podrške za hrvatski i engleski jezik, kao i specijalne znakove u LaTeX-u.
3. Preporučeni storage engine je `InnoDB` radi podrške za transakcije i strane ključeve.
4. U SQL editoru zalijepite kod iz [template.sql](./template.sql) datoteke za kreiranje svih tablica.

## 2. Struktura baze podataka

Baza se sastoji od 13 međusobno povezanih tablica:

### users
Sadrži podatke o svim korisnicima sustava (studenti, mentori, administratori).

**Atributi:**
- `user_id` (INT UNSIGNED, AUTO_INCREMENT, PRIMARY KEY): Jedinstveni identifikator korisnika.
- `first_name` (VARCHAR(100), NOT NULL): Ime korisnika.
- `last_name` (VARCHAR(100), NOT NULL): Prezime korisnika.
- `email` (VARCHAR(255), NOT NULL, UNIQUE): Email adresa korisnika, koristi se za prijavu i komunikaciju.
- `role` (ENUM('student', 'mentor', 'admin'), NOT NULL): Uloga korisnika u sustavu. Određuje razinu pristupa i dozvola.
- `preferred_language` (ENUM('hr', 'en'), DEFAULT 'hr'): Preferirani jezik korisničkog sučelja.
- `created_at` (DATETIME, NOT NULL): Datum i vrijeme kreiranja računa.
- `updated_at` (DATETIME, NOT NULL): Datum i vrijeme zadnje izmjene podataka.

**Svrha:** Centralno spremište svih korisnika. Omogućava autentifikaciju, autorizaciju i praćenje aktivnosti.

### document_types
Definira tipove dokumenata koji se mogu kreirati u sustavu.

**Atributi:**
- `type_id` (INT UNSIGNED, AUTO_INCREMENT, PRIMARY KEY): Jedinstveni identifikator tipa dokumenta.
- `type_name` (VARCHAR(50), NOT NULL, UNIQUE): Naziv tipa (npr. "diplomski", "završni", "znanstveni rad").
- `description` (TEXT): Detaljniji opis tipa dokumenta.

**Svrha:** Fleksibilno definiranje različitih kategorija radova. Omogućava proširenje sustava bez izmjene strukture baze.

### documents
Glavna tablica za radove, sadrži metapodatke i status svakog dokumenta.

**Atributi:**
- `document_id` (INT UNSIGNED, AUTO_INCREMENT, PRIMARY KEY): Jedinstveni identifikator dokumenta.
- `type_id` (INT UNSIGNED, NOT NULL, FK → document_types): Tip dokumenta.
- `title` (VARCHAR(255), NOT NULL): Naslov rada.
- `abstract` (TEXT): Sažetak rada.
- `status` (ENUM('draft', 'submitted', 'under_review', 'finished', 'graded'), NOT NULL, DEFAULT 'draft'): Trenutni status rada u workflow-u.
- `language` (ENUM('hr', 'en'), DEFAULT 'hr'): Jezik na kojem je rad pisan.
- `grade` (TINYINT UNSIGNED): Ocjena rada (0-100). NULL dok nije ocijenjeno.
- `created_by` (INT UNSIGNED, NOT NULL, FK → users): Korisnik koji je kreirao dokument (vlasnik).
- `created_at` (DATETIME, NOT NULL): Datum i vrijeme kreiranja dokumenta.
- `updated_at` (DATETIME, NOT NULL): Datum i vrijeme zadnje izmjene.

**Svrha:** Centralno spremište svih radova s metapodacima. Omogućava praćenje statusa, vlasništva i osnovnih informacija o radu.

### document_mentors
Povezuje dokumente s mentorima (više mentora po radu).

**Atributi:**
- `document_id` (INT UNSIGNED, NOT NULL, FK → documents): Dokument.
- `mentor_id` (INT UNSIGNED, NOT NULL, FK → users): Mentor (korisnik s ulogom 'mentor').
- PRIMARY KEY (document_id, mentor_id): Sprječava duplikate.

**Svrha:** Omogućava da rad ima više mentora. Koristi se za kontrolu pristupa i notifikacije.

### chapters
Poglavlja i podpoglavlja rada, podržava hijerarhiju do 3 razine dubine.

**Atributi:**
- `chapter_id` (INT UNSIGNED, AUTO_INCREMENT, PRIMARY KEY): Jedinstveni identifikator poglavlja.
- `document_id` (INT UNSIGNED, NOT NULL, FK → documents): Dokument kojem poglavlje pripada.
- `parent_chapter_id` (INT UNSIGNED, DEFAULT NULL, FK → chapters): Roditeljsko poglavlje. NULL za glavna poglavlja.
- `chapter_title` (VARCHAR(255), NOT NULL): Naslov poglavlja.
- `chapter_content` (TEXT): Sadržaj poglavlja (LaTeX/tekst).
- `chapter_order` (INT UNSIGNED, NOT NULL): Redoslijed prikazivanja poglavlja unutar roditelja.
- `version` (INT UNSIGNED, DEFAULT 1): Broj trenutne verzije poglavlja.
- `last_edited_by` (INT UNSIGNED, FK → users): Korisnik koji je zadnji uređivao poglavlje.
- `created_at` (DATETIME, NOT NULL): Datum i vrijeme kreiranja.
- `updated_at` (DATETIME, NOT NULL): Datum i vrijeme zadnje izmjene.

**Svrha:** Omogućava organizaciju rada u hijerarhijsku strukturu. Podržava praćenje verzija i zadnjeg autora izmjene. Koristi se za navigaciju, uređivanje i prikaz sadržaja.

### chapter_versions
Povijest verzija poglavlja, omogućava vraćanje na prethodne verzije.

**Atributi:**
- `version_id` (INT UNSIGNED, AUTO_INCREMENT, PRIMARY KEY): Jedinstveni identifikator verzije.
- `chapter_id` (INT UNSIGNED, NOT NULL, FK → chapters): Poglavlje.
- `version_number` (INT UNSIGNED, NOT NULL): Broj verzije.
- `edited_by` (INT UNSIGNED, NOT NULL, FK → users): Korisnik koji je kreirao ovu verziju.
- `content_snapshot` (TEXT, NOT NULL): Potpuni sadržaj poglavlja u trenutku spremanja.
- `edited_at` (DATETIME, NOT NULL): Datum i vrijeme spremanja verzije.

**Svrha:** Omogućava audit trail i vraćanje na prethodne verzije. Sprječava gubitak podataka kod konkurentnog uređivanja. Koristi se za analizu izmjena i povrat na starije verzije.

### workflow_history
Povijest promjena statusa rada (draft → submitted → finished → graded).

**Atributi:**
- `workflow_id` (INT UNSIGNED, AUTO_INCREMENT, PRIMARY KEY): Jedinstveni identifikator unosa.
- `document_id` (INT UNSIGNED, NOT NULL, FK → documents): Dokument.
- `status` (ENUM('draft', 'submitted', 'under_review', 'finished', 'graded'), NOT NULL): Novi status.
- `changed_by` (INT UNSIGNED, NOT NULL, FK → users): Korisnik koji je promijenio status.
- `changed_at` (DATETIME, NOT NULL): Datum i vrijeme promjene.

**Svrha:** Prati cijeli životni ciklus rada. Omogućava analizu vremena provedenog u svakom statusu. Koristi se za izvještaje i notifikacije.

### audit_log
Evidencija svih važnijih akcija korisnika (edit, submit, grade, upload).

**Atributi:**
- `audit_id` (INT UNSIGNED, AUTO_INCREMENT, PRIMARY KEY): Jedinstveni identifikator unosa.
- `user_id` (INT UNSIGNED, NOT NULL, FK → users): Korisnik koji je izvršio akciju.
- `action_type` (ENUM('edit', 'submit', 'grade', 'comment', 'upload'), NOT NULL): Tip akcije.
- `entity_type` (ENUM('document', 'chapter', 'file', 'task'), NOT NULL): Tip entiteta na kojem je akcija izvršena.
- `entity_id` (INT UNSIGNED, NOT NULL): ID entiteta (document_id, chapter_id, file_id, task_id).
- `action_timestamp` (DATETIME, NOT NULL): Datum i vrijeme akcije.

**Svrha:** Sigurnosni i analitički log. Omogućava praćenje tko je i kada radio što. Koristi se za detekciju zlouporabe i generiranje izvještaja o aktivnostima.

### tasks
Zadaci vezani uz radove ili globalni zadaci.

**Atributi:**
- `task_id` (INT UNSIGNED, AUTO_INCREMENT, PRIMARY KEY): Jedinstveni identifikator zadatka.
- `created_by` (INT UNSIGNED, NOT NULL, FK → users): Korisnik koji je kreirao zadatak.
- `assigned_to` (INT UNSIGNED, DEFAULT NULL, FK → users): Korisnik kojem je zadatak dodijeljen. NULL za globalne zadatke.
- `document_id` (INT UNSIGNED, DEFAULT NULL, FK → documents): Dokument s kojim je zadatak povezan. NULL za globalne zadatke.
- `task_title` (VARCHAR(255), NOT NULL): Naslov zadatka.
- `task_description` (TEXT): Detaljniji opis zadatka.
- `task_status` (ENUM('open', 'closed'), NOT NULL, DEFAULT 'open'): Status zadatka.
- `created_at` (DATETIME, NOT NULL): Datum i vrijeme kreiranja.
- `updated_at` (DATETIME, NOT NULL): Datum i vrijeme zadnje izmjene.

**Svrha:** Omogućava organizaciju rada kroz sustav zadataka. Može biti povezan s konkretnim radom ili biti globalan. Koristi se za upravljanje projektom i komunikaciju između korisnika.

### messages
Poruke između korisnika sustava.

**Atributi:**
- `message_id` (INT UNSIGNED, AUTO_INCREMENT, PRIMARY KEY): Jedinstveni identifikator poruke.
- `sender_id` (INT UNSIGNED, NOT NULL, FK → users): Pošiljatelj.
- `receiver_id` (INT UNSIGNED, NOT NULL, FK → users): Primatelj.
- `message_content` (TEXT, NOT NULL): Sadržaj poruke.
- `sent_at` (DATETIME, NOT NULL): Datum i vrijeme slanja.

**Svrha:** Omogućava internu komunikaciju između korisnika. Koristi se za koordinaciju rada, pitanja i povratne informacije.

### file_uploads
Uploadane datoteke (slike, PDF) vezane uz radove i poglavlja.

**Atributi:**
- `file_id` (INT UNSIGNED, AUTO_INCREMENT, PRIMARY KEY): Jedinstveni identifikator datoteke.
- `document_id` (INT UNSIGNED, NOT NULL, FK → documents): Dokument kojem datoteka pripada.
- `chapter_id` (INT UNSIGNED, DEFAULT NULL, FK → chapters): Poglavlje kojem datoteka pripada. NULL ako je vezana za cijeli dokument.
- `uploaded_by` (INT UNSIGNED, NOT NULL, FK → users): Korisnik koji je uploadao datoteku.
- `file_path` (VARCHAR(255), NOT NULL): Relativna putanja do datoteke na serveru.
- `file_type` (ENUM('image', 'pdf'), NOT NULL): Tip datoteke.
- `file_size` (INT UNSIGNED, NOT NULL): Veličina datoteke u bajtovima.
- `uploaded_at` (DATETIME, NOT NULL): Datum i vrijeme uploada.

**Svrha:** Prati sve datoteke vezane uz radove. Omogućava kontrolu pristupa, ograničenje veličine i povezivanje s konkretnim poglavljima. Koristi se za prikaz slika, grafikona i priloga.

### api_keys
API ključevi za eksterni pristup sustavu.

**Atributi:**
- `api_key_id` (INT UNSIGNED, AUTO_INCREMENT, PRIMARY KEY): Jedinstveni identifikator ključa.
- `user_id` (INT UNSIGNED, NOT NULL, FK → users): Korisnik kojem ključ pripada.
- `api_key` (VARCHAR(255), NOT NULL, UNIQUE): Jedinstveni API ključ.
- `access_type` (ENUM('external', 'student', 'teacher', 'admin'), NOT NULL): Tip pristupa koji ključ omogućava.
- `created_at` (DATETIME, NOT NULL): Datum i vrijeme kreiranja ključa.
- `expires_at` (DATETIME, DEFAULT NULL): Datum i vrijeme isteka. NULL za ključeve koji ne istječu.

**Svrha:** Omogućava programatski pristup sustavu putem API-ja. Različiti tipovi pristupa omogućavaju granularnu kontrolu nad dozvolama. Koristi se za integracije s vanjskim sustavima (npr. ISVU) i mobilne aplikacije.

### sessions
Sprema korisničke sesije i stanje aplikacije za vraćanje korisničkog iskustva.

**Atributi:**
- `session_id` (VARCHAR(128), PRIMARY KEY): Jedinstveni identifikator sesije (generiran od express-session).
- `user_id` (INT UNSIGNED, NOT NULL, FK → users): Korisnik kojem sesija pripada.
- `session_data` (JSON, NOT NULL): Serijalizirani session objekt (user info, preferences).
- `last_route` (VARCHAR(255)): Zadnja posjećena ruta/stranica (npr. "/document/123/chapter/5").
- `last_document_id` (INT UNSIGNED, DEFAULT NULL, FK → documents): Zadnji otvoreni dokument. NULL ako nije u kontekstu dokumenta.
- `last_chapter_id` (INT UNSIGNED, DEFAULT NULL, FK → chapters): Zadnje otvoreno poglavlje. NULL ako nije u kontekstu poglavlja.
- `scroll_position` (INT, DEFAULT 0): Pozicija scrollanja u pixelima na zadnjoj stranici.
- `sidebar_state` (ENUM('open', 'closed'), DEFAULT 'open'): Stanje sidebar-a (otvoreno/zatvoreno).
- `theme` (ENUM('light', 'dark', 'auto'), DEFAULT 'light'): Odabrana tema korisničkog sučelja.
- `user_agent` (TEXT): Browser i OS informacije za security audit.
- `ip_address` (VARCHAR(45)): IP adresa korisnika (podržava IPv4 i IPv6).
- `created_at` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP): Vrijeme kreiranja sesije.
- `last_activity` (DATETIME, NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP): Vrijeme zadnje aktivnosti (automatski se ažurira).
- `expires_at` (DATETIME, NOT NULL): Vrijeme isteka sesije (obično 24h ili 7 dana od zadnje aktivnosti).

**Indeksi:**
- `idx_user_id`: Brzo pretraživanje sesija po korisniku.
- `idx_expires_at`: Efficient cleanup isteklih sesija (cron job ili DB event).
- `idx_last_activity`: Praćenje aktivnih korisnika i statistika.

**Strane ključeve:**
- `user_id` → `users(user_id)` ON DELETE CASCADE: Brisanje korisnika briše sve njegove sesije.
- `last_document_id` → `documents(document_id)` ON DELETE SET NULL: Brisanje dokumenta ne briše sesiju, samo resetira last_document_id.
- `last_chapter_id` → `chapters(chapter_id)` ON DELETE SET NULL: Brisanje poglavlja resetira last_chapter_id.

**Svrha:** Omogućava perzistentno korisničko iskustvo — kada se korisnik vrati, aplikacija ga vraća na zadnju stranicu, zadnje otvoreno poglavlje, scroll poziciju i sve UI postavke (tema, sidebar). Koristi se za autentifikaciju (session-based auth), praćenje aktivnosti i security audit (IP, user agent). Podaci u `session_data` JSON polju omogućavaju fleksibilno spremanje custom session varijabli bez izmjene sheme.

**Najbolje prakse:**
- Automatski čisti istekle sesije putem cron job-a ili MySQL event-a (`DELETE FROM sessions WHERE expires_at < NOW()`).
- Produžava `expires_at` na svakom request-u (sliding expiration pattern).
- `scroll_position` i UI state se ažuriraju throttled-om (npr. svake 3 sekunde) da se izbjegne prekomjerna write load.
- Session rotation: regeneriraj `session_id` nakon logina (sprječava session fixation attack).

## 3. Relacije i sheme

### Glavni odnosi između tablica:

- **users 1---N documents**: Korisnik može biti vlasnik više dokumenata.
- **users N---N documents** (preko document_mentors): Dokument može imati više mentora, mentor može biti na više dokumenata.
- **users 1---N sessions**: Korisnik može imati više aktivnih sesija (multi-device login).
- **sessions N---1 documents**: Sesija može referencirati zadnje otvoreni dokument.
- **sessions N---1 chapters**: Sesija može referencirati zadnje otvoreno poglavlje.
- **document_types 1---N documents**: Svaki tip dokumenta može imati više dokumenata.
- **documents 1---N chapters**: Dokument sadrži više poglavlja.
- **chapters N---1 chapters** (self-reference): Poglavlje može imati roditeljsko poglavlje (hijerarhija).
- **chapters 1---N chapter_versions**: Svako poglavlje ima više verzija.
- **documents 1---N workflow_history**: Svaki dokument ima povijest statusa.
- **documents 1---N tasks**: Dokument može imati više zadataka.
- **users 1---N tasks**: Korisnik može kreirati i biti dodijeljen više zadataka.
- **users 1---N messages**: Korisnik može slati i primati poruke.
- **documents 1---N file_uploads**: Dokument može imati više uploadanih datoteka.
- **chapters 1---N file_uploads**: Poglavlje može imati više uploadanih datoteka.
- **users 1---N api_keys**: Korisnik može imati više API ključeva.
- **users 1---N audit_log**: Svaka akcija korisnika se bilježi u audit log.

### Ključne značajke modela:

- **Normalizacija**: Baza je normalizirana do 3NF (Third Normal Form) radi eliminacije redundancije.
- **Referentni integritet**: Strani ključevi osiguravaju konzistentnost podataka.
- **Indeksiranje**: Svi primarni i strani ključevi su automatski indeksirani radi performansi.
- **Skalabilnost**: Model podržava veliki broj korisnika, dokumenata i verzija.
- **Fleksibilnost**: Tipovi dokumenata, statusi i tipovi pristupa mogu se lako proširivati.
- **Audit trail**: Svaka važnija akcija se bilježi za sigurnost i analizu.

## 4. Kreiranje baze

SQL kod za kreiranje svih tablica nalazi se u [template.sql](./template.sql).

**Koraci za kreiranje:**
1. Otvorite phpMyAdmin ili sličan alat.
2. Odaberite Vašu bazu podataka.
3. Kliknite na "SQL" tab.
4. Zalijepite kompletan SQL kod iz template.sql datoteke.
5. Kliknite "Go" ili "Execute" za izvršavanje koda.
6. Provjerite da su sve tablice uspješno kreirane.

## 5. Pristup i administracija

### Preporučeni alati:
- **phpMyAdmin**: Web-based GUI za administraciju baze.
- **MySQL Workbench**: Desktop aplikacija za naprednu administraciju.
- **Adminer**: Lagan web-based alat kao alternativa phpMyAdmin-u.

### Najbolje prakse:
- Redovno pravite backup baze podataka.
- Koristite različite korisničke račune za aplikaciju i administraciju.
- Omogućite SSL konekciju između aplikacije i baze.
- Pratite audit_log tablicu za sumnjive aktivnosti.
- Redovno čistite stare verzije poglavlja ako nisu potrebne.
- Postavljajte expires_at datum za API ključeve.

## 6. Buduća proširenja

Model baze je dizajniran za buduća proširenja:

- **Kolaborativno uređivanje**: Može se dodati tablica za real-time sesije uređivanja.
- **Notifikacije**: Tablica za sistemske notifikacije i obavijesti.
- **Grupe korisnika**: Organizacija studenata u grupe/godine/kohorte.
- **Predlošci dokumenata**: Spremanje i dijeljenje predložaka.
- **Plagijarizam check**: Integracija s vanjskim servisima za detekciju plagijata.
- **Izvoz u formate**: Praćenje povijesti izvoza u PDF, DOCX, LaTeX.
- **Statistika korištenja**: Detaljnija analitika i izvještaji.

---

Za dodatna pitanja ili potrebu za prilagodbom modela, kontaktirajte administratora sustava ili voditelja projekta.
