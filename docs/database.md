# Postavljanje i struktura baze podataka

Ovaj dokument detaljno opisuje kako se postavlja i koristi relacijska baza podataka za sustav znanstvenih radova. Svi koraci i sheme su prilagođeni za MariaDB/MySQL okruženje.

## 1. Postavljanje baze podataka

1. Kreirajte novu bazu podataka putem web sučelja (npr. DirectAdmin, phpMyAdmin).
2. Postavite encoding baze na `utf8mb4` i collation na `utf8mb4_unicode_ci` radi potpune podrške za hrvatski i engleski jezik, kao i specijalne znakove u LaTeX-u.
3. Preporučeni storage engine je `InnoDB` radi podrške za transakcije i strane ključeve.
4. U SQL editoru zalijepite kod iz [template.sql](./template.sql) datoteke za kreiranje svih tablica.

## 2. Struktura baze podataka

Baza se sastoji od 11 međusobno povezanih tablica (optimizirano za LaTeX dokumente bez poglavlja):

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
Glavna tablica za radove, sadrži metapodatke, status i cjelokupan LaTeX sadržaj svakog dokumenta.

**Atributi:**
- `document_id` (INT UNSIGNED, AUTO_INCREMENT, PRIMARY KEY): Jedinstveni identifikator dokumenta.
- `type_id` (INT UNSIGNED, NOT NULL, FK → document_types): Tip dokumenta.
- `title` (VARCHAR(255), NOT NULL): Naslov rada.
- `abstract` (TEXT): Sažetak rada.
- `latex_content` (LONGTEXT): Cjelokupan LaTeX izvorni kod dokumenta. Može sadržavati sve LaTeX pakete, matematiku, tablice, slike itd.
- `compiled_pdf_path` (VARCHAR(255)): Relativna putanja do kompajliranog PDF-a. NULL ako dokument još nije kompajliran.
- `status` (ENUM('draft', 'submitted', 'under_review', 'finished', 'graded'), NOT NULL, DEFAULT 'draft'): Trenutni status rada u workflow-u.
- `language` (ENUM('hr', 'en'), DEFAULT 'hr'): Jezik na kojem je rad pisan.
- `grade` (TINYINT UNSIGNED): Ocjena rada (0-100). NULL dok nije ocijenjeno.
- `created_by` (INT UNSIGNED, NOT NULL, FK → users): Korisnik koji je kreirao dokument (vlasnik).
- `created_at` (DATETIME, NOT NULL): Datum i vrijeme kreiranja dokumenta.
- `updated_at` (DATETIME, NOT NULL): Datum i vrijeme zadnje izmjene.

**Svrha:** Centralno spremište svih radova s metapodacima i potpunim LaTeX sadržajem. Omogućava praćenje statusa, vlasništva, verzioniranje i kompajliranje u PDF. Struktura je pojednostavljena — umjesto hijerarhije poglavlja, cijeli rad je jedan LaTeX dokument koji korisnik uređuje u split-screen editoru (Monaco + KaTeX preview).

### document_mentors
Povezuje dokumente s mentorima (više mentora po radu).

**Atributi:**
- `document_id` (INT UNSIGNED, NOT NULL, FK → documents): Dokument.
- `mentor_id` (INT UNSIGNED, NOT NULL, FK → users): Mentor (korisnik s ulogom 'mentor').
- PRIMARY KEY (document_id, mentor_id): Sprječava duplikate.

**Svrha:** Omogućava da rad ima više mentora. Koristi se za kontrolu pristupa i notifikacije.

### document_versions
Povijest verzija cjelokupnog dokumenta, omogućava vraćanje na prethodne verzije.

**Atributi:**
- `version_id` (INT UNSIGNED, AUTO_INCREMENT, PRIMARY KEY): Jedinstveni identifikator verzije.
- `document_id` (INT UNSIGNED, NOT NULL, FK → documents): Dokument kojem verzija pripada.
- `version_number` (INT UNSIGNED, NOT NULL): Broj verzije (1, 2, 3...).
- `edited_by` (INT UNSIGNED, NOT NULL, FK → users): Korisnik koji je kreirao ovu verziju.
- `latex_snapshot` (LONGTEXT, NOT NULL): Potpuni LaTeX izvorni kod u trenutku spremanja verzije.
- `compiled_pdf_path` (VARCHAR(255)): Putanja do PDF-a ove verzije (ako je kompajliran).
- `edited_at` (DATETIME, NOT NULL): Datum i vrijeme spremanja verzije.

**Strane ključeve:**
- `document_id` → `documents(document_id)` ON DELETE CASCADE: Brisanje dokumenta briše sve njegove verzije.
- `edited_by` → `users(user_id)`: Prati autora verzije.

**Svrha:** Omogućava audit trail i vraćanje na prethodne verzije. Sprječava gubitak podataka kod grešaka u uređivanju. Svaka značajna promjena (npr. svaki save ili autosave na svakih 30 sekundi) sprema novu verziju. Koristi se za analizu izmjena, diff između verzija i povrat na starije verzije. Za razliku od starih chapter_versions, ova tablica prati cijeli dokument kao jedan LaTeX file.

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
Evidencija svih važnijih akcija korisnika (edit, submit, grade, upload, compile).

**Atributi:**
- `audit_id` (INT UNSIGNED, AUTO_INCREMENT, PRIMARY KEY): Jedinstveni identifikator unosa.
- `user_id` (INT UNSIGNED, NOT NULL, FK → users): Korisnik koji je izvršio akciju.
- `action_type` (ENUM('edit', 'submit', 'grade', 'comment', 'upload', 'compile'), NOT NULL): Tip akcije. 'compile' je nova akcija za PDF kompajliranje.
- `entity_type` (ENUM('document', 'file', 'task'), NOT NULL): Tip entiteta na kojem je akcija izvršena. 'chapter' je maknut jer više ne postoje poglavlja.
- `entity_id` (INT UNSIGNED, NOT NULL): ID entiteta (document_id, file_id, task_id).
- `action_timestamp` (DATETIME, NOT NULL): Datum i vrijeme akcije.

**Svrha:** Sigurnosni i analitički log. Omogućava praćenje tko je i kada radio što. Koristi se za detekciju zlouporabe i generiranje izvještaja o aktivnostima. Prilagođeno za LaTeX workflow — prati editiranje cjelokupnog dokumenta i PDF kompajliranje.

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
Uploadane datoteke (slike, PDF, .bib, .tex) vezane uz radove.

**Atributi:**
- `file_id` (INT UNSIGNED, AUTO_INCREMENT, PRIMARY KEY): Jedinstveni identifikator datoteke.
- `document_id` (INT UNSIGNED, NOT NULL, FK → documents): Dokument kojem datoteka pripada.
- `uploaded_by` (INT UNSIGNED, NOT NULL, FK → users): Korisnik koji je uploadao datoteku.
- `file_path` (VARCHAR(255), NOT NULL): Relativna putanja do datoteke na serveru.
- `file_type` (ENUM('image', 'pdf', 'bib', 'tex'), NOT NULL): Tip datoteke. Dodani 'bib' (bibliography) i 'tex' (LaTeX includes).
- `file_size` (INT UNSIGNED, NOT NULL): Veličina datoteke u bajtovima.
- `uploaded_at` (DATETIME, NOT NULL): Datum i vrijeme uploada.

**Strane ključeve:**
- `document_id` → `documents(document_id)` ON DELETE CASCADE: Brisanje dokumenta briše sve njegove datoteke.
- `uploaded_by` → `users(user_id)`: Prati autora uploada.

**Svrha:** Prati sve datoteke vezane uz radove. Omogućava kontrolu pristupa, ograničenje veličine i povezivanje s dokumentom. **Važna promjena:** Maknut je `chapter_id` jer više ne postoje poglavlja — sve datoteke su vezane direktno uz dokument. Slike se umeću u LaTeX kod sa `\includegraphics{}`, a .bib datoteke za bibliografiju.

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
- `last_route` (VARCHAR(255)): Zadnja posjećena ruta/stranica (npr. "/document/123").
- `last_document_id` (INT UNSIGNED, DEFAULT NULL, FK → documents): Zadnji otvoreni dokument. NULL ako nije u kontekstu dokumenta.
- `editor_cursor_position` (INT, DEFAULT 0): Pozicija cursora u Monaco editoru (character offset).
- `editor_scroll_line` (INT, DEFAULT 0): Linija na koju je editor scrollan (za vraćanje na istu poziciju).
- `scroll_position` (INT, DEFAULT 0): Pozicija scrollanja u pixelima na zadnjoj stranici (za preview pane).
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

**Važne promjene za LaTeX editor:**
- **Maknut:** `last_chapter_id` (više ne postoje poglavlja)
- **Dodano:** `editor_cursor_position` i `editor_scroll_line` za vraćanje na TOČNU poziciju u Monaco editoru

**Svrha:** Omogućava perzistentno korisničko iskustvo — kada se korisnik vrati, aplikacija ga vraća na zadnju stranicu, zadnji otvoreni dokument, **točnu poziciju cursora u editoru**, scroll poziciju i sve UI postavke (tema, sidebar). Koristi se za autentifikaciju (session-based auth), praćenje aktivnosti i security audit (IP, user agent). Prilagođeno za split-screen LaTeX editor workflow.

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
- **document_types 1---N documents**: Svaki tip dokumenta može imati više dokumenata.
- **documents 1---N document_versions**: Svaki dokument ima više verzija (snapshot povijesti).
- **documents 1---N workflow_history**: Svaki dokument ima povijest statusa.
- **documents 1---N tasks**: Dokument može imati više zadataka.
- **documents 1---N file_uploads**: Dokument može imati više uploadanih datoteka (slike, .bib, .tex).
- **users 1---N tasks**: Korisnik može kreirati i biti dodijeljen više zadataka.
- **users 1---N messages**: Korisnik može slati i primati poruke.
- **users 1---N api_keys**: Korisnik može imati više API ključeva.
- **users 1---N audit_log**: Svaka akcija korisnika se bilježi u audit log.

### Ključne značajke modela:

- **Normalizacija**: Baza je normalizirana do 3NF (Third Normal Form) radi eliminacije redundancije.
- **Referentni integritet**: Strani ključevi osiguravaju konzistentnost podataka.
- **Indeksiranje**: Svi primarni i strani ključevi su automatski indeksirani radi performansi.
- **Skalabilnost**: Model podržava veliki broj korisnika, dokumenata i verzija.
- **Fleksibilnost**: Tipovi dokumenata, statusi i tipovi pristupa mogu se lako proširivati.
- **Audit trail**: Svaka važnija akcija se bilježi za sigurnost i analizu.
- **LaTeX-optimizirano**: Struktura je pojednostavljena za rad s cjelokupnim LaTeX dokumentima umjesto fragmentirane hijerarhije poglavlja. Omogućava brzo učitavanje, verzioniranje i kompajliranje punih .tex fileova.

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
- Redovno čistite stare verzije dokumenata ako nisu potrebne (document_versions može brzo rasti).
- Postavljajte expires_at datum za API ključeve.
- Optimizirajte LONGTEXT polja (`latex_content`, `latex_snapshot`) — koristite kompresiju na DB nivou ili aplikacijskom nivou za velike dokumente.

## 6. Buduća proširenja

Model baze je dizajniran za buduća proširenja:

- **Kolaborativno uređivanje**: Može se dodati tablica za real-time collaborative editing sesije (CRDT ili Operational Transform).
- **LaTeX kompajliranje**: Tablica za queue kompajliranja (compile_queue) s prioritetima i statusom.
- **Notifikacije**: Tablica za sistemske notifikacije i obavijesti.
- **Grupe korisnika**: Organizacija studenata u grupe/godine/kohorte.
- **Predlošci dokumenata**: Spremanje i dijeljenje LaTeX predložaka (thesis templates, article templates).
- **Plagijarizam check**: Integracija s vanjskim servisima za detekciju plagijata.
- **Izvoz u formate**: Praćenje povijesti izvoza (PDF, HTML, DOCX).
- **Statistika korištenja**: Detaljnija analitika i izvještaji (compiler errors, compile time, document length).
- **BibTeX management**: Dedicirani spremnik za bibliografiju (tablica `bibliography_entries`).

---

**Napomena:** Ova verzija sheme je optimizirana za LaTeX workflow sa Monaco editorom i KaTeX preview-om. Poglavlja su eliminirana jer LaTeX prirodno podržava strukturu kroz `\section{}`, `\subsection{}` i `\chapter{}` komande unutar samog dokumenta.

---

Za dodatna pitanja ili potrebu za prilagodbom modela, kontaktirajte administratora sustava ili voditelja projekta.
