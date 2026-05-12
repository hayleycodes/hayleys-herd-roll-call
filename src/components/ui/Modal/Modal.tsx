import { useEffect, useState } from 'react';
import './Modal.css';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const Modal = ({ isOpen, onClose, children }: ModalProps) => {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = 'hidden';
      // A 10ms delay is usually enough to force the browser
      // to paint the 'hidden' state first
      timeout = setTimeout(() => {
        setActive(true);
      }, 10);
    } else {
      setActive(false);
      document.body.style.overflow = '';
      timeout = setTimeout(() => {
        setMounted(false);
      }, 300); // Matches your CSS transition time
    }

    return () => {
      clearTimeout(timeout);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <div className={`modalOverlay ${active ? 'open' : ''}`} onClick={onClose}>
      <div
        className={`modalSheet ${active ? 'open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
