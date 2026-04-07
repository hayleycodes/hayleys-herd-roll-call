import { useEffect, useState } from "react";

import "./HomePage.css";
import PigList from "../../components/PigList/PigList";
import { getAllPigs, getPassedPigs } from "../../services/pigs.service";
import type { Pig } from "../../services/pigs.types";

const HomePage = () => {
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [passedPigs, setPassedPigs] = useState<Pig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPigs = async () => {
    try {
      setLoading(true);
      let data = await getAllPigs();
      setPigs(data);

      data = await getPassedPigs();
      setPassedPigs(data);
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
      <PigList pigs={pigs} passedPigs={passedPigs} setPigs={setPigs} />{" "}
    </div>
  );
};

export default HomePage;
