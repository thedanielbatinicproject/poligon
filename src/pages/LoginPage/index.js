import React, { useState } from 'react';
import { authAPI } from '../../utils/api';
import './LoginPage.css';

const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await authAPI.login({ username, password });

            if (result.success && result.data.success) {
                onLogin(result.data.user);
            } else {
                setError(result.data?.message || 'Login failed');
            }
        } catch (error) {
            setError('Greška pri povezivanju sa serverom');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-form">
                    <h2>Prijava</h2>
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label>Korisničko ime:</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Unesite korisničko ime"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Lozinka:</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Unesite lozinku"
                                required
                            />
                        </div>
                        {error && <div className="error-message">{error}</div>}
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="login-btn"
                        >
                            {loading ? 'Prijavljivanje...' : 'Prijavi se'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
