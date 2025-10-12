import React from 'react';
import './LoginPage.css';

const LoginPage = () => {
    const handleAAILogin = () => {
        window.location.href = '/api/auth/login/aaieduhr';
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-form">
                    <h2>Prijava u sustav</h2>
                    <p className="login-description">
                        Prijava putem AAI@EduHr korisničkog računa:
                    </p>
                    <div className="aai-login-section">
                        <img 
                            src="/images/aaieduhr.png" 
                            alt="AAI@EduHr Login" 
                            className="aai-login-logo"
                            onClick={handleAAILogin}
                            style={{ cursor: 'pointer' }}
                            onError={(e) => {
                                e.target.src = '/images/aaieduhr.png';
                            }}
                        />
                    </div>
                    <div className="login-info">
                        <p>
                            <small>
                                Prijavite se putem AAI@EduHr sustava koristeći vaš fakultetski email i lozinku.
                            </small>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
