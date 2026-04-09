import { Link } from "react-router-dom";
import type { Pig } from "../../../services/pigs.types";
import "./PassedPigCard.css";

type Props = {
  pig: Pig;
};

const PassedPigCard = ({ pig }: Props) => {
  return (
    <div
      className="passedAwayCard"
      style={{
        backgroundImage: pig.image_path ? `url(${pig.image_path})` : undefined,
      }}
    >
      <Link to={`/pigs/${pig.id}`}>
        <h3>{pig.name}</h3>
      </Link>

      {/* <p className="passedIcon">🌈</p> */}
    </div>
  );
};

export default PassedPigCard;
