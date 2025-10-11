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
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={`${styles.modal} ${styles[type]}`}>
                <div className={styles.header}>
                    <h3>{title}</h3>
                </div>
                
                <div className={styles.body}>
                    <p>{message}</p>
                </div>
                
                <div className={styles.actions}>
                    <button 
                        className={styles.confirmBtn}
                        onClick={handleConfirm}
                    >
                        {confirmText}
                    </button>
                    <button 
                        className={styles.cancelBtn}
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
