import { useTranslation } from 'react-i18next';
import { CheckCircle2, ArrowRight, Pin, Timer, Calendar, Lightbulb } from 'lucide-react';
import { safeTArray } from '@/i18n/safeT';

const icons = [CheckCircle2, ArrowRight, Pin, Timer, Calendar, Lightbulb];
const colors = [
  'text-green-500',
  'text-blue-500',
  'text-purple-500',
  'text-orange-500',
  'text-yellow-500',
  'text-primary',
];

const TaskMarquee = () => {
  const { t } = useTranslation('landing');
  const labels = safeTArray<string>(t('marquee.items', { returnObjects: true }));
  const items = labels.map((text, i) => ({
    icon: icons[i] ?? CheckCircle2,
    color: colors[i] ?? 'text-primary',
    text,
  }));
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
