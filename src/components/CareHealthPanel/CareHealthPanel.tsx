import { useState } from 'react';
import { differenceInDays } from 'date-fns';
import './CareHealthPanel.css';
import Panel from '../ui/Panel/Panel';
import Button from '../ui/Button/Button';
import Dialog from '../ui/Dialog/Dialog';
import CareTaskCard from '../CareTaskCard/CareTaskCard';
import HealthCardList from '../HealthCardList/HealthCardList';
import {
  getPigHealth,
  createPigHealth,
} from '../../services/pig-health.service';
import { createPigWeight } from '../../services/pig-weights.service';
import {
  createPigCareTask,
  createOneOffTask,
  completeOneOffTask,
  deletePigCareTask,
  markTaskDone,
} from '../../services/recurring-tasks.service';
import type {
  Pig,
  HealthRecord,
  WeightRecord,
  PigRecurringTask,
} from '../../services/pigs.types';

interface Props {
  pig: Pig;
  health: HealthRecord[];
  setHealth: (h: HealthRecord[]) => void;
  sick?: boolean;
  recurringTasks?: PigRecurringTask[];
  onRecurringUpdate?: () => void;
  latestWeight?: WeightRecord | null;
  onWeightAdded?: () => void;
}

const CARE_DEFAULTS = [
  { taskType: 'nail_clip', label: 'Nail clip', frequencyDays: 28 },
  { taskType: 'haircut', label: 'Haircut', frequencyDays: 56 },
  { taskType: 'foot_spur', label: 'Foot spur', frequencyDays: 56 },
];

const CARE_LABEL_MAP = new Map(CARE_DEFAULTS.map((d) => [d.taskType, d.label]));

const getTaskLabel = (taskType: string): string =>
  CARE_LABEL_MAP.get(taskType) ??
  taskType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const KNOWN_HEALTH_FLAGS: Record<
  string,
  keyof Pick<HealthRecord, 'nail_clip' | 'haircut' | 'parasite_treatment'>
> = {
  nail_clip: 'nail_clip',
  haircut: 'haircut',
  parasite_treatment: 'parasite_treatment',
};

const formatTimeSince = (date: string): string => {
  const days = differenceInDays(new Date(), new Date(date));
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
};

const CareHealthPanel = ({
  pig,
  health,
  setHealth,
  sick,
  recurringTasks = [],
  onRecurringUpdate,
  latestWeight,
  onWeightAdded,
}: Props) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDefault, setSelectedDefault] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [addFrequency, setAddFrequency] = useState(28);
  const [weightInput, setWeightInput] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [confirmSkipTask, setConfirmSkipTask] =
    useState<PigRecurringTask | null>(null);
  const [confirmCancelTask, setConfirmCancelTask] =
    useState<PigRecurringTask | null>(null);

  const handleAddWeight = async () => {
    const grams = parseInt(weightInput, 10);
    if (!grams || grams <= 0) return;
    setSavingWeight(true);
    try {
      await createPigWeight(pig.id, grams);
      setWeightInput('');
      onWeightAdded?.();
    } finally {
      setSavingWeight(false);
    }
  };

  const handleMarkCareDone = async (task: PigRecurringTask) => {
    const isOneOff = task.frequency_days_override === null;

    const healthFlag = KNOWN_HEALTH_FLAGS[task.task_type];
    if (healthFlag) {
      await createPigHealth({
        pig_id: pig.id,
        [healthFlag]: true,
      });
    } else {
      await createPigHealth({
        pig_id: pig.id,
        notes: getTaskLabel(task.task_type),
      });
      if (!isOneOff) await markTaskDone(pig.id, task.task_type);
    }
    if (isOneOff) await completeOneOffTask(task.id);
    const updated = await getPigHealth(pig.id);
    setHealth(updated);
    onRecurringUpdate?.();
  };

  const handleConfirmSkip = async () => {
    if (!confirmSkipTask) return;
    await markTaskDone(pig.id, confirmSkipTask.task_type);
    setConfirmSkipTask(null);
    onRecurringUpdate?.();
  };

  const handleConfirmCancel = async () => {
    if (!confirmCancelTask) return;
    if (confirmCancelTask.frequency_days_override === null) {
      await completeOneOffTask(confirmCancelTask.id);
    } else {
      await deletePigCareTask(pig.id, confirmCancelTask.task_type);
    }
    setConfirmCancelTask(null);
    onRecurringUpdate?.();
  };

  const scheduledTasks = recurringTasks.filter(
    (t) => t.frequency_days_override !== null
  );
  const oneOffTasks = recurringTasks.filter(
    (t) => t.frequency_days_override === null
  );

  const existingTypes = new Set(scheduledTasks.map((t) => t.task_type));
  const availableDefaults = CARE_DEFAULTS.filter(
    (d) => !existingTypes.has(d.taskType)
  );

  const handleAddTask = async () => {
    if (selectedDefault === '__oneoff') {
      const label = customLabel.trim();
      if (!label) return;
      const taskType = label.toLowerCase().replace(/\s+/g, '_');
      await createOneOffTask(pig.id, taskType);
    } else if (selectedDefault === '__custom') {
      const label = customLabel.trim();
      if (!label || addFrequency < 1) return;
      const taskType = label.toLowerCase().replace(/\s+/g, '_');
      await createPigCareTask(pig.id, taskType, addFrequency);
    } else {
      const def = CARE_DEFAULTS.find((d) => d.taskType === selectedDefault);
      if (!def) return;
      await createPigCareTask(pig.id, def.taskType, addFrequency);
    }

    setSelectedDefault('');
    setCustomLabel('');
    setAddFrequency(28);
    setShowAddForm(false);
    onRecurringUpdate?.();
  };

  return (
    <Panel
      heading="Health & Care 🏥"
      theme={sick ? 'custom' : 'green'}
      color={sick ? '#e8a317' : undefined}
    >
      {/* Care Schedule Section */}
      {!pig.passed_away && (
        <div className="careScheduleSection">
          <h3 className="careSectionHeading">Care Schedule</h3>
          {(scheduledTasks.length > 0 || oneOffTasks.length > 0) && (
            <div className="careTaskList">
              {scheduledTasks.map((task) => {
                const daysSince = task.last_completed_at
                  ? differenceInDays(
                      new Date(),
                      new Date(task.last_completed_at)
                    )
                  : null;
                const overdue =
                  daysSince !== null
                    ? daysSince >= task.frequency_days_override!
                    : true;
                const badgeText = overdue
                  ? daysSince !== null
                    ? `${daysSince - task.frequency_days_override!}d overdue`
                    : 'Due now'
                  : `${task.frequency_days_override! - (daysSince ?? 0)}d left`;

                return (
                  <CareTaskCard
                    key={task.id}
                    label={getTaskLabel(task.task_type)}
                    meta={`${task.last_completed_at ? formatTimeSince(task.last_completed_at) : 'Never done'} · every ${task.frequency_days_override}d`}
                    variant={overdue ? 'overdue' : 'default'}
                    badge={
                      <span
                        className={
                          overdue ? 'careOverdueBadge' : 'careDueBadge'
                        }
                      >
                        {badgeText}
                      </span>
                    }
                    onSkip={() => setConfirmSkipTask(task)}
                    onDone={() => handleMarkCareDone(task)}
                    onCancel={() => setConfirmCancelTask(task)}
                  />
                );
              })}
              {oneOffTasks.map((task) => (
                <CareTaskCard
                  key={task.id}
                  label={getTaskLabel(task.task_type)}
                  meta="One-off"
                  variant="oneoff"
                  onDone={() => handleMarkCareDone(task)}
                  onCancel={() => setConfirmCancelTask(task)}
                />
              ))}
            </div>
          )}

          {!showAddForm ? (
            <div className="careAddToggle">
              <Button variant="health" onClick={() => setShowAddForm(true)}>
                + Add care task
              </Button>
            </div>
          ) : (
            <div className="careAddForm">
              <select
                value={selectedDefault}
                onChange={(e) => {
                  setSelectedDefault(e.target.value);
                  const def = CARE_DEFAULTS.find(
                    (d) => d.taskType === e.target.value
                  );
                  if (def) setAddFrequency(def.frequencyDays);
                }}
                className="careSelect"
              >
                <option value="">Select task...</option>
                {availableDefaults.map((d) => (
                  <option key={d.taskType} value={d.taskType}>
                    {d.label}
                  </option>
                ))}
                <option value="__custom">Custom recurring...</option>
                <option value="__oneoff">One-off task...</option>
              </select>
              {(selectedDefault === '__custom' ||
                selectedDefault === '__oneoff') && (
                <input
                  type="text"
                  placeholder="Task name..."
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="careInput"
                />
              )}
              {selectedDefault && selectedDefault !== '__oneoff' && (
                <label className="careAddFreqLabel">
                  Overdue after
                  <input
                    type="number"
                    min="1"
                    value={addFrequency}
                    onChange={(e) =>
                      setAddFrequency(parseInt(e.target.value, 10) || 1)
                    }
                    className="careFreqInput"
                  />
                  days
                </label>
              )}
              <div className="careAddActions">
                <Button
                  variant="health"
                  onClick={handleAddTask}
                  disabled={
                    !selectedDefault ||
                    ((selectedDefault === '__custom' ||
                      selectedDefault === '__oneoff') &&
                      !customLabel.trim())
                  }
                >
                  Add
                </Button>
                <Button
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedDefault('');
                    setCustomLabel('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weight Section */}
      {!pig.passed_away && (
        <div className="careWeightSection">
          <h3 className="careSectionHeading">Weight ⚖️</h3>
          {latestWeight && (
            <p className="careWeightLatest">
              Latest: <strong>{latestWeight.weight_grams}g</strong>
              <span className="muted">
                {' '}
                — {formatTimeSince(latestWeight.recorded_at)}
              </span>
            </p>
          )}
          <div className="careWeightForm">
            <input
              type="number"
              placeholder="Weight in grams"
              min="1"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="careInput"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddWeight();
              }}
            />
            <Button
              variant="health"
              onClick={handleAddWeight}
              disabled={savingWeight || !weightInput}
            >
              {savingWeight ? 'Saving...' : 'Log weight'}
            </Button>
          </div>
        </div>
      )}

      {/* Health Records Section */}
      <div className="careRecordsSection">
        <h3 className="careSectionHeading">Health Log</h3>

        <HealthCardList
          pig={pig}
          health={health}
          setHealth={setHealth}
          onChange={onRecurringUpdate}
        />
      </div>

      <Dialog
        isOpen={!!confirmSkipTask}
        onClose={() => setConfirmSkipTask(null)}
        message={
          <>
            Skip {pig.name}'s{' '}
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
            Cancel {pig.name}'s{' '}
            {getTaskLabel(confirmCancelTask?.task_type ?? '').toLowerCase()}?
            This removes the task.
          </>
        }
        onConfirm={handleConfirmCancel}
        confirmLabel="Remove"
        cancelLabel="Keep"
        confirmVariant="danger"
      />
    </Panel>
  );
};

export default CareHealthPanel;
