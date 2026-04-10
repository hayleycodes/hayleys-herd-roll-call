import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import "./HealthPanel.css";
import {
  createPigHealth,
  getPigHealth,
} from "../../services/pig-health.service";
import type { Pig, HealthRecord } from "../../services/pigs.types";

type Props = {
  pig: Pig;
  health: HealthRecord[];
  setHealth: (h: HealthRecord[]) => void;
};

const HealthPanel = ({ pig, health, setHealth }: Props) => {
  const [notes, setNotes] = useState("");
  const [nailClip, setNailClip] = useState(false);
  const [haircut, setHaircut] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAddHealth = async () => {
    try {
      setSubmitting(true);

      await createPigHealth({
        pig_id: pig.id,
        notes,
        nail_clip: nailClip,
        haircut,
      } as any);

      const updated = await getPigHealth(pig.id);
      setHealth(updated);

      setNotes("");
      setNailClip(false);
      setHaircut(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pigCardDetail healthPanel">
      <section>
        <h2>Health 🏥</h2>

        {/* FORM */}
        {!pig.passed_away && (
          <div className="healthForm">
            <textarea
              placeholder="Notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="healthFormWrapper">
              <div className="checkboxes">
                <label>
                  <input
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
              </div>

              <button className="btn-outline" onClick={handleAddHealth} disabled={submitting}>
                {submitting ? "Saving..." : "Add record"}
              </button>
            </div>
          </div>
        )}

        {/* LIST */}
        {health.length === 0 ? (
          <p className="muted">No health records yet</p>
        ) : (
          <div>
            {health.map((record) => (
              <div
                key={record.id}
                className={`healthCard ${
                  record.passed_away ? "passedAway" : ""
                }`}
              >
                <div className="cardHeader">
                  {!record.passed_away && (
                    <span className="muted">
                      {formatDistanceToNow(new Date(record.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  )}

                  <div className="icons">
                    {record.nail_clip && <p>💅 Nail clip</p>}
                    {record.haircut && <p>✂️ Haircut</p>}
                  </div>
                </div>

                <div>
                  {record.passed_away ? (
                    <p>
                      💀 {new Date(record.passed_away).toLocaleDateString()}
                    </p>
                  ) : (
                    record.notes && <p>{record.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HealthPanel;
