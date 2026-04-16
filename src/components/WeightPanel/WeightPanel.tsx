import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import './WeightPanel.css';
import { getPigWeights, createPigWeight } from '../../services/pig-weights.service';
import type { Pig, WeightRecord } from '../../services/pigs.types';
import Panel from '../ui/Panel/Panel';
import Button from '../ui/Button/Button';

type Props = {
  pig: Pig;
  weights: WeightRecord[];
  setWeights: (w: WeightRecord[]) => void;
};

const WeightPanel = ({ pig, weights, setWeights }: Props) => {
  const [grams, setGrams] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(grams);
    if (!value || value <= 0) return;

    setSubmitting(true);
    try {
      await createPigWeight(pig.id, value);
      const updated = await getPigWeights(pig.id);
      setWeights(updated);
      setGrams('');
    } finally {
      setSubmitting(false);
    }
  };

  const getChange = (index: number): string | null => {
    if (index >= weights.length - 1) return null;
    const diff = weights[index].weight_grams - weights[index + 1].weight_grams;
    if (diff === 0) return '0g';
    return diff > 0 ? `+${diff}g` : `${diff}g`;
  };

  const getChangeClass = (index: number): string => {
    if (index >= weights.length - 1) return '';
    const diff = weights[index].weight_grams - weights[index + 1].weight_grams;
    if (diff > 0) return 'up';
    if (diff < 0) return 'down';
    return 'same';
  };

  return (
    <Panel heading="Weight ⚖️" theme="green">
      {!pig.passed_away && (
        <form className="weightForm" onSubmit={handleAdd}>
          <input
            type="number"
            placeholder="Weight in grams"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            min="1"
          />
          <Button type="submit" disabled={submitting || !grams}>
            {submitting ? 'Adding...' : 'Add'}
          </Button>
        </form>
      )}

      {weights.length === 0 ? (
        <p className="muted">No weight records yet</p>
      ) : (
        <div className="weightList">
          {weights.map((record, index) => {
            const change = getChange(index);
            return (
              <div key={record.id} className="weightCard">
                <p className="weightValue">{record.weight_grams}g</p>
                <div className="weightMeta">
                  <span className="muted">
                    {formatDistanceToNow(new Date(record.recorded_at), {
                      addSuffix: true,
                    })}
                  </span>
                  {change !== null && (
                    <p className={`weightChange ${getChangeClass(index)}`}>
                      {change}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
};

export default WeightPanel;
