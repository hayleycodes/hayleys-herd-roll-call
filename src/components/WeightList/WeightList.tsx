import { useState } from 'react';
import { Link } from 'react-router-dom';
import './WeightList.css';
import { createPigWeight } from '../../services/pig-weights.service';
import type { Pig, WeightRecord } from '../../services/pigs.types';
import PigThumb from '../ui/PigThumb/PigThumb';
import Button from '../ui/Button/Button';
import EmojiButton from '../ui/EmojiButton/EmojiButton';

type Props = {
  pigs: Pig[];
  /** Latest weight per pig id. */
  weights: Map<number, WeightRecord>;
  /** Called after a weight is saved so the parent can refresh its map. */
  onWeightAdded: () => void | Promise<void>;
  /** Placeholder class for pigs with no photo; differs between call sites. */
  thumbPlaceholderClassName?: string;
};

/**
 * List of pigs with their latest weight and an inline "add weight" form.
 * Rendered in HealthLogPage's weight tab.
 */
const WeightList = ({
  pigs,
  weights,
  onWeightAdded,
  thumbPlaceholderClassName = 'weightThumbPlaceholder',
}: Props) => {
  const [addingPigId, setAddingPigId] = useState<number | null>(null);
  const [gramsInput, setGramsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (pigId: number) => {
    const value = Number(gramsInput);
    if (!value || value <= 0) return;

    setSubmitting(true);
    try {
      await createPigWeight(pigId, value);
      await onWeightAdded();
      setAddingPigId(null);
      setGramsInput('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="weightsList">
      {pigs.map((pig) => {
        const record = weights.get(pig.id);
        const isAdding = addingPigId === pig.id;
        return (
          <div key={pig.id} className="weightsCardWrapper">
            <div className="weightsCard">
              <Link to={`/pigs/${pig.id}`} className="weightsCardLink">
                <PigThumb
                  imagePath={pig.image_paths?.[0] ?? null}
                  className="weightThumb"
                  placeholderClassName={thumbPlaceholderClassName}
                />
                <div className="weightsCardInfo">
                  <span className="weightsName">{pig.name}</span>
                  <span className={`weightsValue ${!record ? 'muted' : ''}`}>
                    {record ? `${record.weight_grams}g` : 'No weight recorded'}
                  </span>
                </div>
              </Link>
              <EmojiButton
                className="weightsAddBtn"
                size="sm"
                shape="circle"
                onClick={() => {
                  setAddingPigId(isAdding ? null : pig.id);
                  setGramsInput('');
                }}
              >
                {isAdding ? '✕' : '+'}
              </EmojiButton>
            </div>
            {isAdding && (
              <form
                className="weightsInlineForm"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAdd(pig.id);
                }}
              >
                <input
                  type="number"
                  placeholder="Grams"
                  value={gramsInput}
                  onChange={(e) => setGramsInput(e.target.value)}
                  min="1"
                  autoFocus
                />
                <Button type="submit" disabled={submitting || !gramsInput}>
                  {submitting ? 'Saving...' : 'Save'}
                </Button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WeightList;
