import { CheckCircle2, ArrowRight, Pin, Timer, Calendar, Lightbulb } from 'lucide-react';

const items = [
  { icon: CheckCircle2, text: 'Sprint review concluída', color: 'text-green-500' },
  { icon: ArrowRight, text: 'Deploy v2.0 em andamento', color: 'text-blue-500' },
  { icon: Pin, text: 'Reunião 15:00 — Sprint Planning', color: 'text-purple-500' },
  { icon: Timer, text: 'Pomodoro 25min iniciado', color: 'text-orange-500' },
  { icon: Calendar, text: 'Entrega Q2 em 3 dias', color: 'text-yellow-500' },
  { icon: Lightbulb, text: 'Nova ideia adicionada ao backlog', color: 'text-primary' },
];

const TaskMarquee = () => {
  const loop = [...items, ...items];
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden border-y border-border/50 bg-muted/20 py-4"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
      <div className="flex w-max gap-3 animate-marquee motion-reduce:animate-none" style={{ willChange: 'transform' }}>
        {loop.map((item, i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium opacity-70"
          >
            <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskMarquee;
