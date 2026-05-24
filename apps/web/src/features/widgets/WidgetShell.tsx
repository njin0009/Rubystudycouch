import { type ReactNode } from 'react';
import { motion, useDragControls, useMotionValue } from 'framer-motion';
import { saveWidgetsConfig, loadWidgetsConfig } from './widgetSystem';

interface WidgetShellProps {
  id: string;
  icon: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export default function WidgetShell({ id, icon, title, onClose, children, width = 264 }: WidgetShellProps) {
  const cfg = loadWidgetsConfig();
  const pos = cfg[id]?.position ?? { x: 16, y: 100 };

  const mx = useMotionValue(pos.x);
  const my = useMotionValue(pos.y);
  const dragControls = useDragControls();

  const persistPosition = () => {
    const current = loadWidgetsConfig();
    if (current[id]) {
      current[id].position = { x: mx.get(), y: my.get() };
      saveWidgetsConfig(current);
    }
  };

  return (
    <motion.div
      className="wg-shell"
      style={{ width, position: 'fixed', left: 0, top: 0, x: mx, y: my, zIndex: 124 }}
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      onDragEnd={persistPosition}
    >
      {/* Drag handle / header */}
      <div className="wg-header" onPointerDown={e => dragControls.start(e)}>
        <span className="wg-header-grip">⠿</span>
        <span className="wg-header-icon">{icon}</span>
        <span className="wg-header-title">{title}</span>
        <button type="button" className="wg-close" onClick={onClose} aria-label="Close widget">×</button>
      </div>

      {/* Widget content */}
      <div className="wg-body">
        {children}
      </div>
    </motion.div>
  );
}
