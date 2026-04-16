import { useState, useEffect } from 'react';
import {
  createPigHealth,
  updatePigHealth,
} from '../../services/pig-health.service';
import type { Pig, HealthRecord } from '../../services/pigs.types';
import PigPicker from '../PigPicker/PigPicker';
import Button from '../ui/Button/Button';
import './HealthForm.css';

type Props =
  | {
      pigId: number;
      pigs?: never;
      onRecordAdded: () => void;
      editingRecord?: HealthRecord | null;
      onCancelEdit?: () => void;
    }
  | {
      pigId?: never;
      pigs: Pig[];
      onRecordAdded: () => void;
      editingRecord?: HealthRecord | null;
      onCancelEdit?: () => void;
    };

const HealthForm = (props: Props) => {
  const { onRecordAdded, editingRecord, onCancelEdit } = props;

  const [selectedPigId, setSelectedPigId] = useState<number | ''>(
    props.pigId ?? ''
  );
  const [notes, setNotes] = useState('');
  const [nailClip, setNailClip] = useState(false);
  const [haircut, setHaircut] = useState(false);
  const [parasiteTreatment, setParasiteTreatment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showDropdown = !!props.pigs;
  const isEditing = !!editingRecord;

  useEffect(() => {
    if (editingRecord) {
      setNotes(editingRecord.notes ?? '');
      setNailClip(editingRecord.nail_clip ?? false);
      setHaircut(editingRecord.haircut ?? false);
      setParasiteTreatment(editingRecord.parasite_treatment ?? false);
      if (showDropdown) setSelectedPigId(editingRecord.pig_id);
    }
  }, [editingRecord, showDropdown]);

  const resetForm = () => {
    setNotes('');
    setNailClip(false);
    setHaircut(false);
    setParasiteTreatment(false);
    if (showDropdown) setSelectedPigId('');
  };

  const handleSubmit = async () => {
    const pigId = isEditing ? editingRecord.pig_id : selectedPigId;
    if (!pigId) return;
    try {
      setSubmitting(true);
      setError(null);
      if (isEditing) {
        await updatePigHealth(editingRecord.id, {
          notes: notes || null,
          nail_clip: nailClip,
          haircut,
          parasite_treatment: parasiteTreatment,
        });
      } else {
        await createPigHealth({
          pig_id: pigId,
          notes,
          nail_clip: nailClip,
          haircut,
          parasite_treatment: parasiteTreatment,
        } as any);
      }
      resetForm();
      if (isEditing) onCancelEdit?.();
      onRecordAdded();
    } catch (err: any) {
      setError(err.message ?? 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onCancelEdit?.();
  };

  return (
    <div className={`healthForm ${isEditing ? 'healthFormEditing' : ''}`} key={editingRecord?.id ?? 'new'}>
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
          <label>
            <input
              type="checkbox"
              checked={parasiteTreatment}
              onChange={(e) => setParasiteTreatment(e.target.checked)}
            />
            Parasite treatment
          </label>
        </div>
      </div>

      {error && <p style={{ color: 'red', margin: 0, fontSize: 12 }}>{error}</p>}
      <div className="healthFormButtons">
        {showDropdown && (
          <PigPicker
            pigs={props.pigs}
            selectedPigId={selectedPigId}
            onSelect={setSelectedPigId}
            view="compact"
            theme="green"
          />
        )}
        {isEditing && (
          <Button onClick={handleCancel}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={submitting || !(isEditing ? editingRecord.pig_id : selectedPigId)}
        >
          {submitting ? 'Saving...' : isEditing ? 'Save' : 'Add record'}
        </Button>
      </div>
    </div>
  );
};

export default HealthForm;
