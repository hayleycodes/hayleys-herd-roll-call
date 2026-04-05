import type { Pig } from "../../services/pigs.service";
import PigCard from "./PigCard/PigCard";
import "./PigList.css";

type PigListProps = {
  pigs: Pig[];
};

const PigList = ({ pigs }: PigListProps) => {
  return (
    <div className="pigList">
      {pigs.map((pig) => (
        <PigCard pig={pig} />
      ))}
    </div>
  );
};

export default PigList;
