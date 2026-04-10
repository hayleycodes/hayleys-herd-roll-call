import type { Pig } from "../../../services/pigs.types";
import PigCard from "../PigCard/PigCard";
import "./PassedPigList.css";

type PigListProps = {
  passedPigs: Pig[];
};

const PigList = ({ passedPigs }: PigListProps) => {
  return (
    <div className="passedPigListWrapper">
      <h2>Forever in the Herd</h2>
      <div className="passedPigList">
        {passedPigs.map((pig) => (
          <PigCard key={pig.id} pig={pig} passed />
        ))}
      </div>
    </div>
  );
};

export default PigList;
