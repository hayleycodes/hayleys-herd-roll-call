import type { Pig } from "../../../services/pigs.service";
import "./PigCard.css";

type PigCardProps = {
  pig: Pig;
};

const PigCard = ({ pig }: PigCardProps) => {
  return <div className="pigCard">{pig.name}</div>;
};

export default PigCard;
