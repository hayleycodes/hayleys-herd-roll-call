import { useParams } from "react-router-dom";
import "./PigPage.css";
import { useEffect, useState } from "react";
import { getPig, type Pig } from "../../services/pigs.service";

const PigCard = () => {
  const [pig, setPig] = useState<Pig>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { id } = useParams();

  useEffect(() => {
    // fetch pig by id
    const load = async () => {
      try {
        const data = await getPig(id);
        setPig(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  return (
    <div>
      <h2>Pig ID: {id}</h2>
      {pig ? (
        <div>
          <p>{pig.name}</p>
          <p>{pig.description}</p>
        </div>
      ) : null}
    </div>
  );
};

export default PigCard;
