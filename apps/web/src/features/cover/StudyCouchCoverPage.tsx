import { useEffect, useRef, useState } from 'react';
import { PALETTES, type Palette, type PaletteId } from '@/lib/theme';

// ── Types ────────────────────────────────────────────────────────────────────

export type StudyCouchCoverPageProps = {
  onLogin: () => void;
  onRegister: () => void;
  onBack?: () => void;
  palette: PaletteId;
  setPalette: (id: PaletteId) => void;
  /** Called with featureId when user clicks an implemented feature card */
  onFeature?: (featureId: string) => void;
};

// ── Feature definitions ───────────────────────────────────────────────────────

const FUNCTIONS = [
  { id: 'focus-timer',        n: '01', name: 'Focus Timer',       tag: 'Pomodoro, but cozy.',                  body: '25-min sprints with ambient rain, café murmur, or fireplace. Off-by-default nags.',          color: 'yellow', rot: -2   },
  { id: 'ai-buddy',           n: '02', name: 'AI Study Buddy',    tag: 'A patient tutor, next cushion over.',  body: '"Explain Krebs like I\u2019m nine." "Quiz me on ch. 4." "Rubber-duck this essay outline."',    color: 'pink',   rot: 1.5  },
  { id: 'flashcards',         n: '03', name: 'Smart Flashcards',  tag: 'Spaced repetition that learns you.',   body: 'Drop a PDF or slides. The deck builds itself. You review on the right day, not the boring one.', color: 'green',  rot: -1   },
  { id: 'study-planner',      n: '04', name: 'Study Planner',     tag: 'A schedule that fits a real week.',    body: 'Tell it your exam dates. It plans backwards into 40-min sessions, around class + life.',         color: 'accent', rot: 2    },
  { id: 'notes',              n: '05', name: 'Notes & Summaries', tag: 'Long lecture in. One page out.',       body: 'Upload slides or a recording — get the outline, the 3 things to remember, the one stressed.',   color: 'yellow', rot: 1    },
  { id: 'study-rooms',        n: '06', name: 'Study Rooms',       tag: 'Co-work with your group, virtually.',  body: 'Quiet video rooms, a shared timer, a soft hand-raise. Body-doubling from your dorm.',            color: 'green',  rot: -2   },
  { id: 'streaks',            n: '07', name: 'Streaks & Stats',   tag: 'Progress you can feel.',               body: 'A forgiving daily streak. A weekly heatmap. Honest hours, never guilt-tripped.',               color: 'pink',   rot: 1.8  },
  { id: 'distraction-shield', n: '08', name: 'Distraction Shield',tag: 'Goodbye, TikTok hole.',                body: 'One tap mutes the noisy apps for one session. Auto-off when the timer ends.',                  color: 'accent', rot: -1.2 },
] as const;

// Implemented features that navigate to real app screens
const IMPLEMENTED = new Set(['study-planner', 'streaks']);

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function noteBg(color: string, p: Palette): string {
  return color === 'yellow' ? p.yellow
    : color === 'pink'   ? p.pink
    : color === 'green'  ? p.green
    : p.accent;
}

function textOn(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1A150F' : '#FAF6E9';
}

const Marker = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span style={{ position: 'relative', display: 'inline-block', padding: '0 0.12em' }}>
    <svg style={{ position: 'absolute', inset: '12% -4% 6% -4%', width: '108%', height: '82%', zIndex: 0 }}
      viewBox="0 0 100 30" preserveAspectRatio="none">
      <path d="M2 14 C 20 6, 50 22, 70 12 S 96 8, 98 16 L 98 22 C 80 28, 50 14, 30 22 S 4 26, 2 20 Z"
        fill={color} opacity="0.55" />
    </svg>
    <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
  </span>
);

const Scribble = ({ color }: { color: string }) => (
  <svg width={220} height={14} viewBox="0 0 220 14" style={{ display: 'block' }}>
    <path d="M3 10 C 40 2, 80 14, 120 6 S 200 10, 217 4"
      stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

const Sparkle = ({ color, size = 18, style }: { color: string; size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" style={style}>
    <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z" fill={color} />
  </svg>
);

const Thumbtack = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 22 22" style={{ display: 'block' }}>
    <circle cx="11" cy="9" r="6" fill={color} />
    <circle cx="9" cy="7" r="2" fill="rgba(255,255,255,0.5)" />
    <path d="M11 14 L11 20" stroke="rgba(0,0,0,0.3)" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const CouchMark = ({ p }: { p: Palette }) => (
  <svg width="32" height="32" viewBox="0 0 32 32">
    <path d="M4 20 L4 24 L28 24 L28 20 L24 20 L24 16 C24 13 22 11 18 11 L14 11 C10 11 8 13 8 16 L8 20 Z" fill={p.accent} />
    <path d="M2 24 L30 24" stroke={p.ink} strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="9" cy="6" r="1.5" fill={p.ink} />
    <circle cx="23" cy="6" r="1.5" fill={p.yellow} />
  </svg>
);

// ── Live ticker (hero timer) ──────────────────────────────────────────────────

function useTicker(startSeconds: number) {
  const [s, setS] = useState(startSeconds);
  useEffect(() => {
    const id = setInterval(() => setS((v) => (v <= 0 ? startSeconds : v - 1)), 1000);
    return () => clearInterval(id);
  }, [startSeconds]);
  return { mm: String(Math.floor(s / 60)).padStart(2, '0'), ss: String(s % 60).padStart(2, '0'), pct: 1 - s / startSeconds };
}

function useCounter(target: number, durMs = 1400) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durMs);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durMs]);
  return n;
}

// ── Sections ──────────────────────────────────────────────────────────────────

const Nav = ({ p, onBack, onLogin, onRegister }: { p: Palette; onBack?: () => void; onLogin: () => void; onRegister: () => void }) => (
  <nav style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 48px', position: 'sticky', top: 0, zIndex: 10,
    background: `${p.bg}E6`, backdropFilter: 'blur(8px)',
    borderBottom: `0.5px solid ${p.ink}18`,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <CouchMark p={p} />
      <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, color: p.ink, letterSpacing: '-0.02em', fontWeight: 500 }}>
        StudyCouch
      </span>
      <span style={{ fontFamily: "'Caveat', cursive", fontSize: 17, color: p.accent, transform: 'rotate(-6deg)', marginLeft: 4 }}>CLF-C02</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      {(['Functions', 'How it works', 'For you', 'Pricing'] as const).map((x) => (
        <a key={x} href={`#${x.toLowerCase().replace(/ /g, '')}`} style={{
          color: `${p.ink}B3`, textDecoration: 'none', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap',
        }}>{x}</a>
      ))}
      {onBack ? (
        <button type="button" onClick={onBack} style={{
          background: p.ink, color: p.bg, border: 'none',
          padding: '10px 18px', borderRadius: 999, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
        }}>← Back to app</button>
      ) : (
        <>
          <button type="button" onClick={onLogin} style={{
            background: 'transparent', border: `1.5px solid ${p.ink}55`, color: p.ink,
            padding: '9px 18px', borderRadius: 999, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Log in</button>
          <button type="button" onClick={onRegister} style={{
            background: p.ink, color: p.bg, border: 'none',
            padding: '10px 18px', borderRadius: 999, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
          }}>Start free ↗</button>
        </>
      )}
    </div>
  </nav>
);

const Hero = ({ p, onBack, onRegister, onLogin }: { p: Palette; onBack?: () => void; onRegister: () => void; onLogin: () => void }) => {
  const { mm, ss, pct } = useTicker(25 * 60 - 7 * 60 - 18);
  return (
    <section style={{ position: 'relative', padding: '80px 48px 120px', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: -80, top: 40, width: 380, height: 380, borderRadius: '50%', background: p.yellow, opacity: 0.2, filter: 'blur(40px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', right: -100, bottom: -60, width: 460, height: 460, borderRadius: '50%', background: p.pink, opacity: 0.22, filter: 'blur(50px)', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 56, alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Sparkle color={p.accent} size={24} style={{ position: 'absolute', left: -8, top: -18 }} />
          <Sparkle color={p.yellow} size={13} style={{ position: 'absolute', left: 28, top: 14 }} />
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px 6px 8px', borderRadius: 999,
            background: p.paper, color: p.ink, fontSize: 12, fontWeight: 600,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            marginBottom: 24, border: `1px solid ${p.ink}18`,
            boxShadow: '0 2px 0 rgba(0,0,0,.06)',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: p.green, display: 'inline-block' }} />
            719 CLF-C02 questions ready
          </div>
          <h1 style={{
            fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400,
            fontSize: 'clamp(56px, 7vw, 100px)', lineHeight: 0.98,
            letterSpacing: '-0.035em', color: p.ink, margin: 0,
          }}>
            Studying,<br />
            but{' '}
            <Marker color={p.yellow}><em style={{ fontStyle: 'italic', color: p.accent }}>cozy</em></Marker>.
          </h1>
          <div style={{ marginTop: 8, marginLeft: 4 }}>
            <Scribble color={p.accent} />
          </div>
          <p style={{ fontSize: 19, lineHeight: 1.5, color: `${p.ink}CC`, maxWidth: 500, marginTop: 28, marginBottom: 32 }}>
            The cozy place between "I should study" and actually studying.
            AWS exam prep with a focus timer, AI tutor, flashcards, and your study group — on one warm, undistracting couch.
          </p>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            {onBack ? (
              <button type="button" onClick={onBack} style={{
                background: p.accent, color: p.bg, border: `2px solid ${p.ink}`,
                padding: '14px 24px', borderRadius: 999, fontSize: 16, fontWeight: 700,
                cursor: 'pointer', boxShadow: `4px 4px 0 ${p.ink}`, fontFamily: 'inherit',
              }}>← Back to app</button>
            ) : (
              <>
                <button type="button" onClick={onRegister} style={{
                  background: p.accent, color: p.bg, border: `2px solid ${p.ink}`,
                  padding: '14px 24px', borderRadius: 999, fontSize: 16, fontWeight: 700,
                  cursor: 'pointer', boxShadow: `4px 4px 0 ${p.ink}`, transform: 'rotate(-1deg)',
                  fontFamily: 'inherit',
                }}>Sit down free →</button>
                <button type="button" onClick={onLogin} style={{
                  background: p.paper, border: `2px solid ${p.ink}`, color: p.ink,
                  padding: '13px 22px', borderRadius: 999, fontSize: 15, fontWeight: 600,
                  cursor: 'pointer', boxShadow: `3px 3px 0 ${p.ink}`, fontFamily: 'inherit',
                }}>I have an account</button>
              </>
            )}
          </div>
        </div>
        {/* Hero collage */}
        <div style={{ position: 'relative', height: 480 }}>
          <div style={{
            position: 'absolute', left: 20, top: 30, width: 340, height: 380,
            background: p.paper, borderRadius: 18, padding: 24,
            border: `2px solid ${p.ink}`, boxShadow: `8px 8px 0 ${p.ink}`,
            transform: 'rotate(-3deg)',
          }}>
            <div style={{ position: 'absolute', left: 18, top: -10 }}><Thumbtack color={p.accent} /></div>
            <div style={{ position: 'absolute', right: 18, top: -10 }}><Thumbtack color={p.green} /></div>
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: 18, color: p.ink, opacity: 0.6, marginBottom: 8 }}>~ CLF-C02 prep session ~</div>
            <svg viewBox="0 0 340 220" style={{ width: '100%' }}>
              <rect x="20" y="20" width="140" height="120" rx="60" fill="none" stroke={p.ink} strokeWidth="2" />
              <path d="M90 20 L 90 140 M 20 80 L 160 80" stroke={p.ink} strokeWidth="1.2" />
              <path d="M210 140 L210 70" stroke={p.ink} strokeWidth="1.8" />
              <path d="M210 110 C 185 100, 178 82, 182 64" fill={p.green} stroke={p.ink} strokeWidth="1.6" />
              <path d="M210 90 C 235 80, 242 62, 238 48" fill={p.green} stroke={p.ink} strokeWidth="1.6" />
              <rect x="196" y="150" width="28" height="20" rx="4" fill={p.accent} stroke={p.ink} strokeWidth="1.6" />
              <path d="M30 210 Q 30 165, 70 165 L 270 165 Q 310 165, 310 210 L 310 222 L 30 222 Z" fill={p.accent} stroke={p.ink} strokeWidth="2" />
              <ellipse cx="110" cy="193" rx="18" ry="11" fill={p.paper} opacity="0.4" />
              <ellipse cx="230" cy="193" rx="18" ry="11" fill={p.paper} opacity="0.4" />
            </svg>
          </div>
          <div style={{
            position: 'absolute', right: 0, top: 0, width: 200,
            background: p.ink, color: p.bg, borderRadius: 16, padding: '16px 18px',
            border: `2px solid ${p.ink}`, boxShadow: `6px 6px 0 ${p.accent}`,
            transform: 'rotate(3deg)', zIndex: 2,
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 10, color: `${p.bg}99`, letterSpacing: '0.1em', textTransform: 'uppercase' }}>· Focus · session 4</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 48, color: p.bg, fontWeight: 500, letterSpacing: '-0.04em', marginTop: 2, lineHeight: 1 }}>
              {mm}:{ss}
            </div>
            <div style={{ height: 4, borderRadius: 99, background: `${p.bg}24`, marginTop: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct * 100}%`, background: p.yellow, borderRadius: 99, transition: 'width 1s linear' }} />
            </div>
            <div style={{ fontSize: 11, color: `${p.bg}99`, marginTop: 6 }}>CLF-C02 · Domain 2</div>
          </div>
          <div style={{
            position: 'absolute', right: 24, bottom: 50, width: 220,
            background: p.paper, borderRadius: '18px 18px 4px 18px', padding: '14px 16px',
            border: `2px solid ${p.ink}`, boxShadow: `5px 5px 0 ${p.green}`,
            transform: 'rotate(-2deg)', zIndex: 3,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: p.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: p.green }} />
              Study buddy
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.45, color: p.ink, marginTop: 8 }}>
              Think of S3 like a filing cabinet in the cloud — folders are buckets, files are objects 📦
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }`}</style>
    </section>
  );
};

const Marquee = ({ p }: { p: Palette }) => {
  const items = ['spaced repetition', 'wrong answer queue', 'exam in 14 days', 'streak: day 12', 'CLF-C02 · 719 questions', 'mock readiness', 'bookmarks reviewed', 'iced chai', 'focus session 4', 'library at 1 a.m.', 'back on the couch'];
  const row = [...items, ...items];
  return (
    <div style={{
      background: p.ink, color: p.bg, padding: '16px 0', overflow: 'hidden',
      borderTop: `2px solid ${p.ink}`, borderBottom: `2px solid ${p.ink}`,
      transform: 'rotate(-1.5deg)', marginTop: -20, marginBottom: 60,
      boxShadow: `0 10px 0 ${p.accent}`,
    }}>
      <div style={{ display: 'flex', gap: 32, whiteSpace: 'nowrap', animation: 'scroll 36s linear infinite' }}>
        {row.map((x, i) => (
          <span key={i} style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: 'italic', fontSize: 26, color: p.bg, display: 'flex', alignItems: 'center', gap: 32 }}>
            {x}
            <span style={{ color: p.accent, fontStyle: 'normal', fontSize: 20 }}>✺</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes scroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
};

const StudyWall = ({ p, onFeatureClick }: { p: Palette; onFeatureClick: (id: string) => void }) => (
  <section id="functions" style={{ padding: '60px 48px 120px', position: 'relative' }}>
    <div style={{ textAlign: 'center', marginBottom: 64 }}>
      <div style={{ fontFamily: "'Caveat', cursive", fontSize: 26, color: p.accent, marginBottom: 4 }}>~ the study wall ~</div>
      <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 'clamp(48px, 7vw, 80px)', lineHeight: 1.02, letterSpacing: '-0.03em', color: p.ink, margin: 0 }}>
        Eight things on the couch.<br />
        <em style={{ fontStyle: 'italic', color: p.accent }}>None feel like <Marker color={p.yellow}>homework</Marker>.</em>
      </h2>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, maxWidth: 1280, margin: '0 auto' }}>
      {FUNCTIONS.map((f) => {
        const bg = noteBg(f.color, p);
        const fg = textOn(bg);
        const isImpl = IMPLEMENTED.has(f.id);
        return (
          <article key={f.id}
            onClick={() => onFeatureClick(f.id)}
            style={{
              background: bg, color: fg, padding: '26px 22px 28px', borderRadius: 6,
              border: `2px solid ${p.ink}`, boxShadow: `5px 6px 0 ${p.ink}`,
              transform: `rotate(${f.rot}deg)`,
              transition: 'transform 200ms ease, box-shadow 200ms ease',
              cursor: 'pointer', minHeight: 250, position: 'relative',
            }}
            onMouseEnter={(e) => { const el = e.currentTarget; el.style.transform = `rotate(${f.rot * 0.3}deg) translateY(-4px)`; el.style.boxShadow = `7px 10px 0 ${p.ink}`; }}
            onMouseLeave={(e) => { const el = e.currentTarget; el.style.transform = `rotate(${f.rot}deg)`; el.style.boxShadow = `5px 6px 0 ${p.ink}`; }}
          >
            <div style={{ position: 'absolute', top: -10, left: 18 }}><Thumbtack color={p.accent} /></div>
            {isImpl && (
              <div style={{
                position: 'absolute', top: 10, right: 12,
                background: p.green, color: textOn(p.green),
                fontFamily: "'Caveat', cursive", fontSize: 13, fontWeight: 700,
                padding: '2px 10px', borderRadius: 999, border: `1.5px solid ${p.ink}`,
              }}>✓ live</div>
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, opacity: 0.7, letterSpacing: '0.08em' }}>{f.n}</span>
              <span style={{ fontFamily: "'Caveat', cursive", fontSize: 15, opacity: 0.6 }}>~</span>
            </div>
            <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: 24, lineHeight: 1.05, letterSpacing: '-0.01em', color: fg, margin: '10px 0 8px' }}>{f.name}</h3>
            <p style={{ fontStyle: 'italic', fontSize: 13, margin: 0, opacity: 0.85 }}>{f.tag}</p>
            <p style={{ fontSize: 13, lineHeight: 1.5, margin: '12px 0 0', opacity: 0.8 }}>{f.body}</p>
          </article>
        );
      })}
    </div>
  </section>
);

const LiveStrip = ({ p }: { p: Palette }) => {
  const n = useCounter(12847);
  const streak = useCounter(94);
  return (
    <section style={{ padding: '56px 48px', background: p.bg, borderTop: `2px solid ${p.ink}`, borderBottom: `2px solid ${p.ink}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        {[
          { val: n.toLocaleString(), label: 'students on the couch', color: p.accent },
          { val: `${streak}%`, label: 'kept their streak this week', color: p.green },
          { val: '4.8★', label: 'App Store · 2,100+ reviews', color: p.pink },
        ].map((s, i) => (
          <div key={i}>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 'clamp(48px,6vw,72px)', color: s.color, lineHeight: 1, letterSpacing: '-0.03em' }}>{s.val}</div>
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: 20, color: p.ink, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

const HowItWorks = ({ p }: { p: Palette }) => {
  const steps = [
    { n: '1', t: "Tell us what you're studying.", b: 'Drop in your syllabus, lecture slides, a textbook chapter, or just type the topic.', color: p.yellow },
    { n: '2', t: 'Sit on the couch.', b: 'Pick a 25- or 50-minute session. Choose a soundscape. The AI waits in the wings.', color: p.pink },
    { n: '3', t: 'Get up smarter.', b: 'Cards in your spaced-repetition queue. A clean summary saved. The streak grew.', color: p.green },
  ];
  return (
    <section id="howitworks" style={{ padding: '100px 48px', background: p.paper, borderTop: `2px solid ${p.ink}`, borderBottom: `2px solid ${p.ink}` }}>
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 26, color: p.accent }}>how it works</div>
        <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 'clamp(40px,6vw,72px)', lineHeight: 1.02, letterSpacing: '-0.03em', color: p.ink, margin: '8px auto 0', maxWidth: 900 }}>
          Sit down. Study. Get up.{' '}
          <em style={{ fontStyle: 'italic', color: p.accent }}>Repeat — kindly.</em>
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28, maxWidth: 1100, margin: '0 auto' }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            background: p.bg, padding: '28px 24px', borderRadius: 14,
            border: `2px solid ${p.ink}`, boxShadow: `5px 5px 0 ${p.ink}`,
            transform: `rotate(${[-1.5, 1, -1][i]}deg)`,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 99, background: s.color, color: p.ink,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Fraunces', Georgia, serif", fontStyle: 'italic', fontSize: 28, fontWeight: 500,
              border: `2px solid ${p.ink}`, marginBottom: 16,
            }}>{s.n}</div>
            <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: 22, lineHeight: 1.1, color: p.ink, margin: '0 0 10px' }}>{s.t}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: `${p.ink}CC`, margin: 0 }}>{s.b}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const Personas = ({ p }: { p: Palette }) => {
  const personas = [
    { who: 'The cramming undergrad', line: 'Finals in 9 days. StudyCouch reverse-plans backwards from Thursday.', color: p.yellow },
    { who: 'The pre-med',            line: 'Anki-flavored cards built from chapter notes — auto.',              color: p.pink },
    { who: 'The returning learner',  line: 'Back in school at 32. Gentle pace, no leaderboard, no shame.',      color: p.green },
    { who: 'The procrastinator',     line: 'The shield blocks the apps. The timer ticks. Somehow, it works.',  color: p.accent },
  ];
  return (
    <section id="foryou" style={{ padding: '100px 48px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 48, alignItems: 'start', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ position: 'sticky', top: 100 }}>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 26, color: p.accent }}>for you, probably</div>
          <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 'clamp(36px,4.5vw,56px)', lineHeight: 1.02, letterSpacing: '-0.025em', color: p.ink, margin: '8px 0 20px' }}>
            For how <em style={{ fontStyle: 'italic', color: p.accent }}>students actually study</em> — chaotically, in 40-minute bursts, on the couch.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: `${p.ink}B3`, maxWidth: 400 }}>
            We tested with 600 students across three semesters. People don't need another productivity guilt-trip. They need a soft place to land and a gentle nudge.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
          {personas.map((x, i) => (
            <div key={i} style={{
              background: p.paper, padding: 14, borderRadius: 6,
              border: `2px solid ${p.ink}`, boxShadow: `5px 6px 0 ${p.ink}`,
              transform: `rotate(${[-3, 2, -2, 3][i]}deg)`,
            }}>
              <div style={{ height: 120, background: x.color, borderRadius: 4, position: 'relative', overflow: 'hidden', border: `1px solid ${p.ink}` }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces', Georgia, serif", fontStyle: 'italic', fontSize: 72, color: textOn(x.color), opacity: 0.85 }}>
                  {x.who.split(' ').slice(-1)[0][0]}
                </div>
              </div>
              <div style={{ paddingTop: 10 }}>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 18, color: p.ink, lineHeight: 1.1 }}>{x.who}</div>
                <div style={{ fontFamily: "'Caveat', cursive", fontSize: 16, color: `${p.ink}B3`, marginTop: 6, lineHeight: 1.2 }}>{x.line}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Quotes = ({ p }: { p: Palette }) => {
  const qs = [
    { q: 'I used to study by opening five tabs and crying. Now I sit on the couch.', a: 'Maya · Junior, Biology', color: p.yellow },
    { q: 'The AI explains things like my smart older sister, not like a textbook.', a: 'Devan · Sophomore, CS', color: p.pink },
    { q: "First app I've used that doesn't make me feel bad for closing it.", a: 'Priya · Graduate student', color: p.green },
  ];
  return (
    <section style={{ padding: '100px 48px', background: p.ink, position: 'relative', overflow: 'hidden' }}>
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 26, color: p.yellow }}>from the couch</div>
        <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 'clamp(36px,5.5vw,64px)', lineHeight: 1.02, letterSpacing: '-0.025em', color: p.bg, margin: '8px auto 0', maxWidth: 800 }}>
          What students say after one <em style={{ fontStyle: 'italic', color: p.yellow }}>semester</em>.
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
        {qs.map((x, i) => (
          <div key={i} style={{ transform: `rotate(${[-2, 1.5, -1][i]}deg)` }}>
            <div style={{ background: x.color, color: textOn(x.color), padding: '26px 26px 30px', borderRadius: '20px 20px 20px 4px', border: `2px solid ${p.bg}`, boxShadow: `6px 6px 0 ${p.accent}` }}>
              <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: 'italic', fontWeight: 400, fontSize: 22, lineHeight: 1.25, letterSpacing: '-0.01em' }}>"{x.q}"</div>
            </div>
            <div style={{ fontSize: 13, color: `${p.bg}99`, marginTop: 14, marginLeft: 12 }}>— {x.a}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

// ── Pricing ───────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'free',
    name: 'Couch',
    price: 'Free',
    priceNote: 'forever, no asterisk.',
    features: [
      'Focus timer + 6 soundscapes',
      '10 AI buddy chats / week',
      'Manual flashcards',
      'Solo study rooms',
    ],
    cta: 'Start free →',
    featured: false,
  },
  {
    id: 'plus',
    name: 'Couch+',
    price: '$6',
    priceNote: '/mo, billed yearly · $4 with student ID',
    features: [
      'Everything in Couch',
      'Unlimited AI buddy',
      'Auto flashcards from any file',
      'Distraction shield',
      'Group rooms (up to 8)',
      'Weekly progress report',
    ],
    cta: 'Get Couch+ →',
    featured: true,
  },
  {
    id: 'group',
    name: 'Study group',
    price: '$4',
    priceNote: '/person/mo · min 4 people',
    features: [
      'Everything in Couch+',
      'Shared decks & notes',
      'Group analytics',
      'Group goals & cheers',
    ],
    cta: 'Set up group →',
    featured: false,
  },
] as const;

const Pricing = ({ p, onRegister }: { p: Palette; onRegister: () => void }) => (
  <section id="pricing" style={{ padding: '100px 48px', background: p.bg, borderTop: `2px solid ${p.ink}` }}>
    <div style={{ textAlign: 'center', marginBottom: 64 }}>
      <div style={{ fontFamily: "'Caveat', cursive", fontSize: 26, color: p.accent, marginBottom: 4 }}>pricing</div>
      <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 1.05, letterSpacing: '-0.03em', color: p.ink, margin: '8px auto 0', maxWidth: 900 }}>
        Free for the basics.{' '}
        <em style={{ fontStyle: 'italic', color: p.accent }}>
          Less than a{' '}
          <Marker color={p.yellow}>coffee</Marker>
        </em>
        {' '}for the rest.
      </h2>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
      {PLANS.map((plan) => (
        <div key={plan.id} style={{
          background: plan.featured ? p.ink : p.paper,
          color: plan.featured ? p.bg : p.ink,
          border: `2px solid ${p.ink}`,
          borderRadius: 18,
          padding: '32px 28px',
          boxShadow: plan.featured ? `5px 6px 0 ${p.accent}` : `5px 6px 0 ${p.ink}`,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {plan.featured && (
            <div style={{
              position: 'absolute', top: -16, right: 24,
              background: p.yellow, color: p.ink,
              fontFamily: "'Caveat', cursive", fontSize: 16, fontWeight: 700,
              padding: '4px 16px', borderRadius: 999,
              border: `2px solid ${p.ink}`,
              transform: 'rotate(-2deg)',
            }}>most chosen!</div>
          )}

          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: 22, marginBottom: 8 }}>
            {plan.name}
          </div>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 'clamp(52px, 5vw, 68px)', lineHeight: 1, letterSpacing: '-0.04em', marginBottom: 6 }}>
            {plan.price}
          </div>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 16, opacity: 0.65, marginBottom: 28 }}>
            {plan.priceNote}
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {plan.features.map((f) => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, lineHeight: 1.45 }}>
                <span style={{ color: plan.featured ? p.yellow : p.accent, fontWeight: 700, flexShrink: 0 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onRegister}
            style={{
              background: plan.featured ? p.accent : 'transparent',
              color: plan.featured ? p.bg : p.ink,
              border: `2px solid ${plan.featured ? p.accent : p.ink}`,
              borderRadius: 999,
              padding: '13px 20px',
              fontSize: 15, fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: plan.featured ? `3px 4px 0 ${p.yellow}` : `3px 4px 0 ${p.ink}`,
            }}
          >{plan.cta}</button>
        </div>
      ))}
    </div>
  </section>
);

const FinalCTA = ({ p, onBack, onRegister }: { p: Palette; onBack?: () => void; onRegister: () => void }) => (
  <section style={{ padding: '100px 48px', background: p.paper, textAlign: 'center', position: 'relative', overflow: 'hidden', borderTop: `2px solid ${p.ink}` }}>
    <Sparkle color={p.accent} size={36} style={{ position: 'absolute', left: '10%', top: 80 }} />
    <Sparkle color={p.yellow} size={24} style={{ position: 'absolute', right: '12%', top: 60 }} />
    <div style={{ fontFamily: "'Caveat', cursive", fontSize: 30, color: p.accent }}>one more thing</div>
    <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 'clamp(52px,8vw,100px)', lineHeight: 0.97, letterSpacing: '-0.04em', color: p.ink, margin: '16px auto 28px', maxWidth: 1000 }}>
      Your couch is{' '}<em style={{ fontStyle: 'italic', color: p.accent }}><Marker color={p.yellow}>warm</Marker></em>,<br />
      your textbook is <em style={{ fontStyle: 'italic', color: p.accent }}>open</em>.
    </h2>
    <p style={{ fontSize: 18, color: `${p.ink}B3`, maxWidth: 480, margin: '0 auto 32px' }}>
      Start a free session. We'll be there in about four seconds.
    </p>
    <div style={{ display: 'inline-flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
      {onBack ? (
        <button type="button" onClick={onBack} style={{
          background: p.accent, color: p.bg, border: `2px solid ${p.ink}`,
          padding: '14px 26px', borderRadius: 999, fontSize: 16, fontWeight: 700,
          cursor: 'pointer', boxShadow: `5px 5px 0 ${p.ink}`, fontFamily: 'inherit',
        }}>← Back to app</button>
      ) : (
        <button type="button" onClick={onRegister} style={{
          background: p.accent, color: p.bg, border: `2px solid ${p.ink}`,
          padding: '14px 26px', borderRadius: 999, fontSize: 16, fontWeight: 700,
          cursor: 'pointer', boxShadow: `5px 5px 0 ${p.ink}`, transform: 'rotate(-1.5deg)',
          fontFamily: 'inherit',
        }}>Start studying free ★</button>
      )}
    </div>
  </section>
);

const Footer = ({ p }: { p: Palette }) => (
  <footer style={{ padding: '28px 48px', borderTop: `1px solid ${p.ink}18`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: `${p.ink}99`, fontFamily: "'Caveat', cursive", fontSize: 16 }}>
    <div>© 2026 StudyCouch · made between classes ✺</div>
    <div style={{ display: 'flex', gap: 20 }}>
      {['twitter', 'instagram', 'tiktok', 'contact'].map((x) => (
        <a key={x} href="#" style={{ color: `${p.ink}99`, textDecoration: 'underline' }}>{x}</a>
      ))}
    </div>
  </footer>
);

// ── Theme Switcher (floating, bottom-left) ────────────────────────────────────

const ThemeSwitcher = ({ palette, setPalette, p }: { palette: PaletteId; setPalette: (id: PaletteId) => void; p: Palette }) => {
  const [open, setOpen] = useState(false);
  const themes = Object.keys(PALETTES) as PaletteId[];
  return (
    <div style={{
      position: 'fixed', left: 20, bottom: 20, zIndex: 200,
      display: 'flex', alignItems: 'center', gap: 10,
      background: p.paper, padding: open ? '10px 12px 10px 14px' : '10px 14px',
      borderRadius: 999, border: `2px solid ${p.ink}`, boxShadow: `4px 4px 0 ${p.ink}`,
      fontFamily: "'DM Sans', ui-sans-serif, sans-serif",
      transition: 'all 200ms ease',
    }}>
      <span style={{ fontFamily: "'Caveat', cursive", fontSize: 17, color: p.ink, lineHeight: 1 }}>theme:</span>
      {open ? (
        <>
          {themes.map((id) => {
            const th = PALETTES[id];
            const isActive = palette === id;
            return (
              <button key={id} type="button" onClick={() => setPalette(id)} title={id}
                style={{
                  width: 32, height: 32, padding: 0, borderRadius: '50%',
                  border: `2px solid ${p.ink}`,
                  background: `conic-gradient(${th.bg} 0 33%, ${th.accent} 33% 66%, ${th.yellow} 66% 100%)`,
                  cursor: 'pointer', position: 'relative',
                  outline: isActive ? `3px solid ${p.accent}` : 'none',
                  outlineOffset: isActive ? 3 : 0,
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 150ms ease',
                }}>
                {isActive && (
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: th.ink, fontSize: 13, fontWeight: 700 }}>✓</span>
                )}
              </button>
            );
          })}
          <button type="button" onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: `${p.ink}88`, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
        </>
      ) : (
        <button type="button" onClick={() => setOpen(true)} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, padding: 0,
          fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: p.ink,
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%',
            background: `conic-gradient(${p.bg} 0 33%, ${p.accent} 33% 66%, ${p.yellow} 66% 100%)`,
            border: `1.5px solid ${p.ink}`, display: 'inline-block',
          }} />
          {palette}
        </button>
      )}
    </div>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────

export default function StudyCouchCoverPage({ onLogin, onRegister, onBack, palette, setPalette, onFeature }: StudyCouchCoverPageProps) {
  const p = PALETTES[palette];

  function handleFeatureClick(featureId: string) {
    if (IMPLEMENTED.has(featureId) && onFeature) {
      onFeature(featureId);
    } else if (IMPLEMENTED.has(featureId) && !onFeature) {
      onRegister();
    } else {
      onFeature?.(featureId) ?? (window as Window & { __tbcFeature?: string }).__tbcFeature;
      // for unauthenticated: dispatch a custom event that App can catch
      window.dispatchEvent(new CustomEvent('studycouch:tbc', { detail: featureId }));
    }
  }

  return (
    <div style={{ fontFamily: "'DM Sans', ui-sans-serif, sans-serif", background: p.bg, color: p.ink, minHeight: '100vh' }}>
      <Nav p={p} onBack={onBack} onLogin={onLogin} onRegister={onRegister} />
      <Hero p={p} onBack={onBack} onRegister={onRegister} onLogin={onLogin} />
      <Marquee p={p} />
      <StudyWall p={p} onFeatureClick={handleFeatureClick} />
      <LiveStrip p={p} />
      <HowItWorks p={p} />
      <Personas p={p} />
      <Quotes p={p} />
      <Pricing p={p} onRegister={onRegister} />
      <FinalCTA p={p} onBack={onBack} onRegister={onRegister} />
      <Footer p={p} />
      <ThemeSwitcher palette={palette} setPalette={setPalette} p={p} />
    </div>
  );
}
