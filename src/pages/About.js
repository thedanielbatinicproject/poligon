import React from 'react';
import './About.css';

const About = () => {
    return (
        <div className="about-page">
            <div className="about-header">
                <h1>O nama</h1>
                <p>Poligon - platforma za kreiranje i uređivanje akademskih radova</p>
            </div>

            <div className="about-content">
                <section className="about-section">
                    <h2>Što je Poligon?</h2>
                    <p>
                        Poligon je moderna web aplikacija namijenjena studentima i akademskim djelatnicima 
                        za lakše pisanje, organiziranje i uređivanje diplomskih radova, završnih radova i 
                        drugih akademskih dokumenata.
                    </p>
                </section>

                <section className="about-section">
                    <h2>Značajke</h2>
                    <ul>
                        <li>📝 Napredni tekstni editor s formatiranjem</li>
                        <li>📚 Organizacija sadržaja po poglavljima</li>
                        <li>💾 Automatsko spremanje rada</li>
                        <li>👁️ Pregled u stvarnom vremenu</li>
                        <li>📱 Responzivni dizajn za sve uređaje</li>
                        <li>🔐 Sigurno pohranjivanje dokumenata</li>
                    </ul>
                </section>

                <section className="about-section">
                    <h2>Kontakt</h2>
                    <p>
                        Za pitanja ili podršku kontaktirajte nas na: 
                        <a href="mailto:info@poligon.hr">info@poligon.hr</a>
                    </p>
                </section>
            </div>
        </div>
    );
};

export default About;