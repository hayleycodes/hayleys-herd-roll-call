import { useState } from "react";
import { createPigSighting, type Pig } from "../../services/pigs.service";
import PigCard from "./PigCard/PigCard";
import "./PigList.css";

type PigListProps = {
  pigs: Pig[];
  setPigs: React.Dispatch<React.SetStateAction<Pig[]>>;
};

const PigList = ({ pigs, setPigs }: PigListProps) => {
  const [selectedPig, setSelectedPig] = useState<Pig | null>(null);
  const [updating, setUpdating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleConfirm = async () => {
    if (!selectedPig) return;

    const now = new Date().toISOString();

    try {
      setUpdating(true);

      await createPigSighting(selectedPig.id);

      setPigs((prev) =>
        prev
          .map((p) =>
            p.id === selectedPig.id ? { ...p, last_sighted: now } : p,
          )
          .sort((a, b) => {
            return (
              new Date(a.last_sighted ?? 0).getTime() -
              new Date(b.last_sighted ?? 0).getTime()
            );
          }),
      );

      setSelectedPig(null);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const closeModal = () => {
    setIsClosing(true);

    setTimeout(() => {
      setSelectedPig(null);
      setIsClosing(false);
    }, 200);
  };

  return (
    <>
      <div className="pigList">
        {pigs.map((pig) => (
          <PigCard
            key={pig.id}
            pig={pig}
            onEyeClick={() => setSelectedPig(pig)}
          />
        ))}
      </div>

      {selectedPig && (
        <div className="confirmOverlay" onClick={closeModal}>
          <div
            className={`confirmModal ${isClosing ? "closing" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <p>Mark {selectedPig.name} as seen?</p>

            <div className="confirmActions">
              <button onClick={closeModal}>Cancel</button>

              <button onClick={handleConfirm} disabled={updating}>
                {updating ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PigList;
