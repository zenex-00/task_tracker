'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  fullScreen?: boolean;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, wide = false, fullScreen = false, children }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className={`modal-content ${wide ? 'modal-wide' : ''} ${fullScreen ? 'modal-fullscreen' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
