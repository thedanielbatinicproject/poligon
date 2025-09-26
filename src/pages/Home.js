import React from 'react';
import './Home.css';

const Home = () => {
    return (
        <div className="home-page">
            <div className="hero-section">
                <h1>Dobrodošli u Poligon</h1>
                <p>Vaš digitalni asistent za pisanje i uređivanje diplomskih radova</p>
                <div className="hero-features">
                    <div className="feature">
                        <h3>📝 Pisanje</h3>
                        <p>Intuitivni editor za pisanje poglavlja</p>
                    </div>
                    <div className="feature">
                        <h3>📊 Organizacija</h3>
                        <p>Strukturirano upravljanje sadržajem</p>
                    </div>
                    <div className="feature">
                        <h3>👁️ Pregled</h3>
                        <p>Pregled dokumenata u stvarnom vremenu</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;