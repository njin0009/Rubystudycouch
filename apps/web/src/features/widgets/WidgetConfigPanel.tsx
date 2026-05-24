import { useState } from 'react';
import {
  WIDGET_REGISTRY,
  saveWidgetsConfig,
  sortedAll,
  type WidgetDef,
  type WidgetsConfig,
} from './widgetSystem';

interface Props {
  config: WidgetsConfig;
  onConfigChange: (cfg: WidgetsConfig) => void;
}

export default function WidgetConfigPanel({ config, onConfigChange }: Props) {
  // Local order state — array of widget IDs in display order
  const [order, setOrder] = useState<string[]>(() =>
    sortedAll(config).map(d => d.id)
  );
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const defById = Object.fromEntries(WIDGET_REGISTRY.map(d => [d.id, d]));

  // Reorder: swap dragged and target
  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) { setDraggedId(null); setOverId(null); return; }
    const next = [...order];
    const fromIdx = next.indexOf(draggedId);
    const toIdx   = next.indexOf(targetId);
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, draggedId);
    setOrder(next);
    setDraggedId(null);
    setOverId(null);
    // Persist new order
    const updated = { ...config };
    next.forEach((id, i) => { if (updated[id]) updated[id] = { ...updated[id], order: i }; });
    saveWidgetsConfig(updated);
    onConfigChange(updated);
  };

  const toggleEnabled = (id: string) => {
    const wasEnabled = config[id]?.enabled;
    const updated = {
      ...config,
      [id]: { ...config[id], enabled: !wasEnabled, open: !wasEnabled },
    };
    saveWidgetsConfig(updated);
    onConfigChange(updated);
  };

  return (
    <section className="wc-panel">
      <h3 className="wc-title">My Widgets</h3>
      <p className="wc-sub">Drag cards to reorder. Toggle to show or hide on the page.</p>

      <div className="wc-grid">
        {order.map(id => {
          const def: WidgetDef = defById[id];
          if (!def) return null;
          const inst = config[id];
          const isOn = inst?.enabled ?? false;
          const isDragging = draggedId === id;
          const isOver = overId === id;

          return (
            <div
              key={id}
              className={`wc-card${isOn ? ' wc-card--on' : ''}${isDragging ? ' wc-card--dragging' : ''}${isOver ? ' wc-card--over' : ''}`}
              draggable
              onDragStart={() => setDraggedId(id)}
              onDragOver={e => { e.preventDefault(); setOverId(id); }}
              onDragLeave={() => setOverId(null)}
              onDrop={() => handleDrop(id)}
              onDragEnd={() => { setDraggedId(null); setOverId(null); }}
            >
              <div className="wc-card-grip">⠿</div>
              <div className="wc-card-icon">{def.icon}</div>
              <div className="wc-card-info">
                <div className="wc-card-title">{def.title}</div>
                <div className="wc-card-desc">{def.desc}</div>
              </div>
              <button
                type="button"
                className={`wc-toggle${isOn ? ' wc-toggle--on' : ''}`}
                onClick={() => toggleEnabled(id)}
                aria-label={isOn ? 'Disable' : 'Enable'}
              >
                <span className="wc-toggle-knob" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
