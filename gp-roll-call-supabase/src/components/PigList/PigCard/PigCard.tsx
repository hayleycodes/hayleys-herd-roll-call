import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import type { Pig } from "../../../services/pigs.service";
import "./PigCard.css";

type Props = {
  pig: Pig;
  relationship?: string;
  onEyeClick?: () => void;
};

const PigCard = ({ pig, relationship, onEyeClick }: Props) => {
  const lastSighted = pig.last_sighted
    ? formatDistanceToNow(new Date(pig.last_sighted), {
        addSuffix: true,
      })
    : "";

  return (
    <div className="pigCard">
      <Link to={`/pigs/${pig.id}`}>
        <h3>{pig.name}</h3>
        {relationship && <span>{relationship}</span>}
      </Link>

      <div className="lastSighted">
        <span>{lastSighted}</span>

        {onEyeClick && (
          <button className="eyeButton" onClick={onEyeClick}>
            👀
          </button>
        )}
      </div>
    </div>
  );
};

export default PigCard;
