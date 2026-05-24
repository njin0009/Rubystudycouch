import { useState } from 'react';
import {
  WIDGET_REGISTRY,
  loadWidgetsConfig,
  saveWidgetsConfig,
  sortedEnabled,
  sortedAll,
  type WidgetsConfig,
} from './widgetSystem';

interface Props {
  config: WidgetsConfig;
  onConfigChange: (cfg: WidgetsConfig) => void;
}

export default function WidgetLauncher({ config, onConfigChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const toggleOpen = (id: string) => {
    const next = { ...config, [id]: { ...config[id], open: !config[id].open } };
    saveWidgetsConfig(next);
    onConfigChange(next);
  };

  const toggleEnabled = (id: string) => {
    const wasEnabled = config[id]?.enabled;
    const next = {
      ...config,
      [id]: { ...config[id], enabled: !wasEnabled, open: !wasEnabled },
    };
    saveWidgetsConfig(next);
    onConfigChange(next);
  };

  const enabled = sortedEnabled(config);
  const all = sortedAll(config);

  return (
    <div className="wl-root">
      {/* Picker panel — appears above the launcher */}
      {pickerOpen && (
        <div className="wl-picker">
          <div className="wl-picker-title">My Widgets</div>
          {all.map(def => {
            const inst = config[def.id];
            return (
              <div key={def.id} className="wl-picker-row">
                <span className="wl-picker-icon">{def.icon}</span>
                <span className="wl-picker-name">{def.title}</span>
                <button
                  type="button"
                  className={`wl-toggle${inst?.enabled ? ' wl-toggle--on' : ''}`}
                  onClick={() => toggleEnabled(def.id)}
                  aria-label={inst?.enabled ? 'Disable widget' : 'Enable widget'}
                >
                  <span className="wl-toggle-knob" />
                </button>
              </div>
            );
          })}
          <div className="wl-picker-hint">Arrange widgets in Profile → My Widgets</div>
        </div>
      )}

      {/* Launcher pill */}
      <div className="wl-pill">
        {enabled.map(def => (
          <button
            key={def.id}
            type="button"
            className={`wl-icon-btn${config[def.id]?.open ? ' wl-icon-btn--active' : ''}`}
            onClick={() => toggleOpen(def.id)}
            title={def.title}
            aria-label={def.title}
          >
            {def.icon}
          </button>
        ))}
        {enabled.length > 0 && <div className="wl-pill-divider" />}
        <button
          type="button"
          className={`wl-add-btn${pickerOpen ? ' wl-add-btn--open' : ''}`}
          onClick={() => setPickerOpen(o => !o)}
          aria-label="Manage widgets"
          title="Manage widgets"
        >
          {pickerOpen ? '×' : '+'}
        </button>
      </div>
    </div>
  );
}

// Re-export helper so App can initialise config once
export { loadWidgetsConfig, saveWidgetsConfig };
