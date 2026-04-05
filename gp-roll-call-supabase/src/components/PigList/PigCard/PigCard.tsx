import { Link } from "react-router-dom";
import type { Pig } from "../../../services/pigs.service";
import "./PigCard.css";

type PigCardProps = {
  pig: Pig;
};

const PigCard = ({ pig }: PigCardProps) => {
  return (
    <Link to={`/pigs/${pig.id}`} className="pigCard">
      {pig.name}
    </Link>
  );
};

export default PigCard;
