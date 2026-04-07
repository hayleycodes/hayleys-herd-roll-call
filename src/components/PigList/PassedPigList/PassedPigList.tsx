import type { Pig } from "../../../services/pigs.types";
import PassedPigCard from "../PassedPigCards/PassedPigCard";
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
          <PassedPigCard key={pig.id} pig={pig} />
        ))}
      </div>
    </div>
  );
};

export default PigList;
