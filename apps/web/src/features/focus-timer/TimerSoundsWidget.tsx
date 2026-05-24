import { useCallback, useEffect, useRef, useState } from 'react';
import WidgetShell from '../widgets/WidgetShell';
import './focus-timer.css';
import { useTimer, PRESET_WORK_MINS, type PresetMins } from './useTimer';
import { useAudio, type AmbientSound, type AlertSound } from './useAudio';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const PHASE_ICON: Record<string, string>  = { work: '🍅', 'short-break': '☕', 'long-break': '💤' };
const PHASE_LABEL: Record<string, string> = { work: 'Work', 'short-break': 'Short Break', 'long-break': 'Long Break' };

const AMBIENT_OPTIONS: { id: AmbientSound; label: string; icon: string }[] = [
  { id: 'none',      label: 'Off',    icon: '🔇' },
  { id: 'rain',      label: 'Rain',   icon: '🌧' },
  { id: 'cafe',      label: 'Café',   icon: '☕' },
  { id: 'fireplace', label: 'Fire',   icon: '🔥' },
  { id: 'wind',      label: 'Wind',   icon: '🌬' },
  { id: 'ocean',     label: 'Ocean',  icon: '🌊' },
  { id: 'library',   label: 'Study',  icon: '📚' },
  { id: 'forest',    label: 'Forest', icon: '🌿' },
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
      {[0, 1, 2, 3].map(i => (
        <span key={i} className={`ft-dot${i < count ? ' ft-dot--done' : ''}`} />
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props { onClose: () => void }

export default function TimerSoundsWidget({ onClose }: Props) {
  const audio = useAudio();
  const timer = useTimer(useCallback(() => {
    audio.playAlert();
    audio.sendNotification(
      "Time's up!",
      timer.state.mode === 'pomodoro'
        ? (timer.state.phase === 'work' ? 'Work session done — take a break.' : 'Break over — back to work!')
        : 'Your countdown has finished.',
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  const { state, start, pause, reset, setMode, setWorkMins, setCustomMinutes, skipPhase } = timer;
  const isPomodoro = state.mode === 'pomodoro';

  const [customInput, setCustomInput] = useState(() => String(state.customMinutes));
  const [noteCount, setNoteCount] = useState(() => {
    try { return (JSON.parse(localStorage.getItem('studycouch_sticky_notes') ?? '[]') as unknown[]).length; }
    catch { return 0; }
  });
  const [notifGranted, setNotifGranted] = useState(
    () => typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  // Auto-start ambient when timer starts running
  const prevStatus = useRef(state.status);
  useEffect(() => {
    if (prevStatus.current !== 'running' && state.status === 'running') {
      if (audio.prefs.ambient !== 'none' && !audio.isAmbientPlaying) {
        audio.startAmbient(audio.prefs.ambient, audio.prefs.ambientVolume);
      }
    }
    prevStatus.current = state.status;
  }, [state.status, audio]);

  // Sync sticky note count
  useEffect(() => {
    const sync = () => {
      try { setNoteCount((JSON.parse(localStorage.getItem('studycouch_sticky_notes') ?? '[]') as unknown[]).length); }
      catch { /* noop */ }
    };
    window.addEventListener('studycouch:notes-updated', sync);
    return () => window.removeEventListener('studycouch:notes-updated', sync);
  }, []);

  const applyCustom = () => {
    const v = parseInt(customInput, 10);
    if (!isNaN(v) && v >= 1 && v <= 999) setCustomMinutes(v);
  };

  return (
    <WidgetShell id="timer-sounds" icon="🍅" title="Focus Timer" onClose={onClose} width={280}>
      <div className="ft-unified">

        {/* ── Timer ──────────────────────────────────────────────────────── */}
        <div className="ft-section">
          <div className="ft-mode-row">
            <button type="button"
              className={`ft-mode-btn${isPomodoro ? ' ft-mode-btn--active' : ''}`}
              onClick={() => setMode('pomodoro')}>
              🍅 Pomodoro
            </button>
            <button type="button"
              className={`ft-mode-btn${!isPomodoro ? ' ft-mode-btn--active' : ''}`}
              onClick={() => setMode('custom')}>
              ⏱ Custom
            </button>
          </div>

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

          <div className={`ft-timer-face${isPomodoro ? ' ft-timer-face--pomodoro' : ' ft-timer-face--custom'}`}>
            <span className="ft-phase-icon">
              {isPomodoro ? PHASE_ICON[state.phase] : '⏱'}
            </span>
            <div className="ft-time">{fmt(state.secondsLeft)}</div>
            {isPomodoro && <div className="ft-phase-label">{PHASE_LABEL[state.phase]}</div>}
          </div>

          {isPomodoro && <PomoDots count={state.pomodoroCount} />}

          {!isPomodoro && state.status === 'idle' && (
            <div className="ft-custom-row">
              <input className="ft-custom-input" type="number" min={1} max={999}
                title="Duration in minutes" aria-label="Duration in minutes"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onBlur={applyCustom}
                onKeyDown={e => e.key === 'Enter' && applyCustom()} />
              <span className="ft-custom-unit">min</span>
            </div>
          )}

          <div className="ft-controls">
            {state.status === 'running'
              ? <button type="button" className="ft-btn ft-btn--primary" onClick={pause}>⏸ Pause</button>
              : <button type="button" className="ft-btn ft-btn--primary" onClick={start}>
                  {state.status === 'paused' ? '▶ Resume' : '▶ Start'}
                </button>
            }
            <button type="button" className="ft-btn" onClick={reset} title="Reset">↺</button>
            {isPomodoro && (
              <button type="button" className="ft-btn" onClick={skipPhase} title="Skip phase">⏭</button>
            )}
          </div>
        </div>

        <div className="ft-separator" />

        {/* ── Ambient Sound ───────────────────────────────────────────────── */}
        <div className="ft-section">
          <div className="ft-section-hd">
            <span className="ft-section-hd-label">Ambient Sound</span>
            {audio.prefs.ambient !== 'none' && (
              <button type="button" className="ft-btn ft-btn--sm" onClick={audio.toggleAmbient}>
                {audio.isAmbientPlaying ? '⏸' : '▶'}
              </button>
            )}
          </div>
          <div className="ft-ambient-grid">
            {AMBIENT_OPTIONS.map(({ id, label, icon }) => (
              <button type="button" key={id}
                className={`ft-ambient-btn${audio.prefs.ambient === id ? ' ft-ambient-btn--active' : ''}`}
                onClick={() => audio.setAmbient(id)}
                title={label}
              >
                <span className="ft-ambient-icon">{icon}</span>
                <span className="ft-ambient-label">{label}</span>
              </button>
            ))}
          </div>
          {audio.prefs.ambient !== 'none' && (
            <div className="ft-vol-row">
              <span className="ft-vol-icon">🔈</span>
              <input className="ft-slider" type="range" min={0} max={1} step={0.05}
                title="Ambient volume" aria-label="Ambient volume"
                value={audio.prefs.ambientVolume}
                onChange={e => audio.setAmbientVolume(parseFloat(e.target.value))} />
              <span className="ft-vol-icon">🔊</span>
            </div>
          )}
        </div>

        <div className="ft-separator" />

        {/* ── Alert Sound ─────────────────────────────────────────────────── */}
        <div className="ft-section">
          <div className="ft-section-hd">
            <span className="ft-section-hd-label">Alert Sound</span>
            <button type="button" className="ft-btn ft-btn--sm" onClick={() => audio.playAlert()}>
              ▶ Test
            </button>
          </div>
          <div className="ft-alert-row">
            {ALERT_OPTIONS.map(({ id, label }) => (
              <label key={id} className="ft-radio-label">
                <input type="radio" name="alert-ts" value={id} title={`Alert: ${label}`}
                  checked={audio.prefs.alert === id} onChange={() => audio.setAlert(id)} />
                {label}
              </label>
            ))}
          </div>
          {'Notification' in window && (
            <div className="ft-notif-row">
              {notifGranted || audio.prefs.notificationsEnabled
                ? <span className="ft-notif-ok">✓ Notifications on</span>
                : <button type="button" className="ft-btn ft-btn--sm"
                    onClick={() => void audio.enableNotifications().then(ok => setNotifGranted(ok))}>
                    Enable popups
                  </button>
              }
            </div>
          )}
        </div>

        <div className="ft-separator" />

        {/* ── Sticky Notes ────────────────────────────────────────────────── */}
        <div className="ft-section ft-section--notes">
          <div className="ft-section-hd">
            <span className="ft-section-hd-label">Sticky Notes</span>
            {noteCount > 0 && (
              <button type="button" className="ft-btn ft-btn--sm"
                onClick={() => window.dispatchEvent(new CustomEvent('studycouch:clear-notes'))}>
                Clear {noteCount}
              </button>
            )}
          </div>
          <button type="button" className="ft-btn ft-btn--primary ft-notes-add"
            onClick={() => window.dispatchEvent(new CustomEvent('studycouch:new-note'))}>
            + New sticky note
          </button>
        </div>

      </div>
    </WidgetShell>
  );
}
