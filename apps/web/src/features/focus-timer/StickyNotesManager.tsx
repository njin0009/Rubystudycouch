import { useCallback, useEffect, useState } from 'react';
import { motion, useDragControls, useMotionValue } from 'framer-motion';
import './sticky-notes.css';

// ── Types ─────────────────────────────────────────────────────────────────────

const NOTE_COLORS = ['yellow', 'pink', 'mint', 'blue'] as const;
type NoteColor = typeof NOTE_COLORS[number];

interface StickyNote {
  id: string;
  content: string;
  x: number;
  y: number;
  color: NoteColor;
}

const LS_KEY = 'studycouch_sticky_notes';

const COLOR_CLASS: Record<NoteColor, string> = {
  yellow: 'sn-yellow',
  pink:   'sn-pink',
  mint:   'sn-mint',
  blue:   'sn-blue',
};

// ── Persistence ───────────────────────────────────────────────────────────────

function loadNotes(): StickyNote[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as StickyNote[]; }
  catch { return []; }
}

function persist(notes: StickyNote[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(notes));
  window.dispatchEvent(new CustomEvent('studycouch:notes-updated'));
}

// ── Single note card ──────────────────────────────────────────────────────────

interface NoteCardProps {
  note: StickyNote;
  onContent: (id: string, content: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onColor: (id: string, color: NoteColor) => void;
}

function NoteCard({ note, onContent, onMove, onDelete, onColor }: NoteCardProps) {
  const dragControls = useDragControls();
  // Motion values hold absolute position — no React state reconciliation fight
  const mx = useMotionValue(note.x);
  const my = useMotionValue(note.y);

  return (
    <motion.div
      className={`sn-note ${COLOR_CLASS[note.color]}`}
      style={{ position: 'fixed', left: 0, top: 0, x: mx, y: my }}
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      onDragEnd={() => onMove(note.id, mx.get(), my.get())}
    >
      {/* Drag handle */}
      <div
        className="sn-handle"
        onPointerDown={e => dragControls.start(e)}
      >
        <div className="sn-color-row">
          {NOTE_COLORS.map(c => (
            <button
              key={c}
              type="button"
              className={`sn-color-dot sn-color-dot--${c}${note.color === c ? ' sn-color-dot--active' : ''}`}
              onClick={() => onColor(note.id, c)}
              aria-label={`Note color: ${c}`}
            />
          ))}
        </div>
        <button
          type="button"
          className="sn-close"
          onClick={() => onDelete(note.id)}
          aria-label="Delete note"
        >×</button>
      </div>

      {/* Content */}
      <textarea
        className="sn-textarea"
        value={note.content}
        placeholder="Write something…"
        onChange={e => onContent(note.id, e.target.value)}
      />
    </motion.div>
  );
}

// ── Manager ───────────────────────────────────────────────────────────────────

export default function StickyNotesManager() {
  const [notes, setNotes] = useState<StickyNote[]>(loadNotes);

  const updateNotes = useCallback((next: StickyNote[]) => {
    setNotes(next);
    persist(next);
  }, []);

  // Listen for events from FocusTimerWidget
  useEffect(() => {
    let colorIdx = notes.length % NOTE_COLORS.length;

    const handleNew = () => {
      const x = window.innerWidth / 2 - 110 + (Math.random() - 0.5) * 100;
      const y = window.innerHeight / 2 - 100 + (Math.random() - 0.5) * 80;
      const newNote: StickyNote = {
        id: Date.now().toString(),
        content: '',
        x, y,
        color: NOTE_COLORS[colorIdx % NOTE_COLORS.length],
      };
      colorIdx++;
      setNotes(prev => {
        const next = [...prev, newNote];
        persist(next);
        return next;
      });
    };

    const handleClear = () => updateNotes([]);

    window.addEventListener('studycouch:new-note',    handleNew);
    window.addEventListener('studycouch:clear-notes', handleClear);
    return () => {
      window.removeEventListener('studycouch:new-note',    handleNew);
      window.removeEventListener('studycouch:clear-notes', handleClear);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateNotes]);

  const handleContent = useCallback((id: string, content: string) => {
    setNotes(prev => {
      const next = prev.map(n => n.id === id ? { ...n, content } : n);
      persist(next);
      return next;
    });
  }, []);

  const handleMove = useCallback((id: string, x: number, y: number) => {
    setNotes(prev => {
      const next = prev.map(n => n.id === id ? { ...n, x, y } : n);
      persist(next);
      return next;
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const handleColor = useCallback((id: string, color: NoteColor) => {
    setNotes(prev => {
      const next = prev.map(n => n.id === id ? { ...n, color } : n);
      persist(next);
      return next;
    });
  }, []);

  return (
    <>
      {notes.map(note => (
        <NoteCard
          key={note.id}
          note={note}
          onContent={handleContent}
          onMove={handleMove}
          onDelete={handleDelete}
          onColor={handleColor}
        />
      ))}
    </>
  );
}
