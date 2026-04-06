import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  getPig,
  getPigChildren,
  getPigHealth,
  getPigParents,
  getPigSiblings,
  createPigHealth,
  type Pig,
  type HealthRecord,
} from "../../services/pigs.service";
import "./PigPage.css";
import PigCard from "../../components/PigList/PigCard/PigCard";
import HealthPanel from "../../components/HealthPanel/HealthPanel";
import FamilyPanel from "../../components/FamilyPanel/FamilyPanel";

const PigPage = () => {
  const { id } = useParams();

  const [pig, setPig] = useState<Pig | null>(null);
  const [health, setHealth] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [siblings, setSiblings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [nailClip, setNailClip] = useState(false);
  const [haircut, setHaircut] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) throw new Error("Missing pig id in route");

        const pigId = Number(id);
        if (isNaN(pigId)) throw new Error("Invalid pig id");

        const [pigData, healthData, parentsData, childrenData, siblingsData] =
          await Promise.all([
            getPig(pigId),
            getPigHealth(pigId),
            getPigParents(pigId),
            getPigChildren(pigId),
            getPigSiblings(pigId),
          ]);

        setPig(pigData);
        setHealth(healthData);
        setParents(parentsData);
        setChildren(childrenData);
        setSiblings(siblingsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleAddHealth = async () => {
    if (!pig) return;

    try {
      setSubmitting(true);

      await createPigHealth({
        pig_id: pig.id,
        notes,
        nail_clip: nailClip,
        haircut,
      } as any);

      // refresh health list
      const updatedHealth = await getPigHealth(pig.id);
      setHealth(updatedHealth);

      // reset form
      setNotes("");
      setNailClip(false);
      setHaircut(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="pigPage">
        <div className="pigCardDetail">Loading pig... 🐷</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pigPage">
        <div className="pigCardDetail error">Error: {error}</div>
      </div>
    );
  }

  if (!pig) {
    return (
      <div className="pigPage">
        <div className="pigCardDetail">Pig not found 🐽</div>
      </div>
    );
  }

  return (
    <div className="pigPage">
      <div className="pigCardDetail">
        <h1 className="pigName">{pig.name}</h1>

        {pig.last_sighted && (
          <p>
            Last sighted:{" "}
            {formatDistanceToNow(new Date(pig.last_sighted), {
              addSuffix: true,
            })}
          </p>
        )}

        <p className="pigDescription">
          {pig.description ?? "No description yet 🐷"}
        </p>

        <div className="pigMeta">
          {pig.created_at && (
            <span>Added: {new Date(pig.created_at).toLocaleDateString()}</span>
          )}
          {pig.dob && (
            <span>Date of Birth: {new Date(pig.dob).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      <HealthPanel pig={pig} health={health} setHealth={setHealth} />

      <FamilyPanel parents={parents} children={children} siblings={siblings} />
    </div>
  );
};

export default PigPage;
