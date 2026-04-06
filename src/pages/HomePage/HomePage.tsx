import { useEffect, useState } from "react";
import { getAllPigs, type Pig } from "../../services/pigs.service";
import "./HomePage.css";
import PigList from "../../components/PigList/PigList";

const HomePage = () => {
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPigs = async () => {
    try {
      setLoading(true);

      const data = await getAllPigs();
      setPigs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPigs();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <PigList pigs={pigs} setPigs={setPigs} />{" "}
    </div>
  );
};

export default HomePage;
