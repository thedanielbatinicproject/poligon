import * as React from 'react';
import { cn } from '@/lib/utils';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className={cn('bg-background rounded-lg shadow-lg max-w-lg w-full mx-4 p-6')}>
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <div>{children}</div>
        <div className="mt-4 flex justify-end">
          <button className="px-4 py-2 rounded bg-gray-200" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default Dialog;
