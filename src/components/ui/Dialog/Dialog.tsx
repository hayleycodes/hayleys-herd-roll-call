import Modal from '../Modal/Modal';
import Button from '../Button/Button';
import './Dialog.css';

type ButtonVariant = 'default' | 'danger' | 'success' | 'health' | 'family';

type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  message: React.ReactNode;
  onConfirm: () => void;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
  cancelLabel?: string;
  cancelVariant?: ButtonVariant;
  // When true the confirm button is disabled and shows busyLabel (if given).
  busy?: boolean;
  busyLabel?: string;
};

const Dialog = ({
  isOpen,
  onClose,
  message,
  onConfirm,
  confirmLabel = 'Confirm',
  confirmVariant = 'default',
  cancelLabel = 'Cancel',
  cancelVariant = 'default',
  busy = false,
  busyLabel,
}: DialogProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <p>{message}</p>
      <div className="dialogActions">
        <Button variant={cancelVariant} onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} disabled={busy}>
          {busy && busyLabel ? busyLabel : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};

export default Dialog;
