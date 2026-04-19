import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import './HealthLogPage.css';
import '../WeightsPage/WeightsPage.css';
import '../../components/HealthPanel/HealthPanel.css';
import {
  getAllHealth,
  deletePigHealth,
  createPigHealth,
} from '../../services/pig-health.service';
import type { HealthLogEntry } from '../../services/pig-health.service';
import {
  getAllCareTasks,
  completeOneOffTask,
  markTaskDone,
  type OverdueTask,
  type UpcomingTask,
  type PendingOneOff,
} from '../../services/recurring-tasks.service';
import { getAllPigs } from '../../services/pigs.service';
import type { Pig, WeightRecord, HealthRecord } from '../../services/pigs.types';
import { getPigImageUrl } from '../../services/pig-images.service';
import { getLatestWeights, getAllWeights, createPigWeight } from '../../services/pig-weights.service';
import Loading from '../../components/ui/Loading/Loading';
import Modal from '../../components/ui/Modal/Modal';
import Panel from '../../components/ui/Panel/Panel';
import HealthForm from '../../components/HealthForm/HealthForm';
import CareTaskCard from '../../components/CareTaskCard/CareTaskCard';
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
  const [activeTab, setActiveTab] = useState<'notes' | 'weight' | 'care'>('notes');
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [oneOffTasks, setOneOffTasks] = useState<PendingOneOff[]>([]);
  const [weights, setWeights] = useState<Map<number, WeightRecord>>(new Map());
  const [allWeights, setAllWeights] = useState<Map<number, WeightRecord[]>>(new Map());
  const [addingPigId, setAddingPigId] = useState<number | null>(null);
  const [gramsInput, setGramsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmTask, setConfirmTask] = useState<(OverdueTask | UpcomingTask | PendingOneOff) | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
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
        const [healthData, pigData, weightData, allWeightData, careData] = await Promise.all([
          loadRecords(0),
          getAllPigs(),
          getLatestWeights(),
          getAllWeights(),
          getAllCareTasks(),
        ]);
        setRecords(healthData);
        setPigs(pigData.sort((a: Pig, b: Pig) => a.name.localeCompare(b.name)));
        setOverdueTasks(careData.overdue);
        setUpcomingTasks(careData.upcoming);
        setOneOffTasks(careData.oneOffs);
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

  const handleDelete = async () => {
    if (confirmDeleteId === null) return;
    await deletePigHealth(confirmDeleteId);
    setRecords((prev) => prev.filter((r) => r.id !== confirmDeleteId));
    setConfirmDeleteId(null);
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

  const KNOWN_HEALTH_FLAGS: Record<string, keyof Pick<HealthRecord, 'nail_clip' | 'haircut' | 'parasite_treatment'>> = {
    nail_clip: 'nail_clip',
    haircut: 'haircut',
    parasite_treatment: 'parasite_treatment',
  };

  const getTaskLabel = (taskType: string): string =>
    taskType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const handleConfirmDone = async () => {
    if (!confirmTask) return;
    const task = confirmTask;
    const isOneOff = task.frequency_days_override === null;

    const healthFlag = KNOWN_HEALTH_FLAGS[task.task_type];
    if (healthFlag) {
      await createPigHealth({
        pig_id: task.pig_id,
        [healthFlag]: true,
      } as unknown as HealthRecord);
    } else {
      await createPigHealth({
        pig_id: task.pig_id,
        notes: getTaskLabel(task.task_type),
      } as unknown as HealthRecord);
      if (!isOneOff) await markTaskDone(task.pig_id, task.task_type);
    }
    if (isOneOff) await completeOneOffTask(task.id);

    // Refresh care tasks
    const careData = await getAllCareTasks();
    setOverdueTasks(careData.overdue);
    setUpcomingTasks(careData.upcoming);
    setOneOffTasks(careData.oneOffs);
    setConfirmTask(null);
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

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, records.length, loadRecords]);

  if (loading) return <Loading />;
  if (error) return <p>{error}</p>;

  return (
    <div className="healthLogPage" ref={scrollRef}>
      <Panel heading="Health Information 🏥" theme="green">
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
          <button
            className={activeTab === 'care' ? 'active' : ''}
            onClick={() => setActiveTab('care')}
          >
            Care 📋
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
                        onClick={() => setConfirmDeleteId(record.id)}
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

        {activeTab === 'care' && (
          <div className="careTaskList--global">
            {overdueTasks.length === 0 && upcomingTasks.length === 0 && oneOffTasks.length === 0 && (
              <p className="careAllCaughtUp">All caught up! 🎉</p>
            )}

            {overdueTasks.length > 0 && (
              <>
                <h3>Overdue</h3>
                {overdueTasks.map((task) => (
                  <CareTaskCard
                    key={`care-${task.pig_id}-${task.task_type}`}
                    label={getTaskLabel(task.task_type)}
                    variant="overdue"
                    badge={
                      <span className="careOverdueBadge">
                        {task.days_overdue > 0 ? `${task.days_overdue}d overdue` : 'Due now'}
                      </span>
                    }
                    pigName={task.pigs?.name}
                    pigImagePath={task.pigs?.image_path}
                    pigId={task.pig_id}
                    onDone={() => setConfirmTask(task)}
                  />
                ))}
              </>
            )}

            {oneOffTasks.length > 0 && (
              <>
                <h3>One-off</h3>
                {oneOffTasks.map((task) => (
                  <CareTaskCard
                    key={task.id}
                    label={getTaskLabel(task.task_type)}
                    variant="oneoff"
                    pigName={task.pigs?.name}
                    pigImagePath={task.pigs?.image_path}
                    pigId={task.pig_id}
                    onDone={() => setConfirmTask(task)}
                  />
                ))}
              </>
            )}

            {upcomingTasks.length > 0 && (
              <>
                <h3>Upcoming</h3>
                {upcomingTasks.map((task) => (
                  <CareTaskCard
                    key={`upcoming-${task.pig_id}-${task.task_type}`}
                    label={getTaskLabel(task.task_type)}
                    badge={<span className="careDueBadge">{task.days_left}d left</span>}
                    pigName={task.pigs?.name}
                    pigImagePath={task.pigs?.image_path}
                    pigId={task.pig_id}
                    onDone={() => setConfirmTask(task)}
                  />
                ))}
              </>
            )}

            <Modal isOpen={!!confirmTask} onClose={() => setConfirmTask(null)}>
              <p>Mark {confirmTask?.pigs?.name}'s {getTaskLabel(confirmTask?.task_type ?? '').toLowerCase()} as done?</p>
              <div className="confirmActions">
                <button onClick={() => setConfirmTask(null)}>Cancel</button>
                <button onClick={handleConfirmDone}>Confirm</button>
              </div>
            </Modal>
          </div>
        )}
      </Panel>

      <Modal isOpen={confirmDeleteId !== null} onClose={() => setConfirmDeleteId(null)}>
        <p>Delete this health record?</p>
        <div className="confirmActions">
          <button onClick={() => setConfirmDeleteId(null)}>Cancel</button>
          <button onClick={handleDelete}>Delete</button>
        </div>
      </Modal>
    </div>
  );
};

export default HealthLogPage;
