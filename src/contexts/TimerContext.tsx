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
  const [minutes, setMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const totalSecondsRef = useRef(0);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => stopInterval(), [stopInterval]);

  const startInterval = useCallback(() => {
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          stopInterval();
          setTimerState('finished');
          audioCtxRef.current = playAlertSound();
          return 0;
        }
        return prev - 1;
      });
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, [stopInterval]);

  const start = useCallback(() => {
    const total = minutes * 60;
    totalSecondsRef.current = total;
    setSecondsLeft(total);
    setElapsedSeconds(0);
    setTimerState('running');
    startInterval();
  }, [minutes, startInterval]);

  const pause = useCallback(() => {
    stopInterval();
    setTimerState('paused');
  }, [stopInterval]);

  const resume = useCallback(() => {
    setTimerState('running');
    startInterval();
  }, [startInterval]);

  const stop = useCallback(() => {
    stopInterval();
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setTimerState('finished');
  }, [stopInterval]);

  const finish = useCallback((description: string) => {
    const used = elapsedSeconds || totalSecondsRef.current;
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setTimerState('idle');
    setSecondsLeft(0);
    setElapsedSeconds(0);
    return { duration: used };
  }, [elapsedSeconds]);

  const cancel = useCallback(() => {
    stopInterval();
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setTimerState('idle');
    setSecondsLeft(0);
    setElapsedSeconds(0);
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
