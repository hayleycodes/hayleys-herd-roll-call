import { useEffect, useRef, useState } from 'react';
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
  theme?: 'green' | 'purple';
};

const PigPicker = ({
  pigs,
  selectedPigId,
  onSelect,
  view = 'default',
  theme = 'purple',
}: Props) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  return (
    <div className={`pigPickerDropdown pigPicker--${theme}`} ref={dropdownRef}>
      {view === 'compact' ? (
        <button
          type="button"
          className="pigPickerCompactTrigger"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          title={selectedPig ? selectedPig.name : 'Link a pig'}
        >
          {selectedPig ? (
            <PigThumb imagePath={selectedPig.image_path} />
          ) : (
            <span className="pigPickerCompactIcon">🐖</span>
          )}
        </button>
      ) : (
        <button
          type="button"
          className="pigPickerTrigger"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          {selectedPig ? (
            <>
              <PigThumb imagePath={selectedPig.image_path} />
              <span>{selectedPig.name}</span>
            </>
          ) : (
            <span className="pigPickerPlaceholder">Select a pig...</span>
          )}
        </button>
      )}
      {dropdownOpen && (
        <div className="pigPickerMenu">
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
            {pigs.map((pig) => (
              <button
                key={pig.id}
                type="button"
                className={`pigPickerOption ${pig.id === selectedPigId ? 'pigPickerOptionActive' : ''}`}
                onClick={() => {
                  onSelect(pig.id);
                  setDropdownOpen(false);
                }}
              >
                <PigThumb imagePath={pig.image_path} />
                <span>{pig.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PigPicker;
