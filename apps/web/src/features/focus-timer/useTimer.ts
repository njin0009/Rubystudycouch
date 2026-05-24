import { useCallback, useEffect, useRef, useState } from 'react';

export const PRESET_WORK_MINS = [15, 25, 50, 90] as const;
export type PresetMins = typeof PRESET_WORK_MINS[number];

export type Phase = 'work' | 'short-break' | 'long-break';
export type Mode = 'pomodoro' | 'custom';
export type Status = 'idle' | 'running' | 'paused';

export interface TimerState {
  mode: Mode;
  status: Status;
  phase: Phase;
  secondsLeft: number;
  pomodoroCount: number;
  workMins: PresetMins;    // Pomodoro preset
  customMinutes: number;
  endTime: number | null;
}

const LS_KEY = 'studycouch_focus_timer_state';

function shortBreakSecs(workMins: number): number {
  if (workMins <= 15) return 3 * 60;
  if (workMins <= 25) return 5 * 60;
  if (workMins <= 50) return 10 * 60;
  return 15 * 60;
}
function longBreakSecs(workMins: number): number {
  if (workMins <= 15) return 10 * 60;
  if (workMins <= 25) return 15 * 60;
  if (workMins <= 50) return 20 * 60;
  return 30 * 60;
}

function secsForPhase(phase: Phase, workMins: number): number {
  if (phase === 'work') return workMins * 60;
  if (phase === 'short-break') return shortBreakSecs(workMins);
  return longBreakSecs(workMins);
}

function defaultState(): TimerState {
  return {
    mode: 'pomodoro', status: 'idle', phase: 'work',
    secondsLeft: 25 * 60, pomodoroCount: 0,
    workMins: 25, customMinutes: 30, endTime: null,
  };
}

function loadState(): TimerState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw) as TimerState;
    if (!PRESET_WORK_MINS.includes(s.workMins as PresetMins)) s.workMins = 25;
    if (s.status === 'running' && s.endTime != null) {
      const rem = Math.max(0, Math.round((s.endTime - Date.now()) / 1000));
      s.secondsLeft = rem;
      if (rem === 0) { s.status = 'idle'; s.endTime = null; }
    }
    return s;
  } catch { return defaultState(); }
}

export function useTimer(onExpire: () => void) {
  const [state, setState] = useState<TimerState>(loadState);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(state)); }, [state]);

  useEffect(() => {
    if (state.status !== 'running') return;
    const id = setInterval(() => {
      setState(prev => {
        if (prev.status !== 'running' || prev.endTime == null) return prev;
        const secs = Math.max(0, Math.round((prev.endTime - Date.now()) / 1000));
        if (secs > 0) return { ...prev, secondsLeft: secs };
        onExpireRef.current();
        if (prev.mode === 'pomodoro') {
          if (prev.phase === 'work') {
            const newCount = (prev.pomodoroCount + 1) % 4;
            const nextPhase: Phase = newCount === 0 ? 'long-break' : 'short-break';
            return { ...prev, status: 'idle', phase: nextPhase, pomodoroCount: newCount, secondsLeft: secsForPhase(nextPhase, prev.workMins), endTime: null };
          }
          return { ...prev, status: 'idle', phase: 'work', secondsLeft: secsForPhase('work', prev.workMins), endTime: null };
        }
        return { ...prev, status: 'idle', secondsLeft: 0, endTime: null };
      });
    }, 500);
    return () => clearInterval(id);
  }, [state.status]);

  const start = useCallback(() => {
    setState(prev => {
      if (prev.status === 'running') return prev;
      const secs = prev.status === 'paused' ? prev.secondsLeft
        : prev.mode === 'pomodoro' ? secsForPhase(prev.phase, prev.workMins)
        : prev.customMinutes * 60;
      return { ...prev, status: 'running', secondsLeft: secs, endTime: Date.now() + secs * 1000 };
    });
  }, []);

  const pause = useCallback(() => {
    setState(prev => prev.status !== 'running' ? prev : { ...prev, status: 'paused', endTime: null });
  }, []);

  const reset = useCallback(() => {
    setState(prev => {
      const secs = prev.mode === 'pomodoro' ? secsForPhase(prev.phase, prev.workMins) : prev.customMinutes * 60;
      return { ...prev, status: 'idle', secondsLeft: secs, endTime: null };
    });
  }, []);

  const setMode = useCallback((mode: Mode) => {
    setState(prev => mode === 'pomodoro'
      ? { ...prev, mode, status: 'idle', phase: 'work', secondsLeft: secsForPhase('work', prev.workMins), pomodoroCount: 0, endTime: null }
      : { ...prev, mode, status: 'idle', secondsLeft: prev.customMinutes * 60, endTime: null }
    );
  }, []);

  const setWorkMins = useCallback((mins: PresetMins) => {
    setState(prev => ({
      ...prev, workMins: mins, status: 'idle', phase: 'work',
      secondsLeft: secsForPhase('work', mins), pomodoroCount: 0, endTime: null,
    }));
  }, []);

  const setCustomMinutes = useCallback((mins: number) => {
    setState(prev => ({ ...prev, customMinutes: mins, secondsLeft: mins * 60, status: 'idle', endTime: null }));
  }, []);

  const skipPhase = useCallback(() => {
    setState(prev => {
      if (prev.mode !== 'pomodoro') return prev;
      if (prev.phase === 'work') {
        const newCount = (prev.pomodoroCount + 1) % 4;
        const nextPhase: Phase = newCount === 0 ? 'long-break' : 'short-break';
        return { ...prev, status: 'idle', phase: nextPhase, pomodoroCount: newCount, secondsLeft: secsForPhase(nextPhase, prev.workMins), endTime: null };
      }
      return { ...prev, status: 'idle', phase: 'work', secondsLeft: secsForPhase('work', prev.workMins), endTime: null };
    });
  }, []);

  return { state, start, pause, reset, setMode, setWorkMins, setCustomMinutes, skipPhase };
}
