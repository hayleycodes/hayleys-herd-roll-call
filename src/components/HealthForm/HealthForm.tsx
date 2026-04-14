import { useState } from 'react';
import { createPigHealth } from '../../services/pig-health.service';
import type { Pig } from '../../services/pigs.types';
import PigPicker from '../PigPicker/PigPicker';
import './HealthForm.css';

type Props =
  | { pigId: number; pigs?: never; onRecordAdded: () => void }
  | { pigId?: never; pigs: Pig[]; onRecordAdded: () => void };

const HealthForm = (props: Props) => {
  const { onRecordAdded } = props;

  const [selectedPigId, setSelectedPigId] = useState<number | ''>(
    props.pigId ?? ''
  );
  const [notes, setNotes] = useState('');
  const [nailClip, setNailClip] = useState(false);
  const [haircut, setHaircut] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const showDropdown = !!props.pigs;

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
        <PigPicker
          pigs={props.pigs}
          selectedPigId={selectedPigId}
          onSelect={setSelectedPigId}
          theme="green"
        />
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
