import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, wide = false, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className={`modal-content ${wide ? 'modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}