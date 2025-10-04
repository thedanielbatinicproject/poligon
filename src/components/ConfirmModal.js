import React from 'react';
import './ConfirmModal.css';

const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = 'Potvrda', 
    message,
    confirmText = 'Potvrdi',
    cancelText = 'Odustani',
    type = 'warning' 
}) => {
    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div className="confirm-modal-overlay" onClick={handleOverlayClick}>
            <div className={`confirm-modal ${type}`}>
                <div className="confirm-modal-header">
                    <h3>{title}</h3>
                </div>
                
                <div className="confirm-modal-body">
                    <p>{message}</p>
                </div>
                
                <div className="confirm-modal-actions">
                    <button 
                        className="confirm-btn"
                        onClick={handleConfirm}
                    >
                        {confirmText}
                    </button>
                    <button 
                        className="cancel-btn"
                        onClick={onClose}
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;