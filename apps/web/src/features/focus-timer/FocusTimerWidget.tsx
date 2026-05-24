import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTimer, PRESET_WORK_MINS, type PresetMins } from './useTimer';
import { useAudio, type AmbientSound, type AlertSound } from './useAudio';
import './focus-timer.css';

// ── Checklist ─────────────────────────────────────────────────────────────────

interface Task { id: string; text: string; done: boolean }
const LS_TASKS = 'studycouch_focus_tasks';
const LS_POS   = 'studycouch_timer_position';

function loadTasks(): Task[] {
  try { return JSON.parse(localStorage.getItem(LS_TASKS) ?? '[]') as Task[]; }
  catch { return []; }
}
function saveTasks(tasks: Task[]) { localStorage.setItem(LS_TASKS, JSON.stringify(tasks)); }
function loadPos() {
  try { return JSON.parse(localStorage.getItem(LS_POS) ?? '{"x":0,"y":0}') as { x: number; y: number }; }
  catch { return { x: 0, y: 0 }; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const PHASE_ICON: Record<string, string> = {
  'work': '🍅', 'short-break': '☕', 'long-break': '💤',
};
const PHASE_LABEL: Record<string, string> = {
  'work': 'Work Session', 'short-break': 'Short Break', 'long-break': 'Long Break',
};
const AMBIENT_OPTIONS: { id: AmbientSound; label: string; icon: string }[] = [
  { id: 'none',      label: 'Off',  icon: '🔇' },
  { id: 'rain',      label: 'Rain', icon: '🌧' },
  { id: 'cafe',      label: 'Café', icon: '☕' },
  { id: 'fireplace', label: 'Fire', icon: '🔥' },
];
const ALERT_OPTIONS: { id: AlertSound; label: string }[] = [
  { id: 'bell',  label: 'Bell' },
  { id: 'chime', label: 'Chime' },
  { id: 'beep',  label: 'Beep' },
];

// ── Pomodoro dots ─────────────────────────────────────────────────────────────

function PomoDots({ count }: { count: number }) {
  return (
    <div className="ft-dots">
      {[0,1,2,3].map(i => <span key={i} className={`ft-dot${i < count ? ' ft-dot--done' : ''}`} />)}
    </div>
  );
}

// ── Tab: Timer ────────────────────────────────────────────────────────────────

function TimerTab({ timer }: { timer: ReturnType<typeof useTimer> }) {
  const { state, start, pause, reset, setMode, setWorkMins, setCustomMinutes, skipPhase } = timer;
  const [customInput, setCustomInput] = useState(String(state.customMinutes));

  const applyCustom = () => {
    const v = parseInt(customInput, 10);
    if (!isNaN(v) && v >= 1 && v <= 999) setCustomMinutes(v);
  };

  const isPomodoro = state.mode === 'pomodoro';
  const phaseIcon = isPomodoro ? PHASE_ICON[state.phase] : '⏱';

  return (
    <div className="ft-tab-content">
      {/* Mode toggle */}
      <div className="ft-mode-row">
        <button type="button"
          className={`ft-mode-btn${isPomodoro ? ' ft-mode-btn--active' : ''}`}
          onClick={() => setMode('pomodoro')}
        >🍅 Pomodoro</button>
        <button type="button"
          className={`ft-mode-btn${!isPomodoro ? ' ft-mode-btn--active' : ''}`}
          onClick={() => setMode('custom')}
        >⏱ Custom</button>
      </div>

      {/* Pomodoro preset chips */}
      {isPomodoro && (
        <div className="ft-presets">
          {PRESET_WORK_MINS.map(m => (
            <button type="button" key={m}
              className={`ft-preset${state.workMins === m ? ' ft-preset--active' : ''}`}
              onClick={() => setWorkMins(m as PresetMins)}
              disabled={state.status === 'running'}
              title={`${m} minute work session`}
            >
              {m}<span className="ft-preset-unit">m</span>
            </button>
          ))}
        </div>
      )}

      {/* Phase icon + time display */}
      <div className={`ft-timer-face${isPomodoro ? ' ft-timer-face--pomodoro' : ' ft-timer-face--custom'}`}>
        <span className="ft-phase-icon">{phaseIcon}</span>
        <div className="ft-time">{fmt(state.secondsLeft)}</div>
        {isPomodoro && <div className="ft-phase-label">{PHASE_LABEL[state.phase]}</div>}
      </div>

      {isPomodoro && <PomoDots count={state.pomodoroCount} />}

      {/* Custom minutes input */}
      {!isPomodoro && state.status === 'idle' && (
        <div className="ft-custom-row">
          <input
            className="ft-custom-input"
            type="number" min={1} max={999}
            title="Custom duration in minutes"
            aria-label="Custom duration in minutes"
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onBlur={applyCustom}
            onKeyDown={e => e.key === 'Enter' && applyCustom()}
          />
          <span className="ft-custom-unit">min</span>
        </div>
      )}

      {/* Controls */}
      <div className="ft-controls">
        {state.status === 'running'
          ? <button type="button" className="ft-btn ft-btn--primary" onClick={pause}>⏸ Pause</button>
          : <button type="button" className="ft-btn ft-btn--primary" onClick={start}>
              {state.status === 'paused' ? '▶ Resume' : '▶ Start'}
            </button>
        }
        <button type="button" className="ft-btn" onClick={reset} title="Reset">↺</button>
        {isPomodoro && <button type="button" className="ft-btn" onClick={skipPhase} title="Skip phase">⏭</button>}
      </div>
    </div>
  );
}

// ── Tab: Sounds ───────────────────────────────────────────────────────────────

function SoundsTab({ audio }: { audio: ReturnType<typeof useAudio> }) {
  const { prefs, isAmbientPlaying, setAmbient, setAmbientVolume, setAlert, playAlert, enableNotifications } = audio;
  const notifGranted = typeof Notification !== 'undefined' && Notification.permission === 'granted';

  return (
    <div className="ft-tab-content">
      <div className="ft-section-label">Ambient</div>
      <div className="ft-ambient-grid">
        {AMBIENT_OPTIONS.map(({ id, label, icon }) => (
          <button type="button" key={id}
            className={`ft-ambient-btn${prefs.ambient === id ? ' ft-ambient-btn--active' : ''}`}
            onClick={() => setAmbient(id)}
          >
            <span>{icon}</span>
            <span>{label}</span>
            {prefs.ambient === id && id !== 'none' && (
              <span className="ft-ambient-status">{isAmbientPlaying ? '●' : '○'}</span>
            )}
          </button>
        ))}
      </div>

      {prefs.ambient !== 'none' && (
        <div className="ft-vol-row">
          <span className="ft-vol-icon">🔈</span>
          <input className="ft-slider" type="range" min={0} max={1} step={0.05}
            title="Ambient volume"
            aria-label="Ambient volume"
            value={prefs.ambientVolume}
            onChange={e => setAmbientVolume(parseFloat(e.target.value))}
          />
          <span className="ft-vol-icon">🔊</span>
        </div>
      )}

      <div className="ft-section-label ft-section-label--mt">Alert sound</div>
      <div className="ft-alert-row">
        {ALERT_OPTIONS.map(({ id, label }) => (
          <label key={id} className="ft-radio-label">
            <input type="radio" name="alert" value={id}
              title={`Alert sound: ${label}`}
              checked={prefs.alert === id} onChange={() => setAlert(id)} />
            {label}
          </label>
        ))}
        <button type="button" className="ft-btn ft-btn--sm" onClick={() => playAlert()} title="Preview alert">▶</button>
      </div>

      {'Notification' in window && (
        <>
          <div className="ft-section-label ft-section-label--mt">Notifications</div>
          {notifGranted || prefs.notificationsEnabled
            ? <div className="ft-notif-status">✓ Browser notifications on</div>
            : <button type="button" className="ft-btn ft-btn--sm" onClick={() => void enableNotifications()}>
                Enable browser popups
              </button>
          }
        </>
      )}
    </div>
  );
}

// ── Tab: Tasks ────────────────────────────────────────────────────────────────

function TasksTab({ tasks, setTasks }: { tasks: Task[]; setTasks: (t: Task[]) => void }) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTask = () => {
    const text = input.trim();
    if (!text) return;
    setTasks([...tasks, { id: Date.now().toString(), text, done: false }]);
    setInput('');
    inputRef.current?.focus();
  };

  const toggle = (id: string) => setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id: string) => setTasks(tasks.filter(t => t.id !== id));
  const clearDone = () => setTasks(tasks.filter(t => !t.done));
  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div className="ft-tab-content ft-tasks">
      <div className="ft-task-input-row">
        <input ref={inputRef} className="ft-task-input" placeholder="Add a task…"
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()} />
        <button type="button" className="ft-btn ft-btn--primary ft-btn--sm" onClick={addTask}>+</button>
      </div>
      <div className="ft-task-list">
        {tasks.length === 0 && <div className="ft-task-empty">No tasks yet.</div>}
        {tasks.map(task => (
          <div key={task.id} className={`ft-task-item${task.done ? ' ft-task-item--done' : ''}`}>
            <button type="button" className="ft-task-check" onClick={() => toggle(task.id)} aria-label="Toggle task">
              {task.done ? '✓' : '○'}
            </button>
            <span className="ft-task-text">{task.text}</span>
            <button type="button" className="ft-task-del" onClick={() => remove(task.id)} aria-label="Delete task">×</button>
          </div>
        ))}
      </div>
      {doneCount > 0 && (
        <button type="button" className="ft-btn ft-btn--sm ft-clear-done" onClick={clearDone}>
          Clear {doneCount} done
        </button>
      )}
    </div>
  );
}

// ── Tab: Notes ────────────────────────────────────────────────────────────────

function NotesTab() {
  const [count, setCount] = useState(() => {
    try { return (JSON.parse(localStorage.getItem('studycouch_sticky_notes') ?? '[]') as unknown[]).length; }
    catch { return 0; }
  });

  const newNote = () => window.dispatchEvent(new CustomEvent('studycouch:new-note'));
  const clearAll = () => window.dispatchEvent(new CustomEvent('studycouch:clear-notes'));

  useEffect(() => {
    const sync = () => {
      try { setCount((JSON.parse(localStorage.getItem('studycouch_sticky_notes') ?? '[]') as unknown[]).length); }
      catch { /* noop */ }
    };
    window.addEventListener('studycouch:notes-updated', sync);
    return () => window.removeEventListener('studycouch:notes-updated', sync);
  }, []);

  return (
    <div className="ft-tab-content ft-notes-tab">
      <div className="ft-notes-hero">
        <span className="ft-notes-emoji">📝</span>
        <div className="ft-notes-desc">Sticky notes float freely on the page. Drag them anywhere.</div>
      </div>
      <button type="button" className="ft-btn ft-btn--primary ft-notes-add" onClick={newNote}>
        + New sticky note
      </button>
      {count > 0 && (
        <div className="ft-notes-meta">
          <span>{count} note{count !== 1 ? 's' : ''} on page</span>
          <button type="button" className="ft-btn ft-btn--sm ft-notes-clear" onClick={clearAll}>Clear all</button>
        </div>
      )}
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

type Tab = 'timer' | 'sounds' | 'tasks' | 'notes';

export default function FocusTimerWidget() {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('timer');
  const [tasks, setTasksState] = useState<Task[]>(loadTasks);
  const [pos, setPos] = useState(loadPos);

  const setTasks = useCallback((next: Task[]) => {
    setTasksState(next);
    saveTasks(next);
  }, []);

  const audio = useAudio();
  const timer = useTimer(useCallback(() => {
    audio.playAlert();
    audio.sendNotification(
      'Time\'s up!',
      timer.state.mode === 'pomodoro'
        ? (timer.state.phase === 'work' ? 'Work session done — take a break.' : 'Break over — back to work!')
        : 'Your countdown has finished.',
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  const pendingCount = tasks.filter(t => !t.done).length;

  const prevStatus = useRef(timer.state.status);
  useEffect(() => {
    if (prevStatus.current !== 'running' && timer.state.status === 'running') {
      if (audio.prefs.ambient !== 'none' && !audio.isAmbientPlaying) {
        audio.startAmbient(audio.prefs.ambient, audio.prefs.ambientVolume);
      }
    }
    prevStatus.current = timer.state.status;
  }, [timer.state.status, audio]);

  const isPomodoro = timer.state.mode === 'pomodoro';
  const collapsedIcon = isPomodoro
    ? (timer.state.phase === 'work' ? '🍅' : timer.state.phase === 'short-break' ? '☕' : '💤')
    : '⏱';

  return (
    <motion.div
      className="ft-widget"
      drag
      dragMomentum={false}
      initial={false}
      animate={pos}
      onDragEnd={(_, info) => {
        const next = { x: pos.x + info.offset.x, y: pos.y + info.offset.y };
        setPos(next);
        localStorage.setItem(LS_POS, JSON.stringify(next));
      }}
      whileDrag={{ cursor: 'grabbing' }}
    >
      {!expanded && (
        <button type="button" className="ft-collapsed" onClick={() => setExpanded(true)}>
          <span className="ft-collapsed-icon">{collapsedIcon}</span>
          <span className="ft-collapsed-time">{fmt(timer.state.secondsLeft)}</span>
          {pendingCount > 0 && <span className="ft-collapsed-badge">{pendingCount}</span>}
        </button>
      )}

      {expanded && (
        <div className="ft-card">
          <div className="ft-header">
            <span className="ft-header-title">Focus Timer</span>
            <button type="button" className="ft-close-btn" onClick={() => setExpanded(false)}>−</button>
          </div>

          <div className="ft-tabs">
            <button type="button" className={`ft-tab${activeTab === 'timer'  ? ' ft-tab--active' : ''}`} onClick={() => setActiveTab('timer')}>Timer</button>
            <button type="button" className={`ft-tab${activeTab === 'sounds' ? ' ft-tab--active' : ''}`} onClick={() => setActiveTab('sounds')}>Sounds</button>
            <button type="button" className={`ft-tab${activeTab === 'tasks'  ? ' ft-tab--active' : ''}`} onClick={() => setActiveTab('tasks')}>
              Tasks{pendingCount > 0 ? ` · ${pendingCount}` : ''}
            </button>
            <button type="button" className={`ft-tab${activeTab === 'notes'  ? ' ft-tab--active' : ''}`} onClick={() => setActiveTab('notes')}>Notes</button>
          </div>

          {activeTab === 'timer'  && <TimerTab  timer={timer} />}
          {activeTab === 'sounds' && <SoundsTab audio={audio} />}
          {activeTab === 'tasks'  && <TasksTab  tasks={tasks} setTasks={setTasks} />}
          {activeTab === 'notes'  && <NotesTab />}
        </div>
      )}
    </motion.div>
  );
}
