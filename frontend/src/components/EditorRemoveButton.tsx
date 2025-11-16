import React, { useState } from 'react';

interface EditorRemoveButtonProps {
  onRemove: () => Promise<void>;
  disabled?: boolean;
  label?: string;
}

const EditorRemoveButton: React.FC<EditorRemoveButtonProps> = ({ onRemove, disabled, label }) => {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setLoading(true);
    try {
      await onRemove();
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  return (
    <button
      className="editor-remove-btn"
      disabled={disabled || loading}
      onClick={handleClick}
      type="button"
    >
      {loading ? 'Removing...' : confirming ? 'Confirm?' : (label || 'DEL')}
    </button>
  );
};

export default EditorRemoveButton;
