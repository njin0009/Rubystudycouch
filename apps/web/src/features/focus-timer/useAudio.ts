import { useCallback, useEffect, useRef, useState } from 'react';

export type AmbientSound = 'none' | 'rain' | 'cafe' | 'fireplace' | 'wind' | 'ocean' | 'library' | 'forest';
export type AlertSound = 'bell' | 'chime' | 'beep';

const LS_KEY = 'studycouch_focus_audio';

interface AudioPrefs {
  ambient: AmbientSound;
  ambientVolume: number; // 0–1
  alert: AlertSound;
  notificationsEnabled: boolean;
}

function loadPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as AudioPrefs;
  } catch { /* noop */ }
  return { ambient: 'rain', ambientVolume: 0.4, alert: 'bell', notificationsEnabled: false };
}

// Brown noise base used by all ambient sounds
function makeBrownNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const frames = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < frames; i++) {
    const w = Math.random() * 2 - 1;
    data[i] = (last + 0.02 * w) / 1.02;
    last = data[i];
    data[i] *= 3.5;
  }
  return buf;
}

// Per-sound filter configs — all built on top of brown noise
type BiquadType = BiquadFilterNode['type'];
interface FilterCfg { type: BiquadType; freq: number; Q: number; gainMult: number }

const FILTER_CFG: Record<Exclude<AmbientSound, 'none'>, FilterCfg> = {
  rain:      { type: 'bandpass', freq: 700,   Q: 0.6,  gainMult: 0.28 },
  cafe:      { type: 'bandpass', freq: 1100,  Q: 1.2,  gainMult: 0.28 },
  fireplace: { type: 'lowpass',  freq: 160,   Q: 1.0,  gainMult: 0.30 },
  wind:      { type: 'highpass', freq: 600,   Q: 0.8,  gainMult: 0.22 },
  ocean:     { type: 'bandpass', freq: 260,   Q: 0.22, gainMult: 0.35 },
  library:   { type: 'bandpass', freq: 350,   Q: 5.0,  gainMult: 0.10 },
  forest:    { type: 'bandpass', freq: 460,   Q: 0.45, gainMult: 0.26 },
};

export function useAudio() {
  const [prefs, setPrefs] = useState<AudioPrefs>(loadPrefs);
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);

  const ctxRef    = useRef<AudioContext | null>(null);
  const ambientRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode } | null>(null);
  const prefsRef  = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  function getCtx(): AudioContext {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }

  const stopAmbient = useCallback(() => {
    if (ambientRef.current) {
      try { ambientRef.current.source.stop(); } catch { /* already stopped */ }
      ambientRef.current = null;
    }
    setIsAmbientPlaying(false);
  }, []);

  const startAmbient = useCallback((sound: AmbientSound, volume: number) => {
    if (sound === 'none') { stopAmbient(); return; }

    const ctx = getCtx();
    void ctx.resume();

    if (ambientRef.current) {
      try { ambientRef.current.source.stop(); } catch { /* noop */ }
      ambientRef.current = null;
    }

    const cfg = FILTER_CFG[sound];
    const buf = makeBrownNoise(ctx, 4);
    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = cfg.type;
    filter.frequency.value = cfg.freq;
    filter.Q.value = cfg.Q;

    const gain = ctx.createGain();
    gain.gain.value = volume * cfg.gainMult;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    ambientRef.current = { source, gain };
    setIsAmbientPlaying(true);
  }, [stopAmbient]);

  const toggleAmbient = useCallback(() => {
    if (isAmbientPlaying) {
      stopAmbient();
    } else {
      const { ambient, ambientVolume } = prefsRef.current;
      if (ambient !== 'none') startAmbient(ambient, ambientVolume);
    }
  }, [isAmbientPlaying, stopAmbient, startAmbient]);

  const setAmbient = useCallback((sound: AmbientSound) => {
    setPrefs(p => ({ ...p, ambient: sound }));
    if (sound === 'none') {
      stopAmbient();
    } else {
      startAmbient(sound, prefsRef.current.ambientVolume);
    }
  }, [stopAmbient, startAmbient]);

  const setAmbientVolume = useCallback((vol: number) => {
    setPrefs(p => ({ ...p, ambientVolume: vol }));
    if (ambientRef.current) {
      const cfg = FILTER_CFG[prefsRef.current.ambient as Exclude<AmbientSound, 'none'>];
      ambientRef.current.gain.gain.value = vol * (cfg?.gainMult ?? 0.28);
    }
  }, []);

  const setAlert = useCallback((alert: AlertSound) => {
    setPrefs(p => ({ ...p, alert }));
  }, []);

  const playAlert = useCallback((override?: AlertSound) => {
    const ctx = getCtx();
    void ctx.resume();
    const which = override ?? prefsRef.current.alert;
    const now = ctx.currentTime;

    if (which === 'bell') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 2.5);
    } else if (which === 'chime') {
      ([880, 1108, 1318, 1760] as const).forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = now + i * 0.15;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.28, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 1.6);
      });
    } else {
      // triple beep
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 660;
        const t = now + i * 0.38;
        g.gain.setValueAtTime(0.4, t);
        g.gain.setValueAtTime(0.4, t + 0.18);
        g.gain.linearRampToValueAtTime(0, t + 0.24);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.24);
      }
    }
  }, []);

  const enableNotifications = useCallback(async () => {
    if (!('Notification' in window)) return false;
    const perm = await Notification.requestPermission();
    const enabled = perm === 'granted';
    setPrefs(p => ({ ...p, notificationsEnabled: enabled }));
    return enabled;
  }, []);

  const sendNotification = useCallback((title: string, body: string) => {
    if (prefsRef.current.notificationsEnabled && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }, []);

  return {
    prefs,
    isAmbientPlaying,
    setAmbient,
    setAmbientVolume,
    setAlert,
    playAlert,
    toggleAmbient,
    startAmbient,
    stopAmbient,
    enableNotifications,
    sendNotification,
  };
}
