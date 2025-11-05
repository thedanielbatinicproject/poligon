import React, { useState, useEffect } from 'react';
import { useNotifications } from '../lib/notifications';
import ConfirmationBox from './ConfirmationBox';

interface DocumentGraderProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  currentGrade: number | null;
  currentStatus: string;
  onGradeSuccess: () => void;
}

const DocumentGrader: React.FC<DocumentGraderProps> = ({
  isOpen,
  onClose,
  documentId,
  currentGrade,
  currentStatus,
  onGradeSuccess
}) => {
  const notify = useNotifications();
  
  const [grade, setGrade] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('graded');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLowGradeConfirm, setShowLowGradeConfirm] = useState(false);
  const [isReturnToDraft, setIsReturnToDraft] = useState(false);

  // Status options (all except under_review)
  const statusOptions = [
    { value: 'graded', label: 'graded' },
    { value: 'submitted', label: 'submitted' },
    { value: 'finished', label: 'finished' },
    { value: 'draft', label: 'draft' }
  ];

  // Initialize form when opened
  useEffect(() => {
    if (isOpen) {
      setGrade(currentGrade !== null ? String(currentGrade) : '');
      setSelectedStatus('graded');
      setIsReturnToDraft(false);
      setShowLowGradeConfirm(false);
    }
  }, [isOpen, currentGrade]);

  // Lock/unlock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Lock/unlock grade input based on status
  useEffect(() => {
    if (selectedStatus === 'draft') {
      setIsReturnToDraft(true);
      setGrade(''); // Clear grade when returning to draft
    } else {
      setIsReturnToDraft(false);
    }
  }, [selectedStatus]);

  // Show status descriptions notification
  const showStatusInfo = () => {
    const message = `Document Status Descriptions:

• draft - Document is still being edited

• under_review - Mentor or other editor is reviewing the document

• graded - Document has been given a grade

• submitted - Document has been submitted to faculty

• finished - Faculty has accepted this document`;
    
    notify.push(message, 15);
  };

  // Handle Return to Draft button
  const handleReturnToDraft = () => {
    setSelectedStatus('draft');
  };

  // Validate and submit
  const handleSubmit = async () => {
    // Validate grade if not returning to draft
    if (selectedStatus !== 'draft') {
      const gradeNum = parseFloat(grade);
      
      if (isNaN(gradeNum) || grade.trim() === '') {
        notify.push('Grade is required', undefined, true);
        return;
      }
      
      if (gradeNum < 0 || gradeNum > 100) {
        notify.push('Grade must be between 0 and 100', undefined, true);
        return;
      }
      
      // Show confirmation for low grade
      if (gradeNum < 10) {
        setShowLowGradeConfirm(true);
        return;
      }
    }

    // Submit grade and status
    await submitGrade();
  };

  const submitGrade = async () => {
    setIsSubmitting(true);
    
    try {
      // Update grade (if not draft)
      if (selectedStatus !== 'draft') {
        const gradeNum = parseFloat(grade);
        
        const gradeResponse = await fetch(`/api/documents/${documentId}/grade`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ grade: gradeNum })
        });
        
        if (!gradeResponse.ok) {
          const errorData = await gradeResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to update grade');
        }
      }
      
      // Update status
      const statusResponse = await fetch(`/api/documents/${documentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: selectedStatus })
      });
      
      if (!statusResponse.ok) {
        const errorData = await statusResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update status');
      }
      
      notify.push(
        selectedStatus === 'draft' 
          ? 'Document returned to draft' 
          : `Document graded with ${grade} and status set to ${selectedStatus}`,
        3
      );
      
      onGradeSuccess();
      onClose();
    } catch (error: any) {
      notify.push(error.message || 'Failed to grade document', undefined, true);
    } finally {
      setIsSubmitting(false);
      setShowLowGradeConfirm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main grading modal */}
      <div
        className="auth-modal-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
          overflow: 'hidden'
        }}
      >
        <div
          className="glass-panel"
          style={{
            width: '90%',
            maxWidth: 550,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            position: 'relative'
          }}
        >
          {/* Close button */}
          <button
            className="auth-close"
            onClick={onClose}
            style={{ position: 'absolute', top: 12, right: 12 }}
          >
            ×
          </button>

          {/* Header */}
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ margin: 0, color: 'var(--heading)', fontSize: '1.5rem' }}>
              Change document status
            </h2>
            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
              Assign a grade and set the document status after grading
            </p>
          </div>

          {/* Form content */}
          <div style={{ padding: '1.5rem' }}>
            {/* Return to Draft button */}
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                className="btn btn-ghost"
                onClick={handleReturnToDraft}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderColor: 'var(--warning)',
                  color: 'var(--warning)'
                }}
              >
                ⬅️ RETURN TO DRAFT
              </button>
            </div>

            {/* Grade input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text)' }}>
                Grade (0-100) {selectedStatus !== 'draft' && <span style={{ color: 'var(--error)' }}>*</span>}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                disabled={isReturnToDraft || isSubmitting}
                placeholder="Enter grade from 0 to 100"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: isReturnToDraft ? 'var(--bg)' : 'var(--panel)',
                  color: isReturnToDraft ? 'var(--muted)' : 'var(--text)',
                  fontSize: '1rem',
                  opacity: isReturnToDraft ? 0.5 : 1
                }}
              />
              {currentGrade !== null && !isReturnToDraft && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Current grade: <strong>{currentGrade}</strong>
                </div>
              )}
            </div>

            {/* Status dropdown */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <label style={{ fontWeight: 600, color: 'var(--text)' }}>
                  Set document status after grading to:
                </label>
                <button
                  onClick={showStatusInfo}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    padding: 0,
                    color: 'var(--accent)'
                  }}
                  title="Show status descriptions"
                >
                  ℹ️
                </button>
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--panel)',
                  color: 'var(--text)',
                  fontSize: '1rem'
                }}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost"
                onClick={onClose}
                disabled={isSubmitting}
                style={{ padding: '0.75rem 1.5rem' }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{ padding: '0.75rem 1.5rem' }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Low grade confirmation (nested popup) */}
      <ConfirmationBox
        isOpen={showLowGradeConfirm}
        title="Grade so low?"
        question={`The Poligon system supports grades from 0 to 100. You graded this document with ${grade}. Are you sure you want to enter this grade? (This grade can be overwritten anytime in the future.)`}
        onConfirm={submitGrade}
        onCancel={() => setShowLowGradeConfirm(false)}
      />
    </>
  );
};

export default DocumentGrader;
