import type { Palette } from '@/lib/theme';

const FEATURE_COPY: Record<string, { title: string; tag: string; eta: string }> = {
  'focus-timer':        { title: 'Focus Timer',        tag: 'Pomodoro, but cozy.',               eta: 'Coming in v2' },
  'ai-buddy':           { title: 'AI Study Buddy',     tag: 'A patient tutor, next cushion over.', eta: 'Coming in v2' },
  'flashcards':         { title: 'Smart Flashcards',   tag: 'Spaced repetition that learns you.',  eta: 'Coming in v3' },
  'notes':              { title: 'Notes & Summaries',  tag: 'Long lecture in. One page out.',      eta: 'Coming in v3' },
  'study-rooms':        { title: 'Study Rooms',        tag: 'Co-work with your group, virtually.', eta: 'Coming in v4' },
  'distraction-shield': { title: 'Distraction Shield', tag: 'Goodbye, TikTok hole.',              eta: 'Coming in v3' },
};

interface ToBeContiedProps {
  featureId: string;
  palette: Palette;
  onBack: () => void;
}

export default function ToBeContined({ featureId, palette: p, onBack }: ToBeContiedProps) {
  const copy = FEATURE_COPY[featureId] ?? { title: featureId, tag: 'Something cozy is cooking.', eta: 'Coming soon' };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: p.bg, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', ui-sans-serif, sans-serif",
      padding: '2rem',
    }}>
      {/* back */}
      <button
        type="button"
        onClick={onBack}
        style={{
          position: 'absolute', top: 24, left: 24,
          background: p.paper, border: `2px solid ${p.ink}`,
          boxShadow: `3px 3px 0 ${p.ink}`, borderRadius: 999,
          color: p.ink, fontWeight: 600, fontSize: 14,
          padding: '7px 18px', cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >← Back</button>

      {/* card */}
      <div style={{
        background: p.paper, border: `2px solid ${p.ink}`,
        boxShadow: `8px 10px 0 ${p.ink}`, borderRadius: 18,
        padding: '48px 56px', maxWidth: 560, width: '100%', textAlign: 'center',
        position: 'relative',
      }}>
        {/* eta badge */}
        <div style={{
          position: 'absolute', top: -18, right: 24,
          background: p.yellow, color: p.ink,
          fontFamily: "'Caveat', cursive", fontSize: 20, fontWeight: 700,
          padding: '6px 18px', borderRadius: 999,
          border: `2px solid ${p.ink}`, transform: 'rotate(4deg)',
        }}>{copy.eta}</div>

        {/* construction sticker */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: p.yellow, border: `3px solid ${p.ink}`,
          boxShadow: `4px 4px 0 ${p.ink}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, margin: '0 auto 28px',
        }}>🔨</div>

        <h1 style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600,
          lineHeight: 1.05, letterSpacing: '-0.025em',
          color: p.ink, margin: '0 0 12px',
        }}>{copy.title}</h1>

        <p style={{
          fontFamily: "'Caveat', cursive", fontSize: 22,
          color: p.accent, margin: '0 0 24px',
        }}>{copy.tag}</p>

        <p style={{
          fontSize: 16, lineHeight: 1.6,
          color: `${p.ink}CC`, margin: '0 0 36px',
        }}>
          We're building this feature right now. StudyCouch is growing one cozy tool at a time —
          check back soon, or keep studying while you wait.
        </p>

        <button
          type="button"
          onClick={onBack}
          style={{
            background: p.accent, color: p.bg,
            border: `2px solid ${p.ink}`, boxShadow: `4px 5px 0 ${p.ink}`,
            borderRadius: 999, padding: '13px 28px',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >Back to studying →</button>
      </div>

      {/* decorative sparkles */}
      <svg width="28" height="28" viewBox="0 0 20 20"
        style={{ position: 'absolute', top: '15%', left: '12%', opacity: 0.4 }}>
        <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z" fill={p.accent} />
      </svg>
      <svg width="18" height="18" viewBox="0 0 20 20"
        style={{ position: 'absolute', bottom: '20%', right: '15%', opacity: 0.35 }}>
        <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z" fill={p.yellow} />
      </svg>
    </div>
  );
}
