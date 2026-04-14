import { useState } from 'react';
import './TasksPanel.css';
import Panel from '../ui/Panel/Panel';
import Modal from '../ui/Modal/Modal';
import { toggleTaskComplete, createTask, getTasksForPig } from '../../services/tasks.service';
import type { Task } from '../../services/pigs.types';

type Props = {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  pigId: number;
};

const TasksPanel = ({ tasks, setTasks, pigId }: Props) => {
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [updating, setUpdating] = useState(false);
  const [title, setTitle] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createTask(title.trim(), pigId);
      const updated = await getTasksForPig(pigId);
      setTasks(updated);
      setTitle('');
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleConfirm = async () => {
    if (!taskToComplete) return;
    setUpdating(true);
    try {
      await toggleTaskComplete(taskToComplete.id, true);
      setTasks(tasks.filter((t) => t.id !== taskToComplete.id));
    } catch (err) {
      console.error('Failed to complete task:', err);
    } finally {
      setUpdating(false);
      setTaskToComplete(null);
    }
  };

  return (
    <Panel heading="Tasks 📝" theme="purple">
      {tasks.length === 0 ? (
        <p className="tasksPanelEmpty">No tasks 🎉</p>
      ) : (
        tasks.map((task) => (
          <div
            key={task.id}
            className="tasksPanelItem"
          >
            <label className="tasksPanelLabel">
              <input
                type="checkbox"
                onChange={() => setTaskToComplete(task)}
              />
              <span>{task.title}</span>
            </label>
          </div>
        ))
      )}

      <form className="tasksPanelForm" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Add a task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="tasksPanelInput"
        />
        <button
          type="submit"
          className="btn-outline tasksPanelAddButton"
          disabled={!title.trim()}
        >
          Add
        </button>
      </form>

      <Modal isOpen={!!taskToComplete} onClose={() => setTaskToComplete(null)}>
        <p>Mark "{taskToComplete?.title}" as done?</p>
        <div className="confirmActions">
          <button onClick={() => setTaskToComplete(null)}>Cancel</button>
          <button onClick={handleConfirm} disabled={updating}>
            {updating ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </Modal>
    </Panel>
  );
};

export default TasksPanel;
