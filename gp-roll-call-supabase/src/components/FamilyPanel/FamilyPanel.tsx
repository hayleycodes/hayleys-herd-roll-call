import PigCard from "../PigList/PigCard/PigCard";
import "./FamilyPanel.css";

type Props = {
  parents: any[];
  children: any[];
  siblings: any[];
};

const FamilyPanel = ({ parents, children, siblings }: Props) => {
  return (
    <div className="pigCardDetail">
      <section>
        <h2>Family 👥</h2>

        {/* Parents */}
        <h3>Parents 🐖⬆️</h3>
        {parents.length === 0 ? (
          <p className="muted">No parents recorded</p>
        ) : (
          <div className="family">
            {parents.map((r) => (
              <div key={r.id} className="relationshipCard">
                <PigCard pig={r.pigs} />
              </div>
            ))}
          </div>
        )}

        {/* Children */}
        <h3>Children 🐷⬇️</h3>
        {children.length === 0 ? (
          <p className="muted">No children recorded</p>
        ) : (
          <div className="family">
            {children.map((r) => (
              <div key={r.id} className="relationshipCard">
                <PigCard pig={r.pigs} />
              </div>
            ))}
          </div>
        )}

        {/* Siblings */}
        <h3>Siblings 🐖🤝🐖</h3>
        {siblings.length === 0 ? (
          <p className="muted">No siblings recorded</p>
        ) : (
          <div className="family">
            {siblings.map((r) => (
              <div key={r.id} className="relationshipCard">
                <PigCard pig={r.pigs} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default FamilyPanel;
