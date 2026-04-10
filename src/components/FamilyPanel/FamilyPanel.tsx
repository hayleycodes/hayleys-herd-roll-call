import type { PigFamily } from "../../services/pig-relationships.service";
import PigCard from "../PigList/PigCard/PigCard";
import "./FamilyPanel.css";

type Props = {
  family: PigFamily;
};

const FamilyPanel = ({ family }: Props) => {
  return (
    <div className="pigCardDetail familyPanel">
      <section>
        <h2>Family 👥</h2>

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
                <PigCard pig={pig} passed={!!pig.passed_away} />
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
                <PigCard pig={pig} passed={!!pig.passed_away} />
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
                <PigCard pig={pig} passed={!!pig.passed_away} />
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
                <PigCard pig={pig} passed={!!pig.passed_away} />
              </div>
            ))}
          </div>
        )}

        
      </section>
    </div>
  );
};

export default FamilyPanel;
