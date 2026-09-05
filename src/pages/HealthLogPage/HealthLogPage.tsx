import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import './HealthLogPage.css';
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
  deletePigCareTask,
  markTaskDone,
  type OverdueTask,
  type UpcomingTask,
  type PendingOneOff,
} from '../../services/recurring-tasks.service';
import { getAllPigs } from '../../services/pigs.service';
import type {
  Pig,
  WeightRecord,
  HealthRecord,
} from '../../services/pigs.types';
import {
  getLatestWeights,
  getAllWeights,
} from '../../services/pig-weights.service';
import Loading from '../../components/ui/Loading/Loading';
import Dialog from '../../components/ui/Dialog/Dialog';
import Panel from '../../components/ui/Panel/Panel';
import HealthForm from '../../components/HealthForm/HealthForm';
import CareTaskCard from '../../components/CareTaskCard/CareTaskCard';
import PigThumb from '../../components/ui/PigThumb/PigThumb';
import WeightList from '../../components/WeightList/WeightList';
import EmojiButton from '../../components/ui/EmojiButton/EmojiButton';
import { getErrorMessage } from '../../lib/get-error-message';

const PAGE_SIZE = 10;

const HealthLogPage = () => {
  const location = useLocation();
  const initialTab =
    (location.state as { tab?: string })?.tab === 'care'
      ? 'care'
      : (location.state as { tab?: string })?.tab === 'weight'
        ? 'weight'
        : 'notes';
  const [records, setRecords] = useState<HealthLogEntry[]>([]);
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<HealthLogEntry | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<'notes' | 'weight' | 'care'>(
    initialTab
  );
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [oneOffTasks, setOneOffTasks] = useState<PendingOneOff[]>([]);
  const [weights, setWeights] = useState<Map<number, WeightRecord>>(new Map());
  const [allWeights, setAllWeights] = useState<Map<number, WeightRecord[]>>(
    new Map()
  );
  const [confirmTask, setConfirmTask] = useState<
    (OverdueTask | UpcomingTask | PendingOneOff) | null
  >(null);
  const [confirmSkipTask, setConfirmSkipTask] = useState<
    OverdueTask | UpcomingTask | null
  >(null);
  const [confirmCancelTask, setConfirmCancelTask] = useState<
    (OverdueTask | UpcomingTask | PendingOneOff) | null
  >(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Refs mirror the current paging state so the IntersectionObserver
  // (created once) reads live values instead of a stale closure.
  const recordCountRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  recordCountRef.current = records.length;
  hasMoreRef.current = hasMore;
  loadingMoreRef.current = loadingMore;

  const loadRecords = useCallback(async (offset: number) => {
    const data = await getAllHealth(offset, PAGE_SIZE);
    if (data.length < PAGE_SIZE) setHasMore(false);
    return data;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [healthData, pigData, weightData, allWeightData, careData] =
          await Promise.all([
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
      } catch (err) {
        setError(getErrorMessage(err));
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

  const KNOWN_HEALTH_FLAGS: Record<
    string,
    keyof Pick<HealthRecord, 'nail_clip' | 'haircut' | 'parasite_treatment'>
  > = {
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
      });
    } else {
      await createPigHealth({
        pig_id: task.pig_id,
        notes: getTaskLabel(task.task_type),
      });
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

  const handleConfirmSkip = async () => {
    if (!confirmSkipTask) return;
    await markTaskDone(confirmSkipTask.pig_id, confirmSkipTask.task_type);
    const careData = await getAllCareTasks();
    setOverdueTasks(careData.overdue);
    setUpcomingTasks(careData.upcoming);
    setOneOffTasks(careData.oneOffs);
    setConfirmSkipTask(null);
  };

  const handleConfirmCancel = async () => {
    if (!confirmCancelTask) return;
    if (confirmCancelTask.frequency_days_override === null) {
      await completeOneOffTask(confirmCancelTask.id);
    } else {
      await deletePigCareTask(
        confirmCancelTask.pig_id,
        confirmCancelTask.task_type
      );
    }
    const careData = await getAllCareTasks();
    setOverdueTasks(careData.overdue);
    setUpcomingTasks(careData.upcoming);
    setOneOffTasks(careData.oneOffs);
    setConfirmCancelTask(null);
  };

  const livingPigs = pigs.filter((p) => !p.passed_away);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRef.current &&
          !loadingMoreRef.current
        ) {
          loadingMoreRef.current = true;
          setLoadingMore(true);
          loadRecords(recordCountRef.current)
            .then((data) => {
              setRecords((prev) => [...prev, ...data]);
            })
            .catch((err) => setError(getErrorMessage(err)))
            .finally(() => setLoadingMore(false));
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
    // Re-run once initial load finishes (and the sentinel mounts) and when the
    // active tab changes, since the sentinel only exists on the notes tab.
  }, [loadRecords, loading, activeTab]);

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
                      <PigThumb
                        imagePath={record.pigs?.image_paths?.[0] ?? null}
                        className="healthLogThumb"
                        placeholderClassName="healthLogThumbPlaceholder"
                      />

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
                            const weight = getWeightAtTime(
                              record.pig_id,
                              record.created_at
                            );
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
          <WeightList
            pigs={livingPigs}
            weights={weights}
            onWeightAdded={refreshWeights}
            thumbPlaceholderClassName="healthLogThumbPlaceholder"
          />
        )}

        {activeTab === 'care' && (
          <div className="careTaskList--global">
            {overdueTasks.length === 0 &&
              upcomingTasks.length === 0 &&
              oneOffTasks.length === 0 && (
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
                        {task.days_overdue > 0
                          ? `${task.days_overdue}d overdue`
                          : 'Due now'}
                      </span>
                    }
                    pigName={task.pigs?.name}
                    pigImagePath={task.pigs?.image_paths?.[0] ?? null}
                    pigId={task.pig_id}
                    onSkip={() => setConfirmSkipTask(task)}
                    onDone={() => setConfirmTask(task)}
                    onCancel={() => setConfirmCancelTask(task)}
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
                    pigImagePath={task.pigs?.image_paths?.[0] ?? null}
                    pigId={task.pig_id}
                    onDone={() => setConfirmTask(task)}
                    onCancel={() => setConfirmCancelTask(task)}
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
                    badge={
                      <span className="careDueBadge">
                        {task.days_left}d left
                      </span>
                    }
                    pigName={task.pigs?.name}
                    pigImagePath={task.pigs?.image_paths?.[0] ?? null}
                    pigId={task.pig_id}
                    onSkip={() => setConfirmSkipTask(task)}
                    onDone={() => setConfirmTask(task)}
                    onCancel={() => setConfirmCancelTask(task)}
                  />
                ))}
              </>
            )}

            <Dialog
              isOpen={!!confirmTask}
              onClose={() => setConfirmTask(null)}
              message={
                <>
                  Mark {confirmTask?.pigs?.name}'s{' '}
                  {getTaskLabel(confirmTask?.task_type ?? '').toLowerCase()} as
                  done?
                </>
              }
              onConfirm={handleConfirmDone}
              cancelVariant="danger"
              confirmVariant="success"
            />

            <Dialog
              isOpen={!!confirmSkipTask}
              onClose={() => setConfirmSkipTask(null)}
              message={
                <>
                  Skip {confirmSkipTask?.pigs?.name}'s{' '}
                  {getTaskLabel(confirmSkipTask?.task_type ?? '').toLowerCase()}?
                </>
              }
              onConfirm={handleConfirmSkip}
              cancelVariant="danger"
              confirmVariant="success"
            />

            <Dialog
              isOpen={!!confirmCancelTask}
              onClose={() => setConfirmCancelTask(null)}
              message={
                <>
                  Cancel {confirmCancelTask?.pigs?.name}'s{' '}
                  {getTaskLabel(
                    confirmCancelTask?.task_type ?? ''
                  ).toLowerCase()}
                  ? This removes the task.
                </>
              }
              onConfirm={handleConfirmCancel}
              confirmLabel="Remove"
              cancelLabel="Keep"
              confirmVariant="danger"
            />
          </div>
        )}
      </Panel>

      <Dialog
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        message="Delete this health record?"
        onConfirm={handleDelete}
        confirmLabel="Delete"
        cancelVariant="danger"
        confirmVariant="success"
      />
    </div>
  );
};

export default HealthLogPage;
