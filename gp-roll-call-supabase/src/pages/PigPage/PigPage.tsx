import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getPig,
  getPigChildren,
  getPigHealth,
  getPigParents,
  getPigSiblings,
  type Pig,
} from "../../services/pigs.service";
import "./PigPage.css";
import PigCard from "../../components/PigList/PigCard/PigCard";

const PigPage = () => {
  const { id } = useParams();

  const [pig, setPig] = useState<Pig | null>(null);
  const [health, setHealth] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [siblings, setSiblings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) throw new Error("Missing pig id in route");

        const pigId = Number(id);
        if (isNaN(pigId)) throw new Error("Invalid pig id");

        const [pigData, healthData, parentsData, childrenData, siblingsData] =
          await Promise.all([
            getPig(pigId),
            getPigHealth(pigId),
            getPigParents(pigId),
            getPigChildren(pigId),
            getPigSiblings(pigId),
          ]);

        setPig(pigData);
        setHealth(healthData);
        setParents(parentsData);
        setChildren(childrenData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="pigPage">
        <div className="pigCardDetail">Loading pig... 🐷</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pigPage">
        <div className="pigCardDetail error">Error: {error}</div>
      </div>
    );
  }

  if (!pig) {
    return (
      <div className="pigPage">
        <div className="pigCardDetail">Pig not found 🐽</div>
      </div>
    );
  }

  return (
    <div className="pigPage">
      <div className="pigCardDetail">
        <h1 className="pigName">{pig.name}</h1>

        <p className="pigDescription">
          {pig.description ?? "No description yet 🐷"}
        </p>

        <div className="pigMeta">
          {pig.created_at && (
            <span>Added: {new Date(pig.created_at).toLocaleDateString()}</span>
          )}
          {pig.dob && (
            <span>Date of Birth: {new Date(pig.dob).toLocaleDateString()}</span>
          )}
        </div>

        {/* 🏥 HEALTH DATA */}
        <section className="section">
          <h2>Health 🏥</h2>

          {health.length === 0 ? (
            <p className="muted">No health records yet</p>
          ) : (
            health.map((healthEntry) => (
              <div key={healthEntry.id} className="healthCard">
                {healthEntry.notes ? (
                  <div>
                    <p>{healthEntry.notes}</p>
                    <span className="muted">
                      {new Date(healthEntry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ) : null}

                {healthEntry.passed_away && (
                  <div className="error">
                    Passed:{" "}
                    {new Date(healthEntry.passed_away).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </div>
      <div className="pigCardDetail">
        {/* 👥 RELATIONSHIPS */}
        {/* 👥 FAMILY */}
        <section className="section">
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

          {/* SIBLINGS */}
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
    </div>
  );
};

export default PigPage;
