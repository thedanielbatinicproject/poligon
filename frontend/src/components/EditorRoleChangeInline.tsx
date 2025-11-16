import React, { useState } from 'react';
import EditorRoleSelect from './EditorRoleSelect';

interface EditorRoleChangeInlineProps {
  currentRole: string;
  onChange: (newRole: string) => Promise<void>;
  isAdmin?: boolean;
  disabled?: boolean;
}

const EditorRoleChangeInline: React.FC<EditorRoleChangeInlineProps> = ({ currentRole, onChange, isAdmin, disabled }) => {
  const [role, setRole] = useState(currentRole);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await onChange(role);
      setEditing(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to change role');
    } finally {
      setLoading(false);
    }
  };

  if (!editing) {
    return (
      <span style={{ marginLeft: 8 }}>
        <span style={{ fontWeight: 500 }}>{role}</span>
        {!disabled && (
          <button className="btn btn-ghost" style={{ marginLeft: 6 }} onClick={() => setEditing(true)} type="button">Change</button>
        )}
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
      <EditorRoleSelect value={role} onChange={setRole} isAdmin={isAdmin} />
      <button className="btn btn-primary" onClick={handleSave} disabled={loading} type="button">Save</button>
      <button className="btn btn-ghost" onClick={() => { setEditing(false); setRole(currentRole); }} disabled={loading} type="button">Cancel</button>
      {error && <span style={{ color: 'var(--danger)', marginLeft: 6 }}>{error}</span>}
    </span>
  );
};

export default EditorRoleChangeInline;
