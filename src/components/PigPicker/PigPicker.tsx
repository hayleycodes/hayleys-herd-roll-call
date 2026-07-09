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
  theme?: 'green' | 'purple' | 'blue' | 'pink';
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
  const [query, setQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedPig = pigs.find((p) => p.id === selectedPigId) ?? null;

  const filteredPigs = query.trim()
    ? pigs.filter((p) =>
        p.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : pigs;

  useEffect(() => {
    if (!dropdownOpen) {
      setQuery('');
      return;
    }
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
        onClose?.();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [dropdownOpen]);

  // Keyboard-driven flow from the search box: Enter picks the top match
  // (single-select selects & closes; multi-select toggles it on and clears the
  // box for the next one), and Enter on an empty box confirms the selection.
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (multiSelect) {
      if (query.trim()) {
        const top = filteredPigs[0];
        if (top) {
          onToggle?.(top.id);
          setQuery('');
        }
      } else if (selectedPigIds.length > 0) {
        onSave?.();
      }
    } else {
      const top = filteredPigs[0];
      if (top) {
        onSelect(top.id);
        setDropdownOpen(false);
      }
    }
  };

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
          <div className="pigPickerSearch">
            <input
              type="text"
              className="pigPickerSearchInput"
              placeholder="Search pigs..."
              title={
                multiSelect
                  ? 'Enter to add the top match, Enter on an empty box to save, Esc to close'
                  : 'Enter to pick the top match, Esc to close'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoFocus
            />
            {query && (
              <button
                type="button"
                className="pigPickerSearchClear"
                onClick={() => setQuery('')}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
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
            {filteredPigs.length === 0 && (
              <div className="pigPickerEmpty">No pigs found</div>
            )}
            {filteredPigs.map((pig, index) => {
              const active = multiSelect
                ? selectedPigIds.includes(pig.id)
                : pig.id === selectedPigId;
              // Highlight the top match so it's clear what Enter will pick.
              const topMatch = index === 0 && query.trim().length > 0;
              return (
                <button
                  key={pig.id}
                  type="button"
                  className={`pigPickerOption ${active ? 'pigPickerOptionActive' : ''}${topMatch ? ' pigPickerOptionTop' : ''}`}
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
