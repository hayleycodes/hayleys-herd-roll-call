import { useEffect, useRef, useState } from 'react';
import { getPigImageUrl } from '../../services/pig-images.service';
import { createPigHealth } from '../../services/pig-health.service';
import type { Pig } from '../../services/pigs.types';
import './HealthForm.css';

const PigThumb = ({ imagePath }: { imagePath: string | null }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePath) return;
    getPigImageUrl(imagePath).then(({ signedUrl }) => setUrl(signedUrl));
  }, [imagePath]);

  if (!url)
    return <div className="healthFormThumb healthFormThumbPlaceholder">🐹</div>;
  return (
    <div
      className="healthFormThumb"
      style={{ backgroundImage: `url(${url})` }}
    />
  );
};

type Props =
  | { pigId: number; pigs?: never; onRecordAdded: () => void }
  | { pigId?: never; pigs: Pig[]; onRecordAdded: () => void };

const HealthForm = (props: Props) => {
  const { onRecordAdded } = props;

  const [selectedPigId, setSelectedPigId] = useState<number | ''>(
    props.pigId ?? ''
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [nailClip, setNailClip] = useState(false);
  const [haircut, setHaircut] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const showDropdown = !!props.pigs;
  const selectedPig = props.pigs?.find((p) => p.id === selectedPigId) ?? null;

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

  const handleSubmit = async () => {
    if (!selectedPigId) return;
    try {
      setSubmitting(true);
      await createPigHealth({
        pig_id: selectedPigId,
        notes,
        nail_clip: nailClip,
        haircut,
      } as any);

      setNotes('');
      setNailClip(false);
      setHaircut(false);
      if (showDropdown) setSelectedPigId('');
      onRecordAdded();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="healthForm">
      {showDropdown && (
        <div className="pigDropdown" ref={dropdownRef}>
          <button
            type="button"
            className="pigDropdownTrigger"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {selectedPig ? (
              <>
                <PigThumb imagePath={selectedPig.image_path} />
                <span>{selectedPig.name}</span>
              </>
            ) : (
              <span className="pigDropdownPlaceholder">Select a pig...</span>
            )}
          </button>
          {dropdownOpen && (
            <div className="pigDropdownMenu">
              {props.pigs.map((pig) => (
                <button
                  key={pig.id}
                  type="button"
                  className={`pigDropdownOption ${pig.id === selectedPigId ? 'pigDropdownOptionActive' : ''}`}
                  onClick={() => {
                    setSelectedPigId(pig.id);
                    setDropdownOpen(false);
                  }}
                >
                  <PigThumb imagePath={pig.image_path} />
                  <span>{pig.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <textarea
        placeholder="Notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="healthFormFooter">
        <div className="healthFormCheckboxes">
          <label>
            <input
              className="leftCheckbox"
              type="checkbox"
              checked={nailClip}
              onChange={(e) => setNailClip(e.target.checked)}
            />
            Nail clip
          </label>
          <label>
            <input
              type="checkbox"
              checked={haircut}
              onChange={(e) => setHaircut(e.target.checked)}
            />
            Haircut
          </label>
        </div>

        <button
          className="btn-outline addButton"
          onClick={handleSubmit}
          disabled={submitting || !selectedPigId}
        >
          {submitting ? 'Saving...' : 'Add record'}
        </button>
      </div>
    </div>
  );
};

export default HealthForm;
