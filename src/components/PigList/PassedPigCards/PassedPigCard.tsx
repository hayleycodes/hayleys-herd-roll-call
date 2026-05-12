import { Link } from 'react-router-dom';
import type { Pig } from '../../../services/pigs.types';
import './PassedPigCard.css';
import { getPigImageUrl } from '../../../services/pig-images.service';
import { useEffect, useState } from 'react';

type Props = {
  pig: Pig;
};

const PassedPigCard = ({ pig }: Props) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!pig.image_path) return;

      const { signedUrl } = await getPigImageUrl(pig.image_path);
      setUrl(signedUrl);
    };

    load();
  }, [pig.image_path]);
  console.log(pig);
  return (
    <div className="passedAwayCard">
      <div
        className="passedAwayCardImage"
        style={{
          backgroundImage: url ? `url(${url})` : undefined,
        }}
      >
        <Link to={`/pigs/${pig.id}`}>
          <h3>{pig.name}</h3>
        </Link>
      </div>

      {/* <p className="passedIcon">🌈</p> */}
    </div>
  );
};

export default PassedPigCard;
