import React, { useState } from 'react';
import './About.css';

const About = () => {
    const [activeSection, setActiveSection] = useState(null);

    const toggleSection = (section) => {
        setActiveSection(activeSection === section ? null : section);
    };

    return (
        <div className="about-page">
            <div className="about-header">
                <h1>O aplikaciji</h1>
                <p className="about-subtitle">Tehnički pregled i informacije o razvoju</p>
                <div className="project-info">
                    <div className="info-item">
                        <strong>Kreator:</strong> Daniel Batinić
                    </div>
                    <div className="info-item">
                        <strong>Institucija:</strong> Fakultet elektrotehnike i računarstva u Zagrebu
                    </div>
                    <div className="info-item">
                        <strong>Datum razvoja:</strong> Listopad 2025
                    </div>
                    <div className="info-item">
                        <strong>Tip projekta:</strong> Privatni akademski projekt
                    </div>
                </div>
            </div>

            <div className="tech-sections">
                <div className="tech-item">
                    <div 
                        className={`tech-header ${activeSection === 'architecture' ? 'active' : ''}`}
                        onClick={() => toggleSection('architecture')}
                    >
                        <h3>Tehnička arhitektura</h3>
                        <span className="toggle-icon">{activeSection === 'architecture' ? '−' : '+'}</span>
                    </div>
                    {activeSection === 'architecture' && (
                        <div className="tech-content">
                            <h4>Frontend tehnologije:</h4>
                            <ul>
                                <li><strong>React 18:</strong> Moderna komponentna arhitektura s hooks-ima</li>
                                <li><strong>JavaScript ES6+:</strong> Asinkroni pristup i moderne značajke</li>
                                <li><strong>Monaco Editor:</strong> VS Code editor za LaTeX s syntax highlighting-om</li>
                                <li><strong>KaTeX:</strong> Brzi math renderer za LaTeX preview</li>
                                <li><strong>latex.js + jsPDF:</strong> LaTeX kompajliranje i PDF generiranje u browseru</li>
                                <li><strong>CSS3:</strong> Responzivni dizajn s CSS varijablama</li>
                                <li><strong>Webpack 5:</strong> Module bundling i optimizacija</li>
                            </ul>
                            <h4>Backend tehnologije:</h4>
                            <ul>
                                <li><strong>Node.js:</strong> Server-side JavaScript runtime</li>
                                <li><strong>Express.js:</strong> Minimalistički web framework</li>
                                <li><strong>Multer:</strong> Middleware za upload datoteka</li>
                                <li><strong>node-json-db:</strong> Jednostavna JSON baza podataka</li>
                                <li><strong>Cookie Parser:</strong> Session management</li>
                            </ul>
                        </div>
                    )}
                </div>

                <div className="tech-item">
                    <div 
                        className={`tech-header ${activeSection === 'design-decisions' ? 'active' : ''}`}
                        onClick={() => toggleSection('design-decisions')}
                    >
                        <h3>Odluke o dizajnu</h3>
                        <span className="toggle-icon">{activeSection === 'design-decisions' ? '−' : '+'}</span>
                    </div>
                    {activeSection === 'design-decisions' && (
                        <div className="tech-content">
                            <h4>React + Express kombinacija:</h4>
                            <ul>
                                <li>Brz development ciklus</li>
                                <li>Jednostavno održavanje</li>
                                <li>Skalabilnost i performanse</li>
                                <li>Bogat ekosustav paketa</li>
                            </ul>
                            <h4>LaTeX Editor:</h4>
                            <ul>
                                <li>Split-screen prikaz (kod + preview) kao Overleaf</li>
                                <li>Monaco editor s punom LaTeX syntax podrškom</li>
                                <li>Client-side PDF kompajliranje putem latex.js</li>
                                <li>Auto-save svake 30 sekundi</li>
                                <li>Customizable toolbar za brzo umetanje struktura</li>
                                <li>Verzioniranje dokumenata za audit trail</li>
                            </ul>
                            <h4>JSON baza umjesto SQL:</h4>
                            <ul>
                                <li>Jednostavnost deployment-a</li>
                                <li>Nema potrebe za vanjskim servisima</li>
                                <li>Brže za prototipiranje</li>
                                <li>Manje overhead-a za manje aplikacije</li>
                            </ul>
                        </div>
                    )}
                </div>

                <div className="tech-item">
                    <div 
                        className={`tech-header ${activeSection === 'features' ? 'active' : ''}`}
                        onClick={() => toggleSection('features')}
                    >
                        <h3>Ključne funkcionalnosti</h3>
                        <span className="toggle-icon">{activeSection === 'features' ? '−' : '+'}</span>
                    </div>
                    {activeSection === 'features' && (
                        <div className="tech-content">
                            <h4>Znanstveno formatiranje:</h4>
                            <p>Automatsko formatiranje prema standardima znanstvenih radova - Times New Roman, 12pt, A4 format, justificiran tekst s uvlakama.</p>
                            
                            <h4>Hijerarhijska struktura:</h4>
                            <p>3-razinska organizacija poglavlja (1, 1.1, 1.1.1) s automatskim numeriranjem i vizualnom hijerarhijom u navigaciji.</p>
                            
                            <h4>Dual-mode arhitektura:</h4>
                            <ul>
                                <li><strong>VIEWER:</strong> Read-only pristup bez toolbara</li>
                                <li><strong>EDITOR:</strong> Potpune funkcionalnosti editiranja</li>
                            </ul>
                            
                            <h4>State persistencija:</h4>
                            <p>localStorage integracija za čuvanje pozicije korisnika, selectedDocument i selectedChapter kroz browser sessions.</p>
                        </div>
                    )}
                </div>

                <div className="tech-item">
                    <div 
                        className={`tech-header ${activeSection === 'user-management' ? 'active' : ''}`}
                        onClick={() => toggleSection('user-management')}
                    >
                        <h3>Upravljanje korisnicima i dozvole</h3>
                        <span className="toggle-icon">{activeSection === 'user-management' ? '−' : '+'}</span>
                    </div>
                    {activeSection === 'user-management' && (
                        <div className="tech-content">
                            <h4>Sustav dozvola:</h4>
                            <ul>
                                <li><strong>Admin:</strong> Potpune dozvole - upravljanje korisnicima, brisanje svih dokumenata</li>
                                <li><strong>Korisnici:</strong> Mogu uređivati vlastite dokumente i one gdje su dodani kao editori</li>
                                <li><strong>Neregistrirani:</strong> Read-only pristup dokumentima bez mogućnosti editiranja</li>
                            </ul>
                            
                            <h4>Session management:</h4>
                            <ul>
                                <li>Cookie-based autentifikacija s secure flagovima</li>
                                <li>Automatska provjera dozvola na server strani</li>
                                <li>Session timeout i cleanup mehanizmi</li>
                            </ul>
                            
                            <h4>Zadaci i todo liste:</h4>
                            <ul>
                                <li>Pristup temeljen na ulogama - admin može sve, korisnici samo svoje</li>
                                <li>Vlasništvo temeljeno na ID korisnika umjesto korisničkog imena za bolju postojanost</li>
                                <li>Dokumenti vidljivi u padajućem izborniku ovisno o dozvolama korisnika</li>
                                <li>Neregistrirani korisnici mogu stvarati samo todo liste</li>
                            </ul>
                        </div>
                    )}
                </div>

                <div className="tech-item">
                    <div 
                        className={`tech-header ${activeSection === 'performance' ? 'active' : ''}`}
                        onClick={() => toggleSection('performance')}
                    >
                        <h3>Performanse i sigurnost</h3>
                        <span className="toggle-icon">{activeSection === 'performance' ? '−' : '+'}</span>
                    </div>
                    {activeSection === 'performance' && (
                        <div className="tech-content">
                            <h4>Podatkovni sloj:</h4>
                            <ul>
                                <li>JSON datoteke s atomskim operacijama pisanja</li>
                                <li>Automatska sigurnosna kopija kroz git verzioniranje</li>
                                <li>Pristup temeljen na datotekama za jednostavno postavljanje</li>
                                <li>Odvojene datoteke za korisnike, dokumente, zadatke i todo liste</li>
                            </ul>
                            
                            <h4>Optimizacije performansi:</h4>
                            <ul>
                                <li>React lijeno učitavanje za komponente</li>
                                <li>Webpack dijeljenje koda</li>
                                <li>Optimizacija slika za prijenose</li>
                                <li>Predmemoriranje u pregledniku za statičke resurse</li>
                                <li>Minimizirani i komprimirani izlazni paketi</li>
                            </ul>
                            
                            <h4>Sigurnost:</h4>
                            <ul>
                                <li>Upravljanje sesijama temeljeno na kolačićima</li>
                                <li>Provjera valjanosti prijenosa datoteka (tip, veličina)</li>
                                <li>CORS konfiguracija</li>
                                <li>Provjere dozvola na strani poslužitelja za sve API pozive</li>
                                <li>Anti-scroll modalni sustav za bolje korisničko iskustvo</li>
                            </ul>
                        </div>
                    )}
                </div>

                <div className="tech-item">
                    <div 
                        className={`tech-header ${activeSection === 'roadmap' ? 'active' : ''}`}
                        onClick={() => toggleSection('roadmap')}
                    >
                        <h3>Budući razvoj</h3>
                        <span className="toggle-icon">{activeSection === 'roadmap' ? '−' : '+'}</span>
                    </div>
                    {activeSection === 'roadmap' && (
                        <div className="tech-content">
                            <h4>Planirane funkcionalnosti:</h4>
                            <ul>
                                <li><strong>PDF Export:</strong> Direktno generiranje PDF-ova iz editora</li>
                                <li><strong>Poboljšano numeriranje:</strong> Potpuna automatizacija svih elemenata</li>
                                                                <li><strong>Povuci i ispusti:</strong> Reorganizacija poglavlja</li>
                                <li><strong>Sustav predložaka:</strong> Predložci za različite tipove radova</li>
                                <li><strong>Bibliografia:</strong> Automatsko upravljanje referenci</li>
                                <li><strong>Suradnja:</strong> Mogućnosti uređivanja više korisnika</li>
                            </ul>
                            
                            <h4>Tehnička poboljšanja:</h4>
                            <ul>
                                <li>Prelazak na PostgreSQL za skalabilnost</li>
                                <li>Redis predmemoriranje za performanse</li>
                                <li>Docker kontejnerizacija</li>
                                <li>Postavljanje CI/CD cjevovoda</li>
                                <li>Jedinični i integracijski testovi</li>
                            </ul>
                            
                            <h4>Poboljšanja korisničkog iskustva:</h4>
                            <ul>
                                <li>Podrška za tamni način rada</li>
                                <li>Tipkovni prečaci</li>
                                <li>Mogućnosti rada bez mreže</li>
                                <li>Mobilna aplikacija</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div className="tech-stats">
                <h2>Tehnički pokazatelji</h2>
                <div className="stats-grid">
                    <div className="stat-card">
                        <h3>Veličina paketa</h3>
                        <p>~214 KiB (optimizirano)</p>
                    </div>
                    <div className="stat-card">
                        <h3>Vrijeme izgradnje</h3>
                        <p>~4.855 sekundi</p>
                    </div>
                    <div className="stat-card">
                        <h3>Komponente</h3>
                        <p>React modularna arhitektura</p>
                    </div>
                    <div className="stat-card">
                        <h3>Postavljanje</h3>
                        <p>Konfiguracija jednog poslužitelja</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;