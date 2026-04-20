import { CheckCircle2, Clock, User, Calendar, Timer, Lightbulb } from 'lucide-react';

interface FloatingCard {
  icon: typeof CheckCircle2;
  title: string;
  meta: string;
  top: string;
  left: string;
  rotate: string;
  delay: string;
  duration: string;
}

const cards: FloatingCard[] = [
  { icon: CheckCircle2, title: 'Sprint review', meta: 'Concluída', top: '8%', left: '4%', rotate: '-rotate-6', delay: '0s', duration: '22s' },
  { icon: Clock, title: 'Deploy v2.0', meta: 'Hoje 16:00', top: '18%', left: '78%', rotate: 'rotate-3', delay: '-4s', duration: '28s' },
  { icon: User, title: 'Ana Silva', meta: 'Designer', top: '55%', left: '2%', rotate: 'rotate-2', delay: '-8s', duration: '26s' },
  { icon: Calendar, title: 'Reunião 15:00', meta: 'Sprint Planning', top: '68%', left: '82%', rotate: '-rotate-3', delay: '-12s', duration: '24s' },
  { icon: Timer, title: 'Pomodoro', meta: '25:00', top: '38%', left: '88%', rotate: 'rotate-6', delay: '-6s', duration: '30s' },
  { icon: Lightbulb, title: 'Nova ideia', meta: 'Backlog', top: '82%', left: '12%', rotate: '-rotate-2', delay: '-16s', duration: '25s' },
];

const FloatingTasksBackground = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden"
  >
    {cards.map((c, i) => (
      <div
        key={i}
        className={`absolute opacity-[0.10] dark:opacity-[0.08] ${c.rotate} animate-float-slow`}
        style={{
          top: c.top,
          left: c.left,
          animationDelay: c.delay,
          animationDuration: c.duration,
          willChange: 'transform',
        }}
      >
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
            <c.icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-semibold leading-tight whitespace-nowrap">{c.title}</p>
            <p className="text-[9px] text-muted-foreground leading-tight whitespace-nowrap">{c.meta}</p>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default FloatingTasksBackground;
