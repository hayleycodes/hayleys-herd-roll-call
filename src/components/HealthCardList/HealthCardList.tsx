import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  getPigHealth,
  deletePigHealth,
} from '../../services/pig-health.service';
import type { Pig, HealthRecord } from '../../services/pigs.types';
import EmojiButton from '../ui/EmojiButton/EmojiButton';
import Dialog from '../ui/Dialog/Dialog';
import HealthForm from '../HealthForm/HealthForm';

type Props = {
  pig: Pig;
  health: HealthRecord[];
  setHealth: (h: HealthRecord[]) => void;
  /** Called after a record is added, edited, or deleted. */
  onChange?: () => void;
  /** Class for the empty-state message; differs between call sites. */
  emptyClassName?: string;
};

/**
 * The health-log form + card list for a single pig, with a delete
 * confirmation dialog. Shared by HealthPanel and CareHealthPanel.
 */
const HealthCardList = ({
  pig,
  health,
  setHealth,
  onChange,
  emptyClassName = 'muted',
}: Props) => {
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handleRecordAdded = async () => {
    const updated = await getPigHealth(pig.id);
    setHealth(updated);
    onChange?.();
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteId === null) return;
    await deletePigHealth(confirmDeleteId);
    const updated = await getPigHealth(pig.id);
    setHealth(updated);
    setConfirmDeleteId(null);
    onChange?.();
  };

  return (
    <>
      {!pig.passed_away && (
        <HealthForm
          pigId={pig.id}
          onRecordAdded={handleRecordAdded}
          editingRecord={editingRecord}
          onCancelEdit={() => setEditingRecord(null)}
        />
      )}

      {health.length === 0 ? (
        <p className={emptyClassName}>No health records yet</p>
      ) : (
        <div className="healthCardList">
          {health.map((record) => (
            <div
              key={record.id}
              className={`healthCard ${editingRecord?.id === record.id ? 'healthCardEditing' : ''}`}
            >
              <div className="healthCardHeader">
                {!record.passed_away && (
                  <span className="muted">
                    {formatDistanceToNow(new Date(record.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                )}

                <div className="healthCardIcons">
                  {record.nail_clip && (
                    <p className="healthBadge">💅 Nail clip</p>
                  )}
                  {record.haircut && <p className="healthBadge">✂️ Haircut</p>}
                  {record.parasite_treatment && (
                    <p className="healthBadge">🐛 Parasite treatment</p>
                  )}
                </div>
              </div>

              <div>
                {record.passed_away ? (
                  <p>💀 {new Date(record.passed_away).toLocaleDateString()}</p>
                ) : (
                  record.notes && <p>{record.notes}</p>
                )}
              </div>

              {!record.passed_away && (
                <div className="healthCardActions">
                  <EmojiButton
                    className="healthCardBtn"
                    size="sm"
                    onClick={() => setEditingRecord(record)}
                  >
                    ✏️
                  </EmojiButton>
                  <EmojiButton
                    className="healthCardBtn healthCardBtnDelete"
                    size="sm"
                    onClick={() => setConfirmDeleteId(record.id)}
                  >
                    🗑️
                  </EmojiButton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        message="Delete this health record?"
        onConfirm={handleConfirmDelete}
        confirmLabel="Delete"
        cancelVariant="danger"
        confirmVariant="success"
      />
    </>
  );
};

export default HealthCardList;
