import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

import "./PigPage.css";

import HealthPanel from "../../components/HealthPanel/HealthPanel";
import FamilyPanel from "../../components/FamilyPanel/FamilyPanel";
import Loading from "../../components/ui/Loading/Loading";
import Modal from "../../components/ui/Modal/Modal";

import { getPigHealth } from "../../services/pig-health.service";
import {
  compressImage,
  uploadPigImage,
  getPigImageUrl,
} from "../../services/pig-images.service";

import {
  savePigImage,
  getPig,
  updateDescription,
  createPigSighting,
} from "../../services/pigs.service";

import { getPigFamily } from "../../services/pig-relationships.service";

import type { Pig } from "../../services/pigs.types";

const PigPage = () => {
  const { id } = useParams();

  const [pig, setPig] = useState<Pig | null>(null);
  const [imageUrl, setPigImageUrl] = useState<string | null>(null);

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");

  const [health, setHealth] = useState<any[]>([]);

  const [family, setFamily] = useState<{
    parents: Pig[];
    children: Pig[];
    siblings: Pig[];
    fosterFamily: Pig[];
  }>({
    parents: [],
    children: [],
    siblings: [],
    fosterFamily: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPig, setSelectedPig] = useState<Pig | null>(null);
  const [updating, setUpdating] = useState(false);

  const handleConfirm = async () => {
    if (!selectedPig) return;

    try {
      setUpdating(true);

      await createPigSighting(selectedPig.id);

      const now = new Date().toISOString();

      setPig((prev) => (prev ? { ...prev, last_sighted: now } : null));

      setSelectedPig(null);
    } catch (err) {
      console.error("Failed to save sighting:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpload = async (file: File, pigId: number) => {
    const compressed = await compressImage(file);

    const filePath = await uploadPigImage(compressed, pigId);

    await savePigImage(pigId, filePath);

    setPig((prev) => (prev ? { ...prev, image_path: filePath } : prev));

    const { signedUrl } = await getPigImageUrl(filePath);
    setPigImageUrl(signedUrl);
  };

  const handleSaveDescription = async () => {
    if (!pig) return;

    try {
      const updated = await updateDescription(pig.id, descriptionDraft);
      setPig(updated);
      setIsEditingDescription(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) throw new Error("Missing pig id");

        const pigId = Number(id);
        if (isNaN(pigId)) throw new Error("Invalid pig id");

        const [pigData, healthData, familyData] = await Promise.all([
          getPig(pigId),
          getPigHealth(pigId),
          getPigFamily(pigId),
        ]);

        setPig(pigData);
        setHealth(healthData);
        setFamily(familyData);

        if (pigData?.image_path) {
          const { signedUrl } = await getPigImageUrl(pigData.image_path);
          setPigImageUrl(signedUrl);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) return <Loading />;
  if (error) return <div className="pigCardDetail error">{error}</div>;
  if (!pig) return <div className="pigCardDetail">Pig not found 🐷</div>;

  return (
    <div className={`pigPage ${pig.passed_away && "memorialMode"}`}>
      <div
        className="pigCardDetail detailPanel"
        style={{
          backgroundImage: imageUrl
            ? `linear-gradient(
                to right,
                rgba(255,255,255,1) 0%,
                rgba(255,255,255,0.9) 35%,
                rgba(255,255,255,0.6) 55%,
                rgba(255,255,255,0.2) 75%,
                rgba(255,255,255,0)
              ), url(${imageUrl})`
            : undefined,
        }}
      >
        {!pig.passed_away && (
          <button className="eyeButton" onClick={() => setSelectedPig(pig)}>
            👀
          </button>
        )}

        <h1 className="pigName">{pig.name}</h1>

        {pig.last_sighted && (
          <p>
            Last sighted:{" "}
            {formatDistanceToNow(new Date(pig.last_sighted), {
              addSuffix: true,
            })}
          </p>
        )}

        <div className="pigDescription">
          {!isEditingDescription ? (
            <p>{pig.description ?? "No description yet 🐷"}</p>
          ) : (
            <div>
              <textarea
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                rows={3}
              />
              <button className="btn-outline" onClick={handleSaveDescription}>Save</button>
              <button className="btn-outline" onClick={() => setIsEditingDescription(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="pigMeta">
          {pig.created_at && (
            <span>Added: {new Date(pig.created_at).toLocaleDateString()}</span>
          )}
          {pig.dob && (
            <span>Date of Birth: {new Date(pig.dob).toLocaleDateString()}</span>
          )}
        </div>

        <div className="editButtons">
          <button
            onClick={() => {
              setDescriptionDraft(pig.description ?? "");
              setIsEditingDescription(true);
            }}
            className="pigDescriptionEditButton"
            aria-label="Edit description"
          >
            ✏️
          </button>
          <label htmlFor="pig-image-upload" className="pigImageUploadButton">
            📸
          </label>
        </div>

        <input
          id="pig-image-upload"
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file && pig) {
              await handleUpload(file, pig.id);
            }
          }}
        />
      </div>

      <HealthPanel pig={pig} health={health} setHealth={setHealth} />

      <FamilyPanel family={family} />

      <Modal isOpen={!!selectedPig} onClose={() => setSelectedPig(null)}>
        <p>Mark {pig.name} as seen?</p>

        <button onClick={() => setSelectedPig(null)}>Cancel</button>
        <button onClick={handleConfirm} disabled={updating}>
          {updating ? "Saving..." : "Confirm"}
        </button>
      </Modal>
    </div>
  );
};

export default PigPage;
