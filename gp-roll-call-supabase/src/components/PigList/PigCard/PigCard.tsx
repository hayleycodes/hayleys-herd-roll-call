import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import type { Pig } from "../../../services/pigs.service";
import "./PigCard.css";

type PigCardProps = {
  pig: Pig;
  relationship?: String;
};

const PigCard = ({ pig, relationship }: PigCardProps) => {
  const last_sighted = pig.last_sighted
    ? formatDistanceToNow(new Date(pig.last_sighted), {
        addSuffix: true,
      })
    : "";
  return (
    <Link to={`/pigs/${pig.id}`} className="pigCard">
      <h3>{pig.name}</h3>
      {relationship ? <span>{relationship}</span> : ""}
      <span>{last_sighted}</span>
    </Link>
  );
};

export default PigCard;
