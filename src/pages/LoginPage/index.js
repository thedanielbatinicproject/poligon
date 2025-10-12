import React, { useEffect } from 'react';
import './LoginPage.css';
import { useNotification } from '../../components/Notification/NotificationProvider';

function getQueryParam(name) {
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    } catch (e) {
        return null;
    }
}

const LoginPage = () => {
    const [showAdminOption, setShowAdminOption] = React.useState(false);
    const [asAdmin, setAsAdmin] = React.useState(false);

    useEffect(() => {
        // fetch config from server
        fetch('/api/auth/config', { credentials: 'include' })
            .then(r => r.json())
            .then(j => {
                if (j && j.devModeSkipSamlValidation) setShowAdminOption(true);
            }).catch(() => {});
    }, []);

    const handleAAILogin = () => {
        const url = '/api/auth/login/aaieduhr' + (asAdmin ? '?as_admin=1' : '');
        window.location.href = url;
    };

    const { addNotification } = useNotification();

    useEffect(() => {
        const authError = getQueryParam('auth_error');
        const error = getQueryParam('error');
        if (authError) {
            const messages = {
                invalid_signature: 'Nevažeći potpis SAML odgovora (invalid_signature).',
                invalid_saml: 'Nevažeći SAML odgovor (invalid_saml).',
                no_saml: 'Nije pronađen SAML odgovor (no_saml).',
                no_email: 'Nije pronađena email adresa u SAML odgovoru (no_email).',
                no_user: 'Nije pronađen korisnik nakon autentikacije (no_user).'
            };
            addNotification(messages[authError] || `Greška autentikacije: ${authError}`, 'error', 5000);
            // remove query param so refreshing doesn't re-show
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (error) {
            addNotification(`Greška: ${error}`, 'error', 5000);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [addNotification]);

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
                    {showAdminOption && (
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 14 }}>
                                <input type="checkbox" checked={asAdmin} onChange={(e) => setAsAdmin(e.target.checked)} />{' '}
                                Login as admin?
                            </label>
                        </div>
                    )}

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
