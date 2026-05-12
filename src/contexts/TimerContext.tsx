import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from 'react';

type TimerState = 'idle' | 'running' | 'paused' | 'finished';

interface TimerContextType {
  timerState: TimerState;
  secondsLeft: number;
  elapsedSeconds: number;
  minutes: number;
  totalSeconds: number;
  setMinutes: (m: number) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  finish: (description: string) => { duration: number };
  cancel: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

export const useTimer = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
};

const STORAGE_KEY = 'focus-timer-state';

interface PersistedState {
  state: TimerState;
  endAt: number | null;
  pausedRemaining: number | null;
  totalSeconds: number;
  minutes: number;
}

const loadPersisted = (): PersistedState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
};

const savePersisted = (s: PersistedState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

const clearPersisted = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

const playAlertSound = () => {
  const ctx = new AudioContext();
  const playBeep = (time: number, freq: number, dur: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
    osc.start(time);
    osc.stop(time + dur);
  };
  for (let i = 0; i < 5; i++) {
    playBeep(ctx.currentTime + i * 0.4, 880, 0.25);
  }
  return ctx;
};

export const TimerProvider = ({ children }: { children: ReactNode }) => {
  // Restore persisted state once at init
  const initial = (() => {
    const p = loadPersisted();
    if (!p) return null;
    if (p.state === 'running' && p.endAt) {
      if (Date.now() >= p.endAt) {
        return { ...p, state: 'finished' as TimerState, secondsLeft: 0 };
      }
      return { ...p, secondsLeft: Math.ceil((p.endAt - Date.now()) / 1000) };
    }
    if (p.state === 'paused' && p.pausedRemaining != null) {
      return { ...p, secondsLeft: p.pausedRemaining };
    }
    return null;
  })();

  const [minutes, setMinutes] = useState(initial?.minutes ?? 25);
  const [secondsLeft, setSecondsLeft] = useState(initial?.secondsLeft ?? 0);
  const [timerState, setTimerState] = useState<TimerState>(initial?.state ?? 'idle');
  const totalSecondsRef = useRef(initial?.totalSeconds ?? 0);
  const endAtRef = useRef<number | null>(initial?.endAt ?? null);
  const pausedRemainingRef = useRef<number | null>(initial?.pausedRemaining ?? null);
  const intervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const finishedFiredRef = useRef(false);

  const elapsedSeconds = Math.max(0, totalSecondsRef.current - secondsLeft);

  const persist = useCallback(() => {
    savePersisted({
      state: timerState,
      endAt: endAtRef.current,
      pausedRemaining: pausedRemainingRef.current,
      totalSeconds: totalSecondsRef.current,
      minutes,
    });
  }, [timerState, minutes]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const triggerFinish = useCallback(() => {
    if (finishedFiredRef.current) return;
    finishedFiredRef.current = true;
    stopInterval();
    setSecondsLeft(0);
    setTimerState('finished');
    try {
      audioCtxRef.current = playAlertSound();
    } catch {
      /* ignore audio errors */
    }
  }, [stopInterval]);

  const recompute = useCallback(() => {
    if (!endAtRef.current) return;
    const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
    setSecondsLeft(remaining);
    if (remaining <= 0) {
      triggerFinish();
    }
  }, [triggerFinish]);

  const startInterval = useCallback(() => {
    stopInterval();
    intervalRef.current = window.setInterval(recompute, 1000);
  }, [recompute, stopInterval]);

  // Resume ticking on mount if needed
  useEffect(() => {
    if (timerState === 'running' && endAtRef.current) {
      finishedFiredRef.current = false;
      recompute();
      startInterval();
    }
    return () => stopInterval();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Visibility change: recompute immediately when tab becomes active again
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && timerState === 'running') {
        recompute();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [timerState, recompute]);

  // Persist whenever relevant fields change
  useEffect(() => {
    if (timerState === 'idle') {
      clearPersisted();
    } else {
      persist();
    }
  }, [timerState, minutes, persist]);

  const start = useCallback(() => {
    const total = minutes * 60;
    totalSecondsRef.current = total;
    endAtRef.current = Date.now() + total * 1000;
    pausedRemainingRef.current = null;
    finishedFiredRef.current = false;
    setSecondsLeft(total);
    setTimerState('running');
    startInterval();
  }, [minutes, startInterval]);

  const pause = useCallback(() => {
    if (!endAtRef.current) return;
    const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
    pausedRemainingRef.current = remaining;
    endAtRef.current = null;
    setSecondsLeft(remaining);
    stopInterval();
    setTimerState('paused');
  }, [stopInterval]);

  const resume = useCallback(() => {
    const remaining = pausedRemainingRef.current ?? secondsLeft;
    if (remaining <= 0) return;
    endAtRef.current = Date.now() + remaining * 1000;
    pausedRemainingRef.current = null;
    setTimerState('running');
    startInterval();
  }, [secondsLeft, startInterval]);

  const stop = useCallback(() => {
    stopInterval();
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch { /* ignore */ }
      audioCtxRef.current = null;
    }
    endAtRef.current = null;
    pausedRemainingRef.current = null;
    setTimerState('finished');
  }, [stopInterval]);

  const finish = useCallback((_description: string) => {
    const used = (totalSecondsRef.current - secondsLeft) || totalSecondsRef.current;
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch { /* ignore */ }
      audioCtxRef.current = null;
    }
    endAtRef.current = null;
    pausedRemainingRef.current = null;
    totalSecondsRef.current = 0;
    finishedFiredRef.current = false;
    setTimerState('idle');
    setSecondsLeft(0);
    clearPersisted();
    return { duration: used };
  }, [secondsLeft]);

  const cancel = useCallback(() => {
    stopInterval();
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch { /* ignore */ }
      audioCtxRef.current = null;
    }
    endAtRef.current = null;
    pausedRemainingRef.current = null;
    totalSecondsRef.current = 0;
    finishedFiredRef.current = false;
    setTimerState('idle');
    setSecondsLeft(0);
    clearPersisted();
  }, [stopInterval]);

  return (
    <TimerContext.Provider value={{
      timerState, secondsLeft, elapsedSeconds, minutes,
      totalSeconds: totalSecondsRef.current,
      setMinutes, start, pause, resume, stop, finish, cancel,
    }}>
      {children}
    </TimerContext.Provider>
  );
};
