import { useEffect, useState } from 'react';
import './Modal.css';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // 'sheet' (default) slides up from the bottom; 'large' is a centered modal
  // that fills most of the page.
  variant?: 'sheet' | 'large';
  // Show an × close button in the top-right corner.
  showClose?: boolean;
};

const Modal = ({
  isOpen,
  onClose,
  children,
  variant = 'sheet',
  showClose = false,
}: ModalProps) => {
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
    <div
      className={`modalOverlay ${variant === 'large' ? 'modalOverlayCenter' : ''} ${active ? 'open' : ''}`}
      onClick={onClose}
    >
      <div
        className={`modalSheet ${variant === 'large' ? 'modalLarge' : ''} ${active ? 'open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {showClose && (
          <button
            type="button"
            className="modalClose"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

export default Modal;
