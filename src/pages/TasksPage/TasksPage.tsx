import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import './TasksPage.css';
import Loading from '../../components/ui/Loading/Loading';
import Modal from '../../components/ui/Modal/Modal';
import PigPicker from '../../components/PigPicker/PigPicker';
import { getAllPigs } from '../../services/pigs.service';
import {
  getAllTasks,
  createTask,
  toggleTaskComplete,
  deleteTask,
  type TaskWithPig,
} from '../../services/tasks.service';
import { usePigImage } from '../../hooks/usePigImage';
import { PASTEL_BORDERS } from '../../constants/colors';
import type { Pig } from '../../services/pigs.types';

const TaskPigAvatar = ({
  imagePath,
  name,
}: {
  imagePath: string | null;
  name: string;
}) => {
  const { imageUrl, imageReady } = usePigImage(imagePath);
  return (
    <div className="taskPigAvatar">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          style={{
            opacity: imageReady ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      ) : (
        <span>🐹</span>
      )}
    </div>
  );
};

const TasksPage = () => {
  const [tasks, setTasks] = useState<TaskWithPig[]>([]);
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [selectedPigId, setSelectedPigId] = useState<number | ''>('');
  const [taskToComplete, setTaskToComplete] = useState<TaskWithPig | null>(
    null
  );
  const [taskToDelete, setTaskToDelete] = useState<TaskWithPig | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [tasksData, pigsData] = await Promise.all([
          getAllTasks(),
          getAllPigs(),
        ]);
        setTasks(tasksData);
        setPigs(pigsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const pigId = selectedPigId || null;
      await createTask(title.trim(), pigId);
      const updated = await getAllTasks();
      setTasks(updated);
      setTitle('');
      setSelectedPigId('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleConfirmToggle = async () => {
    if (!taskToComplete) return;
    setUpdating(true);
    try {
      await toggleTaskComplete(taskToComplete.id, !taskToComplete.completed);
      const updated = await getAllTasks();
      setTasks(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
      setTaskToComplete(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    setUpdating(true);
    try {
      await deleteTask(taskToDelete.id);
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
      setTaskToDelete(null);
    }
  };

  if (loading) return <Loading />;
  if (error) return <p>{error}</p>;

  const outstanding = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  return (
    <div className="tasksPage">
      <h1>Tasks 📝</h1>

      <form className="taskForm" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="What needs doing?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="taskInput"
        />
        <PigPicker
          pigs={pigs}
          selectedPigId={selectedPigId}
          onSelect={setSelectedPigId}
          view="compact"
        />
        <button
          type="submit"
          className="btn-outline taskAddButton"
          disabled={!title.trim()}
        >
          Add
        </button>
      </form>

      {outstanding.length === 0 && completed.length === 0 && (
        <p className="tasksEmpty">No tasks yet! 🎉</p>
      )}

      {outstanding.length > 0 && (
        <div className="taskSection">
          <h2>To do</h2>
          <div className="taskList">
            {outstanding.map((task) => {
              const pigColor = task.pig_id
                ? PASTEL_BORDERS[task.pig_id % PASTEL_BORDERS.length]
                : undefined;
              return (
                <div
                  key={task.id}
                  className="taskItem"
                  style={
                    pigColor
                      ? ({
                          '--pig-color': pigColor,
                          borderColor: pigColor,
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  <label className="taskCheckboxLabel">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => setTaskToComplete(task)}
                    />
                    <span className="taskTitle">{task.title}</span>
                  </label>
                  {task.pigs && (
                    <Link
                      to={`/pigs/${task.pig_id}`}
                      className="taskPigSection"
                    >
                      <span className="taskPigName">{task.pigs.name}</span>
                      <TaskPigAvatar
                        imagePath={task.pigs.image_path}
                        name={task.pigs.name}
                      />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div className="taskSection taskSectionCompleted">
          <h2>Done</h2>
          <div className="taskList">
            {completed.map((task) => {
              const pigColor = task.pig_id
                ? PASTEL_BORDERS[task.pig_id % PASTEL_BORDERS.length]
                : undefined;
              return (
                <div
                  key={task.id}
                  className="taskItem taskItemCompleted"
                  style={
                    pigColor
                      ? ({
                          '--pig-color': pigColor,
                          borderColor: pigColor,
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  <label className="taskCheckboxLabel">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => setTaskToComplete(task)}
                    />
                    <span className="taskTitle">{task.title}</span>
                  </label>
                  {task.pigs && (
                    <Link
                      to={`/pigs/${task.pig_id}`}
                      className="taskPigSection"
                    >
                      <TaskPigAvatar
                        imagePath={task.pigs.image_path}
                        name={task.pigs.name}
                      />
                      <span className="taskPigName">{task.pigs.name}</span>
                    </Link>
                  )}
                  <button
                    className="taskDeleteButton"
                    onClick={() => setTaskToDelete(task)}
                    aria-label="Delete task"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <Modal isOpen={!!taskToComplete} onClose={() => setTaskToComplete(null)}>
        <p>
          {taskToComplete?.completed
            ? `Mark "${taskToComplete?.title}" as not done?`
            : `Mark "${taskToComplete?.title}" as done?`}
        </p>
        <div className="confirmActions">
          <button onClick={() => setTaskToComplete(null)}>Cancel</button>
          <button onClick={handleConfirmToggle} disabled={updating}>
            {updating ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!taskToDelete} onClose={() => setTaskToDelete(null)}>
        <p>Delete "{taskToDelete?.title}"?</p>
        <div className="confirmActions">
          <button onClick={() => setTaskToDelete(null)}>Cancel</button>
          <button onClick={handleConfirmDelete} disabled={updating}>
            {updating ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default TasksPage;
