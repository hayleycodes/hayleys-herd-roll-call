import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './WeightsPage.css';
import { getAllPigs } from '../../services/pigs.service';
import { getLatestWeights, createPigWeight } from '../../services/pig-weights.service';
import { getPigImageUrl } from '../../services/pig-images.service';
import type { Pig, WeightRecord } from '../../services/pigs.types';
import Loading from '../../components/ui/Loading/Loading';
import Panel from '../../components/ui/Panel/Panel';

const PigThumbnail = ({ imagePath }: { imagePath: string | null }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePath) return;
    getPigImageUrl(imagePath).then(({ signedUrl }) => setUrl(signedUrl));
  }, [imagePath]);

  if (!url)
    return <div className="weightThumb weightThumbPlaceholder">🐹</div>;
  return (
    <div
      className="weightThumb"
      style={{ backgroundImage: `url(${url})` }}
    />
  );
};

const WeightsPage = () => {
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [weights, setWeights] = useState<Map<number, WeightRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingPigId, setAddingPigId] = useState<number | null>(null);
  const [gramsInput, setGramsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refreshWeights = async () => {
    const weightData = await getLatestWeights();
    const weightMap = new Map<number, WeightRecord>();
    for (const w of weightData) {
      weightMap.set(w.pig_id, w);
    }
    setWeights(weightMap);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [pigData, weightData] = await Promise.all([
          getAllPigs(),
          getLatestWeights(),
        ]);

        const living = pigData
          .filter((p) => !p.passed_away)
          .sort((a, b) => a.name.localeCompare(b.name));
        setPigs(living);

        const weightMap = new Map<number, WeightRecord>();
        for (const w of weightData) {
          weightMap.set(w.pig_id, w);
        }
        setWeights(weightMap);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAdd = async (pigId: number) => {
    const value = Number(gramsInput);
    if (!value || value <= 0) return;

    setSubmitting(true);
    try {
      await createPigWeight(pigId, value);
      await refreshWeights();
      setAddingPigId(null);
      setGramsInput('');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <p>{error}</p>;

  return (
    <div className="weightsPage">
      <Panel heading="Weights ⚖️" theme="green">
        <div className="weightsList">
          {pigs.map((pig) => {
            const record = weights.get(pig.id);
            const isAdding = addingPigId === pig.id;
            return (
              <div key={pig.id} className="weightsCardWrapper">
                <div className="weightsCard">
                  <Link to={`/pigs/${pig.id}`} className="weightsCardLink">
                    <PigThumbnail imagePath={pig.image_path} />
                    <div className="weightsCardInfo">
                      <span className="weightsName">{pig.name}</span>
                      <span className={`weightsValue ${!record ? 'muted' : ''}`}>
                        {record ? `${record.weight_grams}g` : 'No weight recorded'}
                      </span>
                    </div>
                  </Link>
                  <button
                    className="weightsAddBtn"
                    onClick={() => {
                      setAddingPigId(isAdding ? null : pig.id);
                      setGramsInput('');
                    }}
                  >
                    {isAdding ? '✕' : '+'}
                  </button>
                </div>
                {isAdding && (
                  <form
                    className="weightsInlineForm"
                    onSubmit={(e) => { e.preventDefault(); handleAdd(pig.id); }}
                  >
                    <input
                      type="number"
                      placeholder="Grams"
                      value={gramsInput}
                      onChange={(e) => setGramsInput(e.target.value)}
                      min="1"
                      autoFocus
                    />
                    <button className="btn-outline" type="submit" disabled={submitting || !gramsInput}>
                      {submitting ? 'Saving...' : 'Save'}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
};

export default WeightsPage;
