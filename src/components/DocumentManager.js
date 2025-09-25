import React, { useState, useRef } from 'react';
import poligonLogo from '../images/poligon.png';
import './DocumentManager.css';

const DocumentManager = ({ onClose, onCreateDocument, onEditDocument, currentThesis, mode }) => {
    const [activeTab, setActiveTab] = useState('create');
    const [formData, setFormData] = useState({
        title: currentThesis?.metadata.title || '',
        subtitle: currentThesis?.metadata.subtitle || '',
        author: {
            name: currentThesis?.metadata.author.name || '',
            email: currentThesis?.metadata.author.email || '',
            studentId: currentThesis?.metadata.author.studentId || ''
        },
        mentor: {
            name: currentThesis?.metadata.mentor.name || '',
            title: currentThesis?.metadata.mentor.title || '',
            department: currentThesis?.metadata.mentor.department || ''
        },
        institution: {
            name: currentThesis?.metadata.institution.name || 'Sveučilište u Zagrebu',
            faculty: currentThesis?.metadata.institution.faculty || '',
            department: currentThesis?.metadata.institution.department || '',
            logo: currentThesis?.metadata.institution.logo || ''
        },
        academic: {
            degree: currentThesis?.metadata.academic.degree || 'Bachelor',
            field: currentThesis?.metadata.academic.field || '',
            year: currentThesis?.metadata.academic.year || new Date().getFullYear()
        },
        language: currentThesis?.metadata.language || 'hr'
    });
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(currentThesis?.metadata.institution.logo || '');
    const fileInputRef = useRef(null);

    const handleInputChange = (path, value) => {
        const newFormData = { ...formData };
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
    };

    const handleLogoChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setLogoPreview(e.target.result);
                handleInputChange('institution.logo', e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeLogo = () => {
        setLogoFile(null);
        setLogoPreview('');
        handleInputChange('institution.logo', '');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (activeTab === 'create') {
            onCreateDocument(formData);
        } else {
            onEditDocument(formData);
        }
        
        onClose();
    };

    const renderInput = (path, label, type = 'text', placeholder = '', required = false) => {
        const value = path.split('.').reduce((obj, key) => obj?.[key], formData) || '';
        
        return (
            <div className="form-group">
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

    const renderSelect = (path, label, options, required = false) => {
        const value = path.split('.').reduce((obj, key) => obj?.[key], formData) || '';
        
        return (
            <div className="form-group">
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
        <div className="document-manager-overlay">
            <div className="document-manager">
                <div className="manager-header">
                    <h2>
                        {activeTab === 'create' ? 'Kreiraj novi dokument' : 'Uredi dokument'}
                    </h2>
                    <button className="close-btn" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="manager-tabs">
                    <button 
                        className={activeTab === 'create' ? 'active' : ''}
                        onClick={() => setActiveTab('create')}
                    >
                        Novi dokument
                    </button>
                    {currentThesis && (
                        <button 
                            className={activeTab === 'edit' ? 'active' : ''}
                            onClick={() => setActiveTab('edit')}
                        >
                            Uredi trenutni
                        </button>
                    )}
                </div>

                <form className="manager-form" onSubmit={handleSubmit}>
                    <div className="form-sections">
                        <div className="form-section">
                            <h3>Osnovne informacije</h3>
                            <div className="form-grid">
                                {renderInput('title', 'Naslov rada', 'text', 'Unesite naslov diplomskog rada...', true)}
                                {renderInput('subtitle', 'Podnaslov', 'text', 'Dodatni podnaslov (opcionalno)')}
                                {renderSelect('language', 'Jezik rada', languageOptions, true)}
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Autor</h3>
                            <div className="form-grid">
                                {renderInput('author.name', 'Ime i prezime', 'text', 'Vaše puno ime', true)}
                                {renderInput('author.email', 'Email adresa', 'email', 'vasa.email@example.com', true)}
                                {renderInput('author.studentId', 'Broj indeksa', 'text', 'Broj vašeg studentskog indeksa')}
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Mentor</h3>
                            <div className="form-grid">
                                {renderInput('mentor.name', 'Ime i prezime mentora', 'text', 'prof. dr. sc. Ime Prezime', true)}
                                {renderInput('mentor.title', 'Akademski naslov', 'text', 'prof. dr. sc.')}
                                {renderInput('mentor.department', 'Zavod/Katedra', 'text', 'Zavod za...')}
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Institucija</h3>
                            <div className="form-grid">
                                {renderInput('institution.name', 'Sveučilište', 'text', 'Sveučilište u Zagrebu', true)}
                                {renderInput('institution.faculty', 'Fakultet', 'text', 'Fakultet elektrotehnike i računarstva', true)}
                                {renderInput('institution.department', 'Zavod/Odsjek', 'text', 'Zavod za elektroniku, mikroelektroniku...')}
                            </div>
                            
                            <div className="logo-section">
                                <label>Logo institucije</label>
                                <div className="logo-upload">
                                    {logoPreview ? (
                                        <div className="logo-preview">
                                            <img src={logoPreview} alt="Logo preview" />
                                            <button type="button" onClick={removeLogo} className="remove-logo">
                                                ×
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="logo-placeholder">
                                            <img src={poligonLogo} alt="No logo" className="placeholder-icon" />
                                            <p>Nema loga</p>
                                        </div>
                                    )}
                                    
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleLogoChange}
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                    />
                                    
                                    <button 
                                        type="button" 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="upload-btn"
                                    >
                                        {logoPreview ? 'Promijeni logo' : 'Upload logo'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Akademski podaci</h3>
                            <div className="form-grid">
                                {renderSelect('academic.degree', 'Razina studija', degreeOptions, true)}
                                {renderInput('academic.field', 'Područje/Smjer', 'text', 'Računarstvo, Elektrotehnika...', true)}
                                {renderInput('academic.year', 'Akademska godina', 'number', new Date().getFullYear(), true)}
                            </div>
                        </div>
                    </div>

                    <div className="manager-footer">
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            Odustani
                        </button>
                        <button type="submit" className="submit-btn">
                            {activeTab === 'create' ? 'Kreiraj dokument' : 'Spremi promjene'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DocumentManager;