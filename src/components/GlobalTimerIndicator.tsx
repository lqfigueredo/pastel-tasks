import { useTimer } from '@/contexts/TimerContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, Clock, Check } from 'lucide-react';

const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const GlobalTimerIndicator = () => {
  const { timerState, secondsLeft, pause, resume, stop } = useTimer();
  const navigate = useNavigate();

  if (timerState === 'idle') return null;

  return (
    <div className="flex items-center gap-1.5">
      {timerState === 'finished' ? (
        <button
          onClick={() => navigate('/temporizador')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
        >
          <Check className="h-3.5 w-3.5" />
          <span>Finalizado!</span>
        </button>
      ) : (
        <>
          <button
            onClick={() => navigate('/temporizador')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-mono font-medium hover:bg-secondary/80 transition-colors"
          >
            <Clock className="h-3.5 w-3.5 animate-pulse text-primary" />
            <span>{formatTime(secondsLeft)}</span>
          </button>
          {timerState === 'running' ? (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={pause}>
              <Pause className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resume}>
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={stop}>
            <Square className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
};

export default GlobalTimerIndicator;
