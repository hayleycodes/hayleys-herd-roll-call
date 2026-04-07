import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

import "./PigPage.css";
import HealthPanel from "../../components/HealthPanel/HealthPanel";
import FamilyPanel from "../../components/FamilyPanel/FamilyPanel";
import { getPigHealth } from "../../services/pig-health.service";
import {
  compressImage,
  uploadPigImage,
  getPigImageUrl,
} from "../../services/pig-images.service";
import {
  getPigParents,
  getPigChildren,
  getPigSiblings,
} from "../../services/pig-relationships.service";
import { savePigImage, getPig } from "../../services/pigs.service";
import type { Pig } from "../../services/pigs.types";

const PigPage = () => {
  const { id } = useParams();

  const [pig, setPig] = useState<Pig | null>(null);
  const [imageUrl, setPigImageUrl] = useState<string | null>(null);

  const [health, setHealth] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [siblings, setSiblings] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File, pigId: number) => {
    const compressed = await compressImage(file);

    const filePath = await uploadPigImage(compressed, pigId);

    await savePigImage(pigId, filePath);

    setPig((prev) => (prev ? { ...prev, image_path: filePath } : prev));

    // generate new signed URL immediately
    const { signedUrl } = await getPigImageUrl(filePath);
    setPigImageUrl(signedUrl);
  };

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

        // generate signed URL for private image
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

  if (loading) return <div className="pigCardDetail">Loading pig... 🐷</div>;
  if (error) return <div className="pigCardDetail error">{error}</div>;
  if (!pig) return <div className="pigCardDetail">Pig not found 🐽</div>;

  return (
    <div className="pigPage">
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

        <label htmlFor="pig-image-upload" className="pigImageUploadButton">
          📸
        </label>

        <input
          id="pig-image-upload"
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || !pig) return;

            await handleUpload(file, pig.id);
          }}
        />
      </div>

      <HealthPanel pig={pig} health={health} setHealth={setHealth} />
      <FamilyPanel parents={parents} children={children} siblings={siblings} />
    </div>
  );
};

export default PigPage;
