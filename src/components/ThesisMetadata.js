import React, { useState, useEffect } from 'react';
import './ThesisMetadata.css';

const ThesisMetadata = ({ metadata, onUpdate, mode }) => {
    const [formData, setFormData] = useState(metadata);
    const [activeTab, setActiveTab] = useState('basic');

    useEffect(() => {
        setFormData(metadata);
    }, [metadata]);

    const handleInputChange = (path, value) => {
        const newFormData = { ...formData };
        
        // Handle nested paths like 'author.name'
        const pathArray = path.split('.');
        let current = newFormData;
        
        for (let i = 0; i < pathArray.length - 1; i++) {
            if (!current[pathArray[i]]) {
                current[pathArray[i]] = {};
            }
            current = current[pathArray[i]];
        }
        
        current[pathArray[pathArray.length - 1]] = value;
        setFormData(newFormData);
        
        // Auto-save in EDIT mode
        if (mode === 'EDIT') {
            onUpdate(newFormData);
        }
    };

    const handleKeywordsChange = (value) => {
        const keywords = value.split(',').map(k => k.trim()).filter(k => k.length > 0);
        handleInputChange('keywords', keywords);
    };

    const renderInput = (path, label, type = 'text', placeholder = '', required = false) => {
        const value = path.split('.').reduce((obj, key) => obj?.[key], formData) || '';
        
        if (mode === 'VIEW') {
            return (
                <div className="field-group">
                    <label>{label}</label>
                    <div className="field-display">
                        {value || <span className="empty">Nije uneseno</span>}
                    </div>
                </div>
            );
        }

        return (
            <div className="field-group">
                <label>
                    {label}
                    {required && <span className="required">*</span>}
                </label>
                <input
                    type={type}
                    value={value}
                    onChange={(e) => handleInputChange(path, e.target.value)}
                    placeholder={placeholder}
                    required={required}
                />
            </div>
        );
    };

    const renderTextarea = (path, label, placeholder = '', rows = 4, maxLength = null) => {
        const value = path.split('.').reduce((obj, key) => obj?.[key], formData) || '';
        
        if (mode === 'VIEW') {
            return (
                <div className="field-group">
                    <label>{label}</label>
                    <div className="field-display textarea-display">
                        {value || <span className="empty">Nije uneseno</span>}
                    </div>
                </div>
            );
        }

        return (
            <div className="field-group">
                <label>
                    {label}
                    {maxLength && (
                        <span className="char-count">
                            {value.length}/{maxLength}
                        </span>
                    )}
                </label>
                <textarea
                    value={value}
                    onChange={(e) => handleInputChange(path, e.target.value)}
                    placeholder={placeholder}
                    rows={rows}
                    maxLength={maxLength}
                />
            </div>
        );
    };

    const renderSelect = (path, label, options, required = false) => {
        const value = path.split('.').reduce((obj, key) => obj?.[key], formData) || '';
        
        if (mode === 'VIEW') {
            const selectedOption = options.find(opt => opt.value === value);
            return (
                <div className="field-group">
                    <label>{label}</label>
                    <div className="field-display">
                        {selectedOption?.label || <span className="empty">Nije odabrano</span>}
                    </div>
                </div>
            );
        }

        return (
            <div className="field-group">
                <label>
                    {label}
                    {required && <span className="required">*</span>}
                </label>
                <select
                    value={value}
                    onChange={(e) => handleInputChange(path, e.target.value)}
                    required={required}
                >
                    <option value="">Odaberite...</option>
                    {options.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
        );
    };

    const degreeOptions = [
        { value: 'Bachelor', label: 'Preddiplomski studij (Bachelor)' },
        { value: 'Master', label: 'Diplomski studij (Master)' },
        { value: 'PhD', label: 'Poslijediplomski studij (PhD)' }
    ];

    const languageOptions = [
        { value: 'hr', label: 'Hrvatski' },
        { value: 'en', label: 'Engleski' },
        { value: 'de', label: 'Njemački' },
        { value: 'it', label: 'Talijanski' }
    ];

    return (
        <div className={`thesis-metadata ${mode.toLowerCase()}`}>
            <div className="metadata-header">
                <h2>Metapodaci diplomskog rada</h2>
                <div className="tab-switcher">
                    <button 
                        className={activeTab === 'basic' ? 'active' : ''}
                        onClick={() => setActiveTab('basic')}
                    >
                        Osnovni podaci
                    </button>
                    <button 
                        className={activeTab === 'academic' ? 'active' : ''}
                        onClick={() => setActiveTab('academic')}
                    >
                        Akademski podaci
                    </button>
                    <button 
                        className={activeTab === 'abstract' ? 'active' : ''}
                        onClick={() => setActiveTab('abstract')}
                    >
                        Sažeci
                    </button>
                </div>
            </div>

            <div className="metadata-content">
                {activeTab === 'basic' && (
                    <div className="tab-content">
                        <div className="section">
                            <h3>Osnovne informacije</h3>
                            <div className="fields-grid">
                                {renderInput('title', 'Naslov rada', 'text', 'Unesite naslov diplomskog rada...', true)}
                                {renderInput('subtitle', 'Podnaslov', 'text', 'Dodatni podnaslov (opcionalno)')}
                                {renderSelect('language', 'Jezik rada', languageOptions, true)}
                            </div>
                        </div>

                        <div className="section">
                            <h3>Autor</h3>
                            <div className="fields-grid">
                                {renderInput('author.name', 'Ime i prezime', 'text', 'Vaše puno ime', true)}
                                {renderInput('author.email', 'Email adresa', 'email', 'vasa.email@example.com', true)}
                                {renderInput('author.studentId', 'Broj indeksa', 'text', 'Broj vašeg studentskog indeksa')}
                            </div>
                        </div>

                        <div className="section">
                            <h3>Mentor</h3>
                            <div className="fields-grid">
                                {renderInput('mentor.name', 'Ime i prezime mentora', 'text', 'prof. dr. sc. Ime Prezime', true)}
                                {renderInput('mentor.title', 'Akademski naslov', 'text', 'prof. dr. sc.')}
                                {renderInput('mentor.department', 'Zavod/Katedra', 'text', 'Zavod za...')}
                            </div>
                        </div>

                        <div className="section">
                            <h3>Institucija</h3>
                            <div className="fields-grid">
                                {renderInput('institution.name', 'Sveučilište', 'text', 'Sveučilište u Zagrebu', true)}
                                {renderInput('institution.faculty', 'Fakultet', 'text', 'Fakultet elektrotehnike i računarstva', true)}
                                {renderInput('institution.department', 'Zavod/Odsjek', 'text', 'Zavod za elektroniku, mikroelektroniku...')}
                                {renderInput('institution.logo', 'URL loga', 'url', 'https://example.com/logo.png')}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'academic' && (
                    <div className="tab-content">
                        <div className="section">
                            <h3>Akademski podaci</h3>
                            <div className="fields-grid">
                                {renderSelect('academic.degree', 'Razina studija', degreeOptions, true)}
                                {renderInput('academic.field', 'Područje/Smjer', 'text', 'Računarstvo, Elektrotehnika...', true)}
                                {renderInput('academic.year', 'Akademska godina', 'number', new Date().getFullYear(), true)}
                                {renderInput('academic.defense_date', 'Datum obrane', 'date')}
                            </div>
                        </div>

                        <div className="section">
                            <h3>Ključne riječi</h3>
                            <div className="field-group">
                                <label>Ključne riječi</label>
                                {mode === 'VIEW' ? (
                                    <div className="field-display">
                                        {formData.keywords?.length ? 
                                            formData.keywords.join(', ') : 
                                            <span className="empty">Nisu unesene</span>
                                        }
                                    </div>
                                ) : (
                                    <>
                                        <input
                                            type="text"
                                            value={formData.keywords?.join(', ') || ''}
                                            onChange={(e) => handleKeywordsChange(e.target.value)}
                                            placeholder="umjetna inteligencija, strojno učenje, neural networks..."
                                        />
                                        <small>Odvojite ključne riječi zarezom</small>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'abstract' && (
                    <div className="tab-content">
                        <div className="section">
                            <h3>Sažetak (Hrvatski)</h3>
                            {renderTextarea(
                                'abstract.hr', 
                                'Sažetak na hrvatskom jeziku',
                                'Napišite sažetak vašeg rada na hrvatskom jeziku (maksimalno 350 riječi)...',
                                6,
                                2100 // Approx 350 words * 6 chars per word
                            )}
                        </div>

                        <div className="section">
                            <h3>Abstract (English)</h3>
                            {renderTextarea(
                                'abstract.en', 
                                'Abstract in English',
                                'Write your thesis abstract in English (maximum 350 words)...',
                                6,
                                2100
                            )}
                        </div>

                        <div className="section">
                            <h3>Laički sažetak (Hrvatski)</h3>
                            {renderTextarea(
                                'lay_summary.hr', 
                                'Laički sažetak na hrvatskom',
                                'Objasnite vaš rad jednostavnim jezikom (maksimalno 150 riječi)...',
                                4,
                                900 // Approx 150 words * 6 chars per word
                            )}
                        </div>

                        <div className="section">
                            <h3>Lay Summary (English)</h3>
                            {renderTextarea(
                                'lay_summary.en', 
                                'Lay summary in English',
                                'Explain your work in simple terms (maximum 150 words)...',
                                4,
                                900
                            )}
                        </div>
                    </div>
                )}
            </div>

            {mode === 'EDIT' && (
                <div className="metadata-footer">
                    <div className="save-status">
                        <span className="auto-save-indicator">
                            ✓ Automatski spremljeno
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThesisMetadata;