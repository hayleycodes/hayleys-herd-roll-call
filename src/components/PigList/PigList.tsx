import { useState } from "react";
import PigCard from "./PigCard/PigCard";
import "./PigList.css";
import type { Pig } from "../../services/pigs.types";
import { createPigSighting } from "../../services/pigs.service";
import PassedPigList from "./PassedPigList/PassedPigList";
import Modal from "../ui/Modal/Modal";

type PigListProps = {
  pigs: Pig[];
  passedPigs: Pig[];
  setPigs: React.Dispatch<React.SetStateAction<Pig[]>>;
};

const PigList = ({ pigs, passedPigs, setPigs }: PigListProps) => {
  const [selectedPig, setSelectedPig] = useState<Pig | null>(null);
  const [updating, setUpdating] = useState(false);

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
    setSelectedPig(null);
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

      <PassedPigList passedPigs={passedPigs} />

      <Modal isOpen={!!selectedPig} onClose={closeModal}>
        <p>Mark {selectedPig?.name} as seen?</p>

        <div className="confirmActions">
          <button onClick={closeModal}>Cancel</button>

          <button onClick={handleConfirm} disabled={updating}>
            {updating ? "Saving..." : "Confirm"}
          </button>
        </div>
      </Modal>
    </>
  );
};

export default PigList;
