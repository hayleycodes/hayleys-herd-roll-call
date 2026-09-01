import './HealthPanel.css';
import type { Pig, HealthRecord } from '../../services/pigs.types';
import Panel from '../ui/Panel/Panel';
import HealthCardList from '../HealthCardList/HealthCardList';

type Props = {
  pig: Pig;
  health: HealthRecord[];
  setHealth: (h: HealthRecord[]) => void;
  sick?: boolean;
};

const HealthPanel = ({ pig, health, setHealth, sick }: Props) => {
  return (
    <Panel
      heading="Health 🏥"
      theme={sick ? 'custom' : 'green'}
      color={sick ? '#e8a317' : undefined}
    >
      <HealthCardList
        pig={pig}
        health={health}
        setHealth={setHealth}
        emptyClassName="noRecordsMessage muted"
      />
    </Panel>
  );
};

export default HealthPanel;
