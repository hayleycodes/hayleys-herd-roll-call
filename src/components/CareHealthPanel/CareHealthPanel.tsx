import { useState } from 'react';
import { differenceInDays, formatDistanceToNow } from 'date-fns';
import './CareHealthPanel.css';
import Panel from '../ui/Panel/Panel';
import Button from '../ui/Button/Button';
import EmojiButton from '../ui/EmojiButton/EmojiButton';
import CareTaskCard from '../CareTaskCard/CareTaskCard';
import HealthForm from '../HealthForm/HealthForm';
import { getPigHealth, deletePigHealth, createPigHealth } from '../../services/pig-health.service';
import {
  createPigCareTask,
  createOneOffTask,
  completeOneOffTask,
  markTaskDone,
} from '../../services/recurring-tasks.service';
import type {
  Pig,
  HealthRecord,
  PigRecurringTask,
} from '../../services/pigs.types';

interface Props {
  pig: Pig;
  health: HealthRecord[];
  setHealth: (h: HealthRecord[]) => void;
  sick?: boolean;
  recurringTasks?: PigRecurringTask[];
  onRecurringUpdate?: () => void;
}

const CARE_DEFAULTS = [
  { taskType: 'nail_clip', label: 'Nail clip', frequencyDays: 28 },
  { taskType: 'haircut', label: 'Haircut', frequencyDays: 56 },
  { taskType: 'foot_spur', label: 'Foot spur', frequencyDays: 56 },
];

const CARE_LABEL_MAP = new Map(CARE_DEFAULTS.map((d) => [d.taskType, d.label]));

const getTaskLabel = (taskType: string): string =>
  CARE_LABEL_MAP.get(taskType) ?? taskType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const KNOWN_HEALTH_FLAGS: Record<string, keyof Pick<HealthRecord, 'nail_clip' | 'haircut' | 'parasite_treatment'>> = {
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
}: Props) => {
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDefault, setSelectedDefault] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [addFrequency, setAddFrequency] = useState(28);

  const handleRecordAdded = async () => {
    const updated = await getPigHealth(pig.id);
    setHealth(updated);
    onRecurringUpdate?.();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this health record?')) return;
    await deletePigHealth(id);
    const updated = await getPigHealth(pig.id);
    setHealth(updated);
  };

  const handleMarkCareDone = async (task: PigRecurringTask) => {
    const isOneOff = task.frequency_days_override === null;
    const healthFlag = KNOWN_HEALTH_FLAGS[task.task_type];
    if (healthFlag) {
      await createPigHealth({
        pig_id: pig.id,
        [healthFlag]: true,
      } as unknown as HealthRecord);
    } else {
      await createPigHealth({
        pig_id: pig.id,
        notes: getTaskLabel(task.task_type),
      } as unknown as HealthRecord);
      if (!isOneOff) await markTaskDone(pig.id, task.task_type);
    }
    if (isOneOff) await completeOneOffTask(task.id);
    const updated = await getPigHealth(pig.id);
    setHealth(updated);
    onRecurringUpdate?.();
  };

  const scheduledTasks = recurringTasks.filter((t) => t.frequency_days_override !== null);
  const oneOffTasks = recurringTasks.filter((t) => t.frequency_days_override === null);

  const existingTypes = new Set(scheduledTasks.map((t) => t.task_type));
  const availableDefaults = CARE_DEFAULTS.filter((d) => !existingTypes.has(d.taskType));

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
    <Panel heading="Health & Care 🏥" theme={sick ? 'custom' : 'green'} color={sick ? '#e8a317' : undefined}>
      {/* Care Schedule Section */}
      {!pig.passed_away && (
        <div className="careScheduleSection">
          <h3 className="careSectionHeading">Care Schedule</h3>
          {(scheduledTasks.length > 0 || oneOffTasks.length > 0) && (
            <div className="careTaskList">
              {scheduledTasks.map((task) => {
                const daysSince = task.last_completed_at
                  ? differenceInDays(new Date(), new Date(task.last_completed_at))
                  : null;
                const overdue = daysSince !== null
                  ? daysSince >= task.frequency_days_override!
                  : true;
                const badgeText = overdue
                  ? (daysSince !== null ? `${daysSince - task.frequency_days_override!}d overdue` : 'Due now')
                  : `${task.frequency_days_override! - (daysSince ?? 0)}d left`;

                return (
                  <CareTaskCard
                    key={task.id}
                    label={getTaskLabel(task.task_type)}
                    meta={`${task.last_completed_at ? formatTimeSince(task.last_completed_at) : 'Never done'} · every ${task.frequency_days_override}d`}
                    variant={overdue ? 'overdue' : 'default'}
                    badge={
                      <span className={overdue ? 'careOverdueBadge' : 'careDueBadge'}>
                        {badgeText}
                      </span>
                    }
                    onDone={() => handleMarkCareDone(task)}
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
                />
              ))}
            </div>
          )}

          {!showAddForm ? (
            <div className="careAddToggle">
              <Button onClick={() => setShowAddForm(true)}>+ Add care task</Button>
            </div>
          ) : (
            <div className="careAddForm">
              <select
                value={selectedDefault}
                onChange={(e) => {
                  setSelectedDefault(e.target.value);
                  const def = CARE_DEFAULTS.find((d) => d.taskType === e.target.value);
                  if (def) setAddFrequency(def.frequencyDays);
                }}
                className="careSelect"
              >
                <option value="">Select task...</option>
                {availableDefaults.map((d) => (
                  <option key={d.taskType} value={d.taskType}>{d.label}</option>
                ))}
                <option value="__custom">Custom recurring...</option>
                <option value="__oneoff">One-off task...</option>
              </select>
              {(selectedDefault === '__custom' || selectedDefault === '__oneoff') && (
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
                    onChange={(e) => setAddFrequency(parseInt(e.target.value, 10) || 1)}
                    className="careFreqInput"
                  />
                  days
                </label>
              )}
              <div className="careAddActions">
                <Button
                  onClick={handleAddTask}
                  disabled={!selectedDefault || ((selectedDefault === '__custom' || selectedDefault === '__oneoff') && !customLabel.trim())}
                >
                  Add
                </Button>
                <Button onClick={() => { setShowAddForm(false); setSelectedDefault(''); setCustomLabel(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Health Records Section */}
      <div className="careRecordsSection">
        <h3 className="careSectionHeading">Health Log</h3>

        {!pig.passed_away && (
          <HealthForm
            pigId={pig.id}
            onRecordAdded={handleRecordAdded}
            editingRecord={editingRecord}
            onCancelEdit={() => setEditingRecord(null)}
          />
        )}

        {health.length === 0 ? (
          <p className="muted">No health records yet</p>
        ) : (
          <div className="healthCardList">
            {health.map((record) => (
              <div key={record.id} className={`healthCard ${editingRecord?.id === record.id ? 'healthCardEditing' : ''}`}>
                <div className="healthCardHeader">
                  {!record.passed_away && (
                    <span className="muted">
                      {formatDistanceToNow(new Date(record.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  )}

                  <div className="healthCardIcons">
                    {record.nail_clip && <p className="healthBadge">💅 Nail clip</p>}
                    {record.haircut && <p className="healthBadge">✂️ Haircut</p>}
                    {record.parasite_treatment && <p className="healthBadge">🐛 Parasite treatment</p>}
                  </div>
                </div>

                <div>
                  {record.passed_away ? (
                    <p>💀 {new Date(record.passed_away).toLocaleDateString()}</p>
                  ) : (
                    record.notes && <p>{record.notes}</p>
                  )}
                </div>

                {!record.passed_away && (
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
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
};

export default CareHealthPanel;
