import { useRef, useState } from 'react';
import WidgetShell from '../widgets/WidgetShell';
import './focus-timer.css';

interface Task { id: string; text: string; done: boolean }
const LS_KEY = 'studycouch_focus_tasks';

function loadTasks(): Task[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as Task[]; }
  catch { return []; }
}
function saveTasks(t: Task[]) { localStorage.setItem(LS_KEY, JSON.stringify(t)); }

interface Props { onClose: () => void }

export default function TasksWidget({ onClose }: Props) {
  const [tasks, setTasksState] = useState<Task[]>(loadTasks);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const setTasks = (next: Task[]) => { setTasksState(next); saveTasks(next); };

  const addTask = () => {
    const text = input.trim();
    if (!text) return;
    setTasks([...tasks, { id: Date.now().toString(), text, done: false }]);
    setInput('');
    inputRef.current?.focus();
  };

  const toggle    = (id: string) => setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove    = (id: string) => setTasks(tasks.filter(t => t.id !== id));
  const clearDone = ()           => setTasks(tasks.filter(t => !t.done));
  const doneCount    = tasks.filter(t => t.done).length;
  const pendingCount = tasks.filter(t => !t.done).length;

  const titleWithCount = pendingCount > 0 ? `Task List · ${pendingCount}` : 'Task List';

  return (
    <WidgetShell id="tasks" icon="✅" title={titleWithCount} onClose={onClose}>
      <div className="tk-body">

        {/* Add row */}
        <div className="tk-add-row">
          <input
            ref={inputRef}
            className="tk-input"
            placeholder="Add a task…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
          />
          <button type="button" className="tk-add-btn" onClick={addTask} aria-label="Add task">+</button>
        </div>

        {/* Task list */}
        <div className="tk-list">
          {tasks.length === 0 && (
            <div className="tk-empty">
              <span className="tk-empty-icon">📋</span>
              <span>No tasks yet</span>
            </div>
          )}
          {tasks.map(task => (
            <div key={task.id} className={`tk-item${task.done ? ' tk-item--done' : ''}`}>
              <button
                type="button"
                className={`tk-check${task.done ? ' tk-check--done' : ''}`}
                onClick={() => toggle(task.id)}
                aria-label={task.done ? 'Mark undone' : 'Mark done'}
              >
                {task.done && <span className="tk-check-mark">✓</span>}
              </button>
              <span className="tk-text">{task.text}</span>
              <button
                type="button"
                className="tk-del"
                onClick={() => remove(task.id)}
                aria-label="Delete task"
              >×</button>
            </div>
          ))}
        </div>

        {/* Footer */}
        {doneCount > 0 && (
          <div className="tk-footer">
            <button type="button" className="tk-clear-btn" onClick={clearDone}>
              Clear {doneCount} done
            </button>
          </div>
        )}

      </div>
    </WidgetShell>
  );
}
