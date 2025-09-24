import React, { useState, useEffect } from 'react';

function About() {
  const [aboutData, setAboutData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAboutData = async () => {
      try {
        const response = await fetch('/api/about');
        const data = await response.json();
        setAboutData(data);
      } catch (error) {
        console.error('Greška pri dohvaćanju podataka:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAboutData();
  }, []);

  if (loading) {
    return (
      <section className="about">
        <div className="container">
          <h2>Učitavanje...</h2>
        </div>
      </section>
    );
  }

  return (
    <section className="about">
      <div className="container">
        <h2>O aplikaciji</h2>
        <p>Ova aplikacija je stvorena kao početni predložak za razvoj Node.js web aplikacija s React.js frontend-om.</p>
        
        {aboutData && (
          <>
            <h3>Korištene tehnologije:</h3>
            <ul>
              {aboutData.technologies.map((tech, index) => (
                <li key={index}>{tech}</li>
              ))}
            </ul>

            <h3>Značajke:</h3>
            <ul>
              {aboutData.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

export default About;