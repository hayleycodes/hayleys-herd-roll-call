import { formatDistanceToNow } from 'date-fns';
import './HealthPanel.css';
import { getPigHealth } from '../../services/pig-health.service';
import type { Pig, HealthRecord } from '../../services/pigs.types';
import Panel from '../ui/Panel/Panel';
import HealthForm from '../HealthForm/HealthForm';

type Props = {
  pig: Pig;
  health: HealthRecord[];
  setHealth: (h: HealthRecord[]) => void;
  sick?: boolean;
};

const HealthPanel = ({ pig, health, setHealth, sick }: Props) => {
  const handleRecordAdded = async () => {
    const updated = await getPigHealth(pig.id);
    setHealth(updated);
  };

  return (
    <Panel heading="Health 🏥" theme={sick ? 'custom' : 'green'} color={sick ? '#e8a317' : undefined}>
      {!pig.passed_away && (
        <HealthForm pigId={pig.id} onRecordAdded={handleRecordAdded} />
      )}

      {/* LIST */}
      {health.length === 0 ? (
        <p className="muted">No health records yet</p>
      ) : (
        <div className="healthCardList">
          {health.map((record) => (
            <div
              key={record.id}
              className="healthCard"
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
                  {record.nail_clip && <p className="healthBadge">💅 Nail clip</p>}
                  {record.haircut && <p className="healthBadge">✂️ Haircut</p>}
                </div>
              </div>

              <div>
                {record.passed_away ? (
                  <p>💀 {new Date(record.passed_away).toLocaleDateString()}</p>
                ) : (
                  record.notes && <p>{record.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
};

export default HealthPanel;
