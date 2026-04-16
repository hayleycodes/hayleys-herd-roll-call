import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import './HealthLogPage.css';
import '../WeightsPage/WeightsPage.css';
import '../../components/HealthPanel/HealthPanel.css';
import {
  getAllHealth,
  deletePigHealth,
} from '../../services/pig-health.service';
import type { HealthLogEntry } from '../../services/pig-health.service';
import { getAllPigs } from '../../services/pigs.service';
import type { Pig, WeightRecord } from '../../services/pigs.types';
import { getPigImageUrl } from '../../services/pig-images.service';
import { getLatestWeights, getAllWeights, createPigWeight } from '../../services/pig-weights.service';
import Loading from '../../components/ui/Loading/Loading';
import Panel from '../../components/ui/Panel/Panel';
import HealthForm from '../../components/HealthForm/HealthForm';
import Button from '../../components/ui/Button/Button';
import EmojiButton from '../../components/ui/EmojiButton/EmojiButton';

const PAGE_SIZE = 10;

const PigThumbnail = ({ imagePath }: { imagePath: string | null }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePath) return;
    getPigImageUrl(imagePath).then(({ signedUrl }) => setUrl(signedUrl));
  }, [imagePath]);

  if (!url)
    return <div className="healthLogThumb healthLogThumbPlaceholder">🐹</div>;
  return (
    <div
      className="healthLogThumb"
      style={{ backgroundImage: `url(${url})` }}
    />
  );
};

const HealthLogPage = () => {
  const [records, setRecords] = useState<HealthLogEntry[]>([]);
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<HealthLogEntry | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<'notes' | 'weight'>('notes');
  const [weights, setWeights] = useState<Map<number, WeightRecord>>(new Map());
  const [allWeights, setAllWeights] = useState<Map<number, WeightRecord[]>>(new Map());
  const [addingPigId, setAddingPigId] = useState<number | null>(null);
  const [gramsInput, setGramsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadRecords = useCallback(async (offset: number) => {
    const data = await getAllHealth(offset, PAGE_SIZE);
    if (data.length < PAGE_SIZE) setHasMore(false);
    return data;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [healthData, pigData, weightData, allWeightData] = await Promise.all([
          loadRecords(0),
          getAllPigs(),
          getLatestWeights(),
          getAllWeights(),
        ]);
        setRecords(healthData);
        setPigs(pigData.sort((a, b) => a.name.localeCompare(b.name)));
        const weightMap = new Map<number, WeightRecord>();
        for (const w of weightData) {
          weightMap.set(w.pig_id, w);
        }
        setWeights(weightMap);
        const allWeightMap = new Map<number, WeightRecord[]>();
        for (const w of allWeightData) {
          const list = allWeightMap.get(w.pig_id) ?? [];
          list.push(w);
          allWeightMap.set(w.pig_id, list);
        }
        setAllWeights(allWeightMap);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loadRecords]);

  useEffect(() => {
    if (!loading && scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('.panelContent');
      if (scrollContainer) scrollContainer.scrollTop = 0;
    }
  }, [loading]);

  const handleRecordAdded = async () => {
    const data = await getAllHealth(0, records.length + 1);
    setRecords(data);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this health record?')) return;
    await deletePigHealth(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const refreshWeights = async () => {
    const weightData = await getLatestWeights();
    const weightMap = new Map<number, WeightRecord>();
    for (const w of weightData) {
      weightMap.set(w.pig_id, w);
    }
    setWeights(weightMap);
  };

  const handleAddWeight = async (pigId: number) => {
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

  const getWeightAtTime = (pigId: number, date: string): number | null => {
    const pigWeights = allWeights.get(pigId);
    if (!pigWeights || pigWeights.length === 0) return null;
    const recordTime = new Date(date).getTime();
    let closest: WeightRecord | null = null;
    let closestDiff = Infinity;
    for (const w of pigWeights) {
      const diff = Math.abs(new Date(w.recorded_at).getTime() - recordTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = w;
      }
    }
    return closest?.weight_grams ?? null;
  };

  const livingPigs = pigs.filter((p) => !p.passed_away);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          loadRecords(records.length)
            .then((data) => {
              setRecords((prev) => [...prev, ...data]);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoadingMore(false));
        }
      },
      { threshold: 0.1 }
    );

    useEffect(() => {});

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, records.length, loadRecords]);

  if (loading) return <Loading />;
  if (error) return <p>{error}</p>;

  return (
    <div className="healthLogPage" ref={scrollRef}>
      <Panel heading="Health Log 🏥" theme="green">
        <div className="tabs">
          <button
            className={activeTab === 'notes' ? 'active' : ''}
            onClick={() => setActiveTab('notes')}
          >
            Notes 📝
          </button>
          <button
            className={activeTab === 'weight' ? 'active' : ''}
            onClick={() => setActiveTab('weight')}
          >
            Weight ⚖️
          </button>
        </div>

        {activeTab === 'notes' && (
          <>
            <HealthForm
              pigs={pigs}
              onRecordAdded={handleRecordAdded}
              editingRecord={editingRecord}
              onCancelEdit={() => setEditingRecord(null)}
            />

            {records.length === 0 ? (
              <p className="muted">No health records yet</p>
            ) : (
              <div className="healthLogList">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className={`healthLogCard ${editingRecord?.id === record.id ? 'healthCardEditing' : ''}`}
                  >
                    <Link
                      to={`/pigs/${record.pig_id}`}
                      className="healthLogCardLink"
                    >
                      <PigThumbnail imagePath={record.pigs?.image_path ?? null} />

                      <div className="healthLogCardBody">
                        <div>
                          <span className="healthLogPigName">
                            {record.pigs?.name ?? 'Unknown pig'}
                          </span>
                          <span className="muted healthLogDate">
                            Recorded:{' '}
                            {formatDistanceToNow(new Date(record.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>

                        {record.notes && <p>{record.notes}</p>}
                        <div className="healthLogIcons">
                          {record.nail_clip && (
                            <span className="healthBadge">💅 Nail clip</span>
                          )}
                          {record.haircut && (
                            <span className="healthBadge">✂️ Haircut</span>
                          )}
                          {record.parasite_treatment && (
                            <span className="healthBadge">
                              🐛 Parasite treatment
                            </span>
                          )}
                          {(() => {
                            const weight = getWeightAtTime(record.pig_id, record.created_at);
                            return weight ? (
                              <span className="healthBadge">⚖️ {weight}g</span>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </Link>
                    <div className="healthCardActions">
                      <EmojiButton
                        className="healthCardBtn"
                        size="sm"
                        onClick={() => setEditingRecord(record)}
                      >
                        ✏️
                      </EmojiButton>
                      <EmojiButton
                        className="healthCardBtn healthCardBtnDelete"
                        size="sm"
                        onClick={() => handleDelete(record.id)}
                      >
                        🗑️
                      </EmojiButton>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hasMore && (
              <div ref={sentinelRef} className="healthLogSentinel">
                {loadingMore && <Loading />}
              </div>
            )}
          </>
        )}

        {activeTab === 'weight' && (
          <div className="weightsList">
            {livingPigs.map((pig) => {
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
                    <EmojiButton
                      className="weightsAddBtn"
                      size="sm"
                      shape="circle"
                      onClick={() => {
                        setAddingPigId(isAdding ? null : pig.id);
                        setGramsInput('');
                      }}
                    >
                      {isAdding ? '✕' : '+'}
                    </EmojiButton>
                  </div>
                  {isAdding && (
                    <form
                      className="weightsInlineForm"
                      onSubmit={(e) => { e.preventDefault(); handleAddWeight(pig.id); }}
                    >
                      <input
                        type="number"
                        placeholder="Grams"
                        value={gramsInput}
                        onChange={(e) => setGramsInput(e.target.value)}
                        min="1"
                        autoFocus
                      />
                      <Button type="submit" disabled={submitting || !gramsInput}>
                        {submitting ? 'Saving...' : 'Save'}
                      </Button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
};

export default HealthLogPage;
