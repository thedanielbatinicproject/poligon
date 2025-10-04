import React, { useState } from 'react';
import './Home.css';

const Home = () => {
    const [activeSection, setActiveSection] = useState(null);

    const toggleSection = (section) => {
        setActiveSection(activeSection === section ? null : section);
    };

    return (
        <div className="home-page">
            <div className="hero-section">
                <div className="hero-content">
                    <h1>Poligon</h1>
                    <p className="hero-subtitle">Specijalizirana platforma za kreiranje znanstvenih radova</p>
                    <p className="hero-description">
                        Jednostavna plug-and-play aplikacija za pisanje diplomskih radova s naprednim funkcionalnostima 
                        znanstvenog formatiranja i hijerarhijskom organizacijom poglavlja.
                    </p>
                </div>
            </div>

            <div className="guide-section">
                <h2>Vodič za korištenje</h2>
                
                <div className="user-types">
                    <div className="user-type-card">
                        <h3>VIEWER Režim</h3>
                        <p>Pregled i čitanje dokumenata bez potrebe za prijavljujem</p>
                    </div>
                    <div className="user-type-card">
                        <h3>EDITOR Režim</h3>
                        <p>Potpuno uređivanje s mogućnostima kreiranja i brisanja</p>
                    </div>
                </div>

                <div className="guide-sections">
                    <div className="guide-item">
                        <div 
                            className={`guide-header ${activeSection === 'getting-started' ? 'active' : ''}`}
                            onClick={() => toggleSection('getting-started')}
                        >
                            <h3>Prvi koraci</h3>
                            <span className="toggle-icon">{activeSection === 'getting-started' ? '−' : '+'}</span>
                        </div>
                        {activeSection === 'getting-started' && (
                            <div className="guide-content">
                                <ol>
                                    <li><strong>Pristup aplikaciji:</strong> Otvorite aplikaciju u web-pregledniku</li>
                                    <li><strong>Odabir režima:</strong> Aplikacija automatski otkriva jeste li prijavljeni</li>
                                    <li><strong>VIEWER:</strong> Odaberite dokument iz liste za pregled</li>
                                    <li><strong>EDITOR:</strong> Prijavite se i kreirajte novi dokument ili uređujte postojeći</li>
                                </ol>
                            </div>
                        )}
                    </div>

                    <div className="guide-item">
                        <div 
                            className={`guide-header ${activeSection === 'documents' ? 'active' : ''}`}
                            onClick={() => toggleSection('documents')}
                        >
                            <h3>Upravljanje dokumentima</h3>
                            <span className="toggle-icon">{activeSection === 'documents' ? '−' : '+'}</span>
                        </div>
                        {activeSection === 'documents' && (
                            <div className="guide-content">
                                <h4>Kreiranje novog dokumenta:</h4>
                                <ul>
                                    <li>Kliknite "Stvori novi dokument"</li>
                                    <li>Automatski se stvara s osnovnim metapodacima</li>
                                    <li>Počnite dodavati poglavlja odmah</li>
                                </ul>
                                <h4>Upravljanje metapodacima:</h4>
                                <ul>
                                    <li>Kliknite "Upravljaj dokumentima"</li>
                                    <li>Uređujte naslov, autora, mentora, fakultet</li>
                                    <li>Postavite preporučeni broj riječi</li>
                                    <li>Mogućnost brisanja dokumenta s potvrdom</li>
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="guide-item">
                        <div 
                            className={`guide-header ${activeSection === 'chapters' ? 'active' : ''}`}
                            onClick={() => toggleSection('chapters')}
                        >
                            <h3>Hijerarhijska poglavlja</h3>
                            <span className="toggle-icon">{activeSection === 'chapters' ? '−' : '+'}</span>
                        </div>
                        {activeSection === 'chapters' && (
                            <div className="guide-content">
                                <h4>Struktura poglavlja:</h4>
                                <ul>
                                    <li><strong>Razina 1:</strong> Glavna poglavlja (1, 2, 3...)</li>
                                    <li><strong>Razina 2:</strong> Potpoglavlja (1.1, 1.2, 1.3...)</li>
                                    <li><strong>Razina 3:</strong> Sekcije (1.1.1, 1.1.2, 1.1.3...)</li>
                                </ul>
                                <h4>Dodavanje poglavlja:</h4>
                                <ul>
                                    <li>Postavite pokazivač preko postojećeg poglavlja</li>
                                    <li>Kliknite zeleni gumb "+"</li>
                                    <li>Automatski se stvara potpoglavlje</li>
                                </ul>
                                <h4>Brisanje poglavlja:</h4>
                                <ul>
                                    <li>Postavite pokazivač preko poglavlja</li>
                                    <li>Kliknite crveni gumb "×"</li>
                                    <li>Potvrda za brisanje uključujući sva potpoglavlja</li>
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="guide-item">
                        <div 
                            className={`guide-header ${activeSection === 'editor' ? 'active' : ''}`}
                            onClick={() => toggleSection('editor')}
                        >
                            <h3>Znanstveni editor</h3>
                            <span className="toggle-icon">{activeSection === 'editor' ? '−' : '+'}</span>
                        </div>
                        {activeSection === 'editor' && (
                            <div className="guide-content">
                                <h4>TinyMCE funkcionalnosti:</h4>
                                <ul>
                                    <li>Potpuni WYSIWYG editor</li>
                                    <li>Znanstveno formatiranje (Times New Roman, A4)</li>
                                    <li>Tablice s automatskim okvirima</li>
                                    <li>Prijenos i umetanje slika</li>
                                    <li>Matematičke jednadžbe</li>
                                </ul>
                                <h4>Automatsko numeriranje:</h4>
                                <ul>
                                    <li><strong>Tablice:</strong> "Tablica 1.2.1" prema hijerarhiji poglavlja</li>
                                    <li><strong>Slike:</strong> "Slika 1.2.1" s automatskim opisom</li>
                                    <li><strong>Jednadžbe:</strong> "(1.2.1)" s matematičkim formatiranjem</li>
                                </ul>
                                <h4>Toolbar funkcije:</h4>
                                <ul>
                                    <li>Gumbovi za brzu tablicu, sliku, jednadžbu</li>
                                    <li>Brojači elemenata u realnom vremenu</li>
                                    <li>Skriveno u PREGLJEDNI režimu</li>
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="guide-item">
                        <div 
                            className={`guide-header ${activeSection === 'tasks' ? 'active' : ''}`}
                            onClick={() => toggleSection('tasks')}
                        >
                            <h3>Zadaci i todo liste</h3>
                            <span className="toggle-icon">{activeSection === 'tasks' ? '−' : '+'}</span>
                        </div>
                        {activeSection === 'tasks' && (
                            <div className="guide-content">
                                <h4>Upravljanje zadacima:</h4>
                                <ul>
                                    <li>Stvorite zadatke povezane s dokumentima ili poglavljima</li>
                                    <li>Postavite datume dospijeća s prioritetima</li>
                                    <li>Filtrirajte zadatke po dokumentima</li>
                                    <li>Označite zadatke kao završene</li>
                                </ul>
                                <h4>Todo liste:</h4>
                                <ul>
                                    <li>Stvorite brze bilješke i planove</li>
                                    <li>Dostupno i neregistriranim korisnicima</li>
                                    <li>Organizirajte po dokumentima ili globalno</li>
                                </ul>
                                <h4>Dozvole i sigurnost:</h4>
                                <ul>
                                    <li><strong>Admin:</strong> Može uređivati sve zadatke i todoove</li>
                                    <li><strong>Korisnici:</strong> Mogu uređivati samo svoje stavke</li>
                                    <li><strong>Neregistrirani:</strong> Ne mogu stvarati zadatke, samo todo-ove</li>
                                    <li>Vidljivost dokumenata ovisi o vlasništvu i dozvolama uređivanja</li>
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="guide-item">
                        <div 
                            className={`guide-header ${activeSection === 'features' ? 'active' : ''}`}
                            onClick={() => toggleSection('features')}
                        >
                            <h3>Napredne funkcionalnosti</h3>
                            <span className="toggle-icon">{activeSection === 'features' ? '−' : '+'}</span>
                        </div>
                        {activeSection === 'features' && (
                            <div className="guide-content">
                                <h4>Automatsko čuvanje stanja:</h4>
                                <ul>
                                    <li>Pamti zadnji otvoreni dokument</li>
                                    <li>Vraća na zadnje poglavlje</li>
                                    <li>Čuva poziciju nakon refresh-a</li>
                                </ul>
                                <h4>Prijenos slika:</h4>
                                <ul>
                                    <li>Najveća veličina 5 MB po slici</li>
                                    <li>Podržani formati: JPG, PNG, GIF</li>
                                    <li>Automatsko imenovanje i spremanje</li>
                                </ul>
                                <h4>Prilagodljivi dizajn:</h4>
                                <ul>
                                    <li>Optimizirano za stolna i mobilna računala</li>
                                    <li>Prilagodljiva alatna traka i navigacija</li>
                                    <li>Kontrole prilagođene dodiru</li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="advantages-section">
                <h2>Prednosti u odnosu na Word/Google Docs</h2>
                <div className="advantages-grid">
                    <div className="advantage-card">
                        <h3>Specijalizacija</h3>
                        <p>Razvijen specifično za znanstvene radove s automatskim numeriranjem i formatiranjem</p>
                    </div>
                    <div className="advantage-card">
                        <h3>Hijerarhija</h3>
                        <p>Intuitivna organizacija poglavlja s vizualnom hijerarhijom i automatskim brojevima</p>
                    </div>
                    <div className="advantage-card">
                        <h3>Jednostavnost</h3>
                        <p>Plug-and-play pristup bez složenih konfiguracija ili instalacija</p>
                    </div>
                    <div className="advantage-card">
                        <h3>Web-based</h3>
                        <p>Pristup s bilo kojeg uređaja kroz web-pregljednik bez potrebe za dodatnim programskim rješenjima</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;