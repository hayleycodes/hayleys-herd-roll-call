import { Link } from "react-router-dom";
import type { Pig } from "../../../services/pigs.service";
import "./PigCard.css";

type PigCardProps = {
  pig: Pig;
  relationship?: String;
};

const PigCard = ({ pig, relationship }: PigCardProps) => {
  return (
    <Link to={`/pigs/${pig.id}`} className="pigCard">
      <h3>{pig.name}</h3>
      {relationship ? <span>{relationship}</span> : ""}
    </Link>
  );
};

export default PigCard;
