import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(isOpen);
  const [active, setActive] = useState(false);

  // Sync mount/active state synchronously during render (mount on open, drop
  // `active` on close to start the exit transition) rather than in the effect.
  if (isOpen && !mounted) setMounted(true);
  if (!isOpen && active) setActive(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // A 10ms delay is usually enough to force the browser
      // to paint the 'hidden' state first
      timeout = setTimeout(() => {
        setActive(true);
      }, 10);
    } else {
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

  // Portal to the body so the fixed-position overlay escapes any transformed
  // ancestor (e.g. the review carousel's translateX track), which would
  // otherwise become its containing block and trap it on-page.
  return createPortal(
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
    </div>,
    document.body,
  );
};

export default Modal;
