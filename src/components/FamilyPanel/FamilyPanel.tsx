import type { PigFamily } from '../../services/pig-relationships.service';
import PigCard from '../PigList/PigCard/PigCard';
import Panel from '../ui/Panel/Panel';
import './FamilyPanel.css';

type Props = {
  family: PigFamily;
};

const FamilyPanel = ({ family }: Props) => {
  return (
    <Panel heading="Family 🌳" theme="blue">
      {/* Siblings */}
      <h3>Siblings 🐖🤝🐖</h3>
      {family.siblings.length === 0 ? (
        <div className="emptyFamily">
          <p className="muted">No siblings recorded</p>
        </div>
      ) : (
        <div className="family">
          {family.siblings.map((pig) => (
            <div key={pig.id} className="relationshipCard">
              <PigCard pig={pig} passed={!!pig.passed_away} hideLastSeen />
            </div>
          ))}
        </div>
      )}

      {/* Parents */}
      <h3>Parents 🐖⬆️</h3>
      {family.parents.length === 0 ? (
        <div className="emptyFamily">
          <p className="muted">No parents recorded</p>
        </div>
      ) : (
        <div className="family">
          {family.parents.map((pig) => (
            <div key={pig.id} className="relationshipCard">
              <PigCard pig={pig} passed={!!pig.passed_away} hideLastSeen />
            </div>
          ))}
        </div>
      )}

      {/* Children */}
      <h3>Children 🐷⬇️</h3>
      {family.children.length === 0 ? (
        <div className="emptyFamily">
          <p className="muted">No children recorded</p>
        </div>
      ) : (
        <div className="family">
          {family.children.map((pig) => (
            <div key={pig.id} className="relationshipCard">
              <PigCard pig={pig} passed={!!pig.passed_away} hideLastSeen />
            </div>
          ))}
        </div>
      )}

      {/* Foster Family */}
      <h3>Foster Family 🫶</h3>
      {family.fosterFamily.length === 0 ? (
        <div className="emptyFamily">
          <p className="muted">No foster family recorded</p>
        </div>
      ) : (
        <div className="family">
          {family.fosterFamily.map((pig) => (
            <div key={pig.id} className="relationshipCard">
              <PigCard pig={pig} passed={!!pig.passed_away} hideLastSeen />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
};

export default FamilyPanel;
