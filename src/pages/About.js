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
                                <li><strong>TinyMCE 6:</strong> Napredni WYSIWYG editor za znanstvene radove</li>
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
                            <h4>TinyMCE editor:</h4>
                            <ul>
                                <li>Profesionalne funkcionalnosti za znanstvene radove</li>
                                <li>Cloud-based pristup bez složenih konfiguracija</li>
                                <li>Izvrsna podrška za tablice i slike</li>
                                <li>Customizable toolbar za specifične potrebe</li>
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
                                <li>JSON datoteke s atomskim write operacijama</li>
                                <li>Automatski backup kroz git versioning</li>
                                <li>File-based pristup za jednostavno deployment</li>
                            </ul>
                            
                            <h4>Performanse optimizacije:</h4>
                            <ul>
                                <li>React lazy loading za komponente</li>
                                <li>Webpack code splitting</li>
                                <li>Image optimization za uploadove</li>
                                <li>Browser caching za statičke resurse</li>
                                <li>Minimized i compressed bundle outputs</li>
                            </ul>
                            
                            <h4>Sigurnost:</h4>
                            <ul>
                                <li>Cookie-based session management</li>
                                <li>File upload validacija (tip, veličina)</li>
                                <li>CORS konfiguracija</li>
                                <li>Relativno stabilna arhitektura</li>
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
                                <li><strong>Drag & Drop:</strong> Reorganizacija poglavlja</li>
                                <li><strong>Template sistem:</strong> Predložeci za različite tipove radova</li>
                                <li><strong>Bibliografia:</strong> Automatsko upravljanje referenci</li>
                                <li><strong>Collaboration:</strong> Multi-user editing capabilities</li>
                            </ul>
                            
                            <h4>Tehnička poboljšanja:</h4>
                            <ul>
                                <li>Prelazak na PostgreSQL za skalabilnost</li>
                                <li>Redis caching za performanse</li>
                                <li>Docker containerization</li>
                                <li>CI/CD pipeline setup</li>
                                <li>Unit i integration testovi</li>
                            </ul>
                            
                            <h4>UX poboljšanja:</h4>
                            <ul>
                                <li>Dark mode podrška</li>
                                <li>Keyboard shortcuts</li>
                                <li>Offline mode capabilities</li>
                                <li>Mobile app version</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div className="tech-stats">
                <h2>Tehnički pokazatelji</h2>
                <div className="stats-grid">
                    <div className="stat-card">
                        <h3>Bundle veličina</h3>
                        <p>~214 KiB (optimized)</p>
                    </div>
                    <div className="stat-card">
                        <h3>Build vrijeme</h3>
                        <p>~2.5 sekundi</p>
                    </div>
                    <div className="stat-card">
                        <h3>Komponente</h3>
                        <p>React modularna arhitektura</p>
                    </div>
                    <div className="stat-card">
                        <h3>Deployment</h3>
                        <p>Single server setup</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;