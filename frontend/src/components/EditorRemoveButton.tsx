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
      className="btn btn-danger"
      style={{ marginLeft: 8, minWidth: 80 }}
      disabled={disabled || loading}
      onClick={handleClick}
      type="button"
    >
      {loading ? 'Removing...' : confirming ? 'Confirm?' : (label || 'Remove')}
    </button>
  );
};

export default EditorRemoveButton;
