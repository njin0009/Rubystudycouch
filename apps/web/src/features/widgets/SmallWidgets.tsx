import { useCallback, useEffect, useRef, useState } from 'react';
import WidgetShell from './WidgetShell';
import { readStudyPlan } from '../study-plan/StudyPlanPage';

// ── Shared helpers ────────────────────────────────────────────────────────────

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function playBreakChime() {
  try {
    const ctx = new AudioContext();
    void ctx.resume();
    const now = ctx.currentTime;
    [440, 554, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.28;
      gain.gain.setValueAtTime(0.32, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.2);
    });
  } catch { /* noop */ }
}

// ── Exam Countdown ────────────────────────────────────────────────────────────

function useExamDaysLeft(): { daysLeft: number | null; examDate: string | null } {
  const [daysLeft, setDaysLeft]   = useState<number | null>(null);
  const [examDate, setExamDate]   = useState<string | null>(null);

  useEffect(() => {
    const compute = () => {
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('studycouch_study_plan:'));
        if (keys.length === 0) { setDaysLeft(null); return; }
        const userId = keys[keys.length - 1].replace('studycouch_study_plan:', '');
        const plan = readStudyPlan(userId);
        if (!plan?.examDate) { setDaysLeft(null); return; }
        setExamDate(plan.examDate);
        setDaysLeft(Math.ceil((new Date(plan.examDate).getTime() - Date.now()) / 86_400_000));
      } catch { setDaysLeft(null); }
    };
    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, []);

  return { daysLeft, examDate };
}

export function ExamCountdownWidget({ onClose }: { onClose: () => void }) {
  const { daysLeft, examDate } = useExamDaysLeft();

  let display = '—';
  let sub = 'No exam date in your study plan.';
  let urgencyClass = '';

  if (daysLeft !== null && examDate) {
    if (daysLeft < 0) {
      display = 'Done';
      sub = `Exam was ${Math.abs(daysLeft)}d ago`;
    } else if (daysLeft === 0) {
      display = 'Today';
      sub = 'Exam day — you got this!';
      urgencyClass = 'wg-cd--urgent';
    } else {
      display = String(daysLeft);
      sub = `days until ${new Date(examDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      if (daysLeft <= 7)  urgencyClass = 'wg-cd--urgent';
      else if (daysLeft <= 14) urgencyClass = 'wg-cd--warn';
    }
  }

  return (
    <WidgetShell id="exam-cd" icon="📅" title="Exam Countdown" onClose={onClose} width={200}>
      <div className={`wg-cd ${urgencyClass}`}>
        <div className="wg-cd-number">{display}</div>
        <div className="wg-cd-sub">{sub}</div>
        {daysLeft === null && (
          <div className="wg-cd-hint">Set exam date in Profile &amp; Plan.</div>
        )}
      </div>
    </WidgetShell>
  );
}

// ── Break Reminder ────────────────────────────────────────────────────────────

const BREAK_LS = 'studycouch_break_reminder';
interface BreakPrefs { intervalMins: number; enabled: boolean }

function loadBreakPrefs(): BreakPrefs {
  try { return JSON.parse(localStorage.getItem(BREAK_LS) ?? '{}') as BreakPrefs; }
  catch { return { intervalMins: 45, enabled: false }; }
}

const INTERVALS = [20, 30, 45, 60, 90];

export function BreakReminderWidget({ onClose }: { onClose: () => void }) {
  const [prefs, setPrefs] = useState<BreakPrefs>(() => ({ intervalMins: 45, enabled: false, ...loadBreakPrefs() }));
  const [secsLeft, setSecsLeft]   = useState(prefs.intervalMins * 60);
  const [notifGranted, setNotifGranted] = useState(
    () => typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const save = (next: BreakPrefs) => {
    setPrefs(next);
    localStorage.setItem(BREAK_LS, JSON.stringify(next));
  };

  const reset = useCallback(() => setSecsLeft(prefs.intervalMins * 60), [prefs.intervalMins]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!prefs.enabled) { reset(); return; }
    intervalRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) {
          playBreakChime();
          if (Notification.permission === 'granted') {
            new Notification('Break time! 💧', { body: 'Stand up, stretch, drink some water.' });
          }
          return prefs.intervalMins * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [prefs.enabled, prefs.intervalMins, reset]);

  return (
    <WidgetShell id="break" icon="💧" title="Break Reminder" onClose={onClose} width={220}>
      <div className="wg-break">

        {/* Interval chips */}
        <div className="wg-chips">
          {INTERVALS.map(m => (
            <button type="button" key={m}
              className={`wg-chip${prefs.intervalMins === m ? ' wg-chip--on' : ''}`}
              onClick={() => { save({ ...prefs, intervalMins: m }); setSecsLeft(m * 60); }}
              title={`Every ${m} minutes`}
            >{m}m</button>
          ))}
        </div>

        {/* Countdown */}
        <div className="wg-break-time">
          {prefs.enabled ? fmtTime(secsLeft) : '——:——'}
        </div>
        <div className="wg-break-sub">
          {prefs.enabled ? 'until next break' : 'paused'}
        </div>

        {/* Controls */}
        <div className="wg-break-controls">
          <button type="button"
            className={`wg-btn${prefs.enabled ? ' wg-btn--teal' : ' wg-btn--primary'}`}
            onClick={() => save({ ...prefs, enabled: !prefs.enabled })}
          >
            {prefs.enabled ? '⏸ Pause' : '▶ Start'}
          </button>
          <button type="button" className="wg-btn" onClick={reset} title="Reset">↺</button>
        </div>

        {/* Notification opt-in */}
        {'Notification' in window && !notifGranted && (
          <button type="button" className="wg-btn-link"
            onClick={() => void Notification.requestPermission().then(p => setNotifGranted(p === 'granted'))}>
            Enable notifications
          </button>
        )}

      </div>
    </WidgetShell>
  );
}

// ── Daily Quote ───────────────────────────────────────────────────────────────

const QUOTES = [
  { text: 'Small daily improvements are the key to staggering long-term results.', author: 'Robin Sharma' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Learning is not attained by chance, it must be sought for with ardor.', author: 'Abigail Adams' },
  { text: 'The more that you read, the more things you will know.', author: 'Dr. Seuss' },
  { text: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
  { text: 'Education is not preparation for life; education is life itself.', author: 'John Dewey' },
  { text: 'The beautiful thing about learning is that no one can take it away from you.', author: 'B.B. King' },
  { text: "You don't have to be great to start, but you have to start to be great.", author: 'Zig Ziglar' },
  { text: 'Success is the sum of small efforts repeated day in and day out.', author: 'Robert Collier' },
  { text: "Believe you can and you're halfway there.", author: 'Theodore Roosevelt' },
  { text: 'Push yourself, because no one else is going to do it for you.', author: 'Anonymous' },
];

function getDailyQuote() {
  return QUOTES[Math.floor(Date.now() / 86_400_000) % QUOTES.length];
}

export function DailyQuoteWidget({ onClose }: { onClose: () => void }) {
  const [quote, setQuote] = useState(getDailyQuote);

  const next = () => {
    setQuote(q => QUOTES[(QUOTES.indexOf(q) + 1) % QUOTES.length]);
  };

  return (
    <WidgetShell id="quote" icon="✨" title="Daily Quote" onClose={onClose} width={240}>
      <div className="wg-quote">
        <p className="wg-quote-text">"{quote.text}"</p>
        <p className="wg-quote-author">— {quote.author}</p>
        <button type="button" className="wg-btn wg-quote-next" onClick={next}>Next ›</button>
      </div>
    </WidgetShell>
  );
}
