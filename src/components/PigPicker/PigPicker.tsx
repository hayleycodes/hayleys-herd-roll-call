import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getPigImageUrl } from '../../services/pig-images.service';
import type { Pig } from '../../services/pigs.types';
import './PigPicker.css';

export const PigThumb = ({ imagePath }: { imagePath: string | null }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePath) return;
    getPigImageUrl(imagePath).then(({ signedUrl }) => setUrl(signedUrl));
  }, [imagePath]);

  if (!url)
    return <div className="pigPickerThumb pigPickerThumbPlaceholder">🐹</div>;
  return (
    <div
      className="pigPickerThumb"
      style={{ backgroundImage: `url(${url})` }}
    />
  );
};

type Props = {
  pigs: Pig[];
  selectedPigId: number | '';
  onSelect: (pigId: number | '') => void;
  view?: 'default' | 'compact';
  theme?: 'green' | 'purple' | 'blue';
  dropUp?: boolean;
  defaultOpen?: boolean;
  onClose?: () => void;
  align?: 'left' | 'right';
  // Multi-select mode: clicking a pig toggles it (the menu stays open) and a
  // Save button is shown. onSave fires when the user confirms.
  multiSelect?: boolean;
  selectedPigIds?: number[];
  onToggle?: (pigId: number) => void;
  onSave?: () => void;
  title?: string;
  // Content rendered between the title and the pig list.
  header?: ReactNode;
  // Extra content rendered between the pig list and the Save button.
  footer?: ReactNode;
};

const PigPicker = ({
  pigs,
  selectedPigId,
  onSelect,
  view = 'default',
  theme = 'purple',
  dropUp = false,
  defaultOpen = false,
  onClose,
  align,
  multiSelect = false,
  selectedPigIds = [],
  onToggle,
  onSave,
  title,
  header,
  footer,
}: Props) => {
  const [dropdownOpen, setDropdownOpen] = useState(defaultOpen);
  const [alignRight, setAlignRight] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedPig = pigs.find((p) => p.id === selectedPigId) ?? null;

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const openDropdown = () => {
    if (!dropdownOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setAlignRight(rect.left > 200);
    }
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <div className={`pigPickerDropdown pigPicker--${theme}`} ref={dropdownRef}>
      {view === 'compact' ? (
        <button
          type="button"
          className="pigPickerCompactTrigger"
          onClick={openDropdown}
          title={selectedPig ? selectedPig.name : 'Link a pig'}
        >
          {selectedPig ? (
            <PigThumb imagePath={selectedPig.image_paths?.[0] ?? null} />
          ) : (
            <span className="pigPickerCompactIcon">🐖</span>
          )}
        </button>
      ) : (
        <button
          type="button"
          className="pigPickerTrigger"
          onClick={openDropdown}
        >
          {selectedPig ? (
            <>
              <PigThumb imagePath={selectedPig.image_paths?.[0] ?? null} />
              <span>{selectedPig.name}</span>
            </>
          ) : (
            <span className="pigPickerPlaceholder">Select a pig...</span>
          )}
        </button>
      )}
      {dropdownOpen && (
        <div
          className={`pigPickerMenu${dropUp ? ' pigPickerMenu--up' : ''}${(align ? align === 'left' : !alignRight) ? ' pigPickerMenu--left' : ''}`}
        >
          {title && <div className="pigPickerTitle">{title}</div>}
          {header}
          <div className="pigPickerMenuInner">
            {view === 'compact' && selectedPig && (
              <button
                type="button"
                className="pigPickerOption pigPickerOptionClear"
                onClick={() => {
                  onSelect('');
                  setDropdownOpen(false);
                }}
              >
                <span>No pig</span>
              </button>
            )}
            {pigs.map((pig) => {
              const active = multiSelect
                ? selectedPigIds.includes(pig.id)
                : pig.id === selectedPigId;
              return (
                <button
                  key={pig.id}
                  type="button"
                  className={`pigPickerOption ${active ? 'pigPickerOptionActive' : ''}`}
                  onClick={() => {
                    if (multiSelect) {
                      onToggle?.(pig.id);
                    } else {
                      onSelect(pig.id);
                      setDropdownOpen(false);
                    }
                  }}
                >
                  <PigThumb imagePath={pig.image_paths?.[0] ?? null} />
                  <span>{pig.name}</span>
                </button>
              );
            })}
          </div>
          {footer}
          {multiSelect && (
            <button
              type="button"
              className="pigPickerSave"
              disabled={selectedPigIds.length === 0}
              onClick={() => onSave?.()}
            >
              Save{selectedPigIds.length ? ` (${selectedPigIds.length})` : ''}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PigPicker;
