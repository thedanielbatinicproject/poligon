import React from 'react';

interface EditorRoleSelectProps {
  value: string;
  onChange: (role: string) => void;
  isAdmin?: boolean;
}

const EditorRoleSelect: React.FC<EditorRoleSelectProps> = ({ value, onChange, isAdmin }) => {
  return (
    <select
      className="auth-input"
      style={{ minWidth: 120, marginRight: 8 }}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="editor">Editor</option>
      <option value="viewer">Visitor</option>
      <option value="mentor">Mentor</option>
      {isAdmin && <option value="owner">Owner</option>}
    </select>
  );
};

export default EditorRoleSelect;
