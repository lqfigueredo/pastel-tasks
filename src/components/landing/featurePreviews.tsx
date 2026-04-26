import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Tag,
} from 'lucide-react';

export type FeatureKey =
  | 'kanban'
  | 'team'
  | 'meetings'
  | 'dashboard'
  | 'timer'
  | 'calendar'
  | 'workInstructions'
  | 'ideas';

export const KanbanPreview = () => {
  const { t } = useTranslation('landing');
  const todoCards = t('previews.kanban.cards.todo', { returnObjects: true }) as string[];
  const doingCards = t('previews.kanban.cards.doing', { returnObjects: true }) as string[];
  const doneCards = t('previews.kanban.cards.done', { returnObjects: true }) as string[];

  const cols = [
    { title: t('previews.kanban.columns.todo'), color: 'bg-blue-500', cards: todoCards },
    { title: t('previews.kanban.columns.doing'), color: 'bg-yellow-500', cards: doingCards },
    { title: t('previews.kanban.columns.done'), color: 'bg-green-500', cards: doneCards },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cols.map((col) => (
        <div key={col.title} className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
            <span className="text-sm font-semibold">{col.title}</span>
            <Badge variant="secondary" className="ml-auto text-xs">{col.cards.length}</Badge>
          </div>
          <div className="space-y-2">
            {col.cards.map((card) => (
              <div key={card} className="rounded-md border border-border bg-card p-2.5 text-xs shadow-sm">
                {card}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const TeamPreview = () => {
  const { t } = useTranslation('landing');
  const members = [
    { name: 'Ana Silva', role: t('previews.team.roles.leader'), status: 'online', avatar: 'AS' },
    { name: 'Carlos Souza', role: t('previews.team.roles.developer'), status: 'online', avatar: 'CS' },
    { name: 'Maria Oliveira', role: t('previews.team.roles.designer'), status: 'away', avatar: 'MO' },
    { name: 'Pedro Santos', role: t('previews.team.roles.qa'), status: 'online', avatar: 'PS' },
    { name: 'Julia Costa', role: t('previews.team.roles.po'), status: 'offline', avatar: 'JC' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold">{t('previews.team.title')}</h4>
        <Badge variant="secondary">{t('previews.team.membersCount', { count: members.length })}</Badge>
      </div>
      {members.map((m) => (
        <div key={m.name} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{m.avatar}</div>
            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${m.status === 'online' ? 'bg-green-500' : m.status === 'away' ? 'bg-yellow-500' : 'bg-muted-foreground/40'}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{m.name}</p>
            <p className="text-xs text-muted-foreground">{m.role}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export const MeetingPreview = () => {
  const { t } = useTranslation('landing');
  const items = t('previews.meeting.items', { returnObjects: true }) as Array<{ text: string; resp: string }>;
  // First item is "done" in the original mock
  const decorated = items.map((it, i) => ({ ...it, done: i === 0 }));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">{t('previews.meeting.title')}</h4>
          <Badge variant="outline" className="text-xs">{t('previews.meeting.date')}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{t('previews.meeting.description')}</p>
        <div className="flex items-center gap-1 mb-4">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t('previews.meeting.participants')}</span>
        </div>
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold mb-2">{t('previews.meeting.pendingLabel')}</p>
          <div className="space-y-2">
            {decorated.map((p) => (
              <div key={p.text} className="flex items-center gap-2 text-xs">
                <CheckCircle2 className={`h-3.5 w-3.5 ${p.done ? 'text-green-500' : 'text-muted-foreground/40'}`} />
                <span className={p.done ? 'line-through text-muted-foreground' : ''}>{p.text}</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">{p.resp}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const DashboardPreview = () => {
  const { t } = useTranslation('landing');
  const stats = [
    { label: t('previews.dashboard.stats.onTrack'), value: 12, color: 'text-green-500', icon: CheckCircle2 },
    { label: t('previews.dashboard.stats.warning'), value: 5, color: 'text-yellow-500', icon: Clock },
    { label: t('previews.dashboard.stats.late'), value: 3, color: 'text-red-500', icon: AlertCircle },
  ];
  const tasksData = t('previews.dashboard.tasks', { returnObjects: true }) as Array<{ task: string; date: string }>;
  const progresses = [85, 60, 30, 10];
  const tasks = tasksData.map((tk, i) => ({ ...tk, progress: progresses[i] ?? 0 }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3 text-center">
            <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {tasks.map((tk) => (
          <div key={tk.task} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium">{tk.task}</span>
              <span className="text-[10px] text-muted-foreground">{tk.date}</span>
            </div>
            <Progress value={tk.progress} className="h-1.5" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const TimerPreview = () => {
  const { t } = useTranslation('landing');
  const buttons = [
    { icon: Play, label: t('previews.timer.buttons.start') },
    { icon: Pause, label: t('previews.timer.buttons.pause') },
    { icon: RotateCcw, label: t('previews.timer.buttons.reset') },
  ];

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative h-40 w-40 mb-6">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" strokeWidth="6" className="stroke-muted" />
          <circle cx="50" cy="50" r="45" fill="none" strokeWidth="6" strokeDasharray={`${0.65 * 283} 283`} strokeLinecap="round" className="stroke-primary" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-mono">16:15</span>
          <span className="text-xs text-muted-foreground">{t('previews.timer.focus')}</span>
        </div>
      </div>
      <div className="flex gap-3">
        {buttons.map((b) => (
          <div key={b.label} className="flex flex-col items-center gap-1">
            <div className="h-10 w-10 rounded-full border border-border bg-card flex items-center justify-center">
              <b.icon className="h-4 w-4" />
            </div>
            <span className="text-[10px] text-muted-foreground">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CalendarPreview = () => {
  const { t } = useTranslation('landing');
  const days = t('previews.calendar.days', { returnObjects: true }) as string[];
  const eventsRaw = t('previews.calendar.events', { returnObjects: true }) as Record<string, string>;
  const colorMap: Record<string, string> = {
    '3': 'bg-blue-500',
    '7': 'bg-green-500',
    '12': 'bg-primary',
    '15': 'bg-yellow-500',
    '22': 'bg-purple-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{t('previews.calendar.month')}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d) => (
          <div key={d} className="text-[10px] text-muted-foreground font-medium py-1">{d}</div>
        ))}
        {Array.from({ length: 3 }, (_, i) => (
          <div key={`e-${i}`} />
        ))}
        {Array.from({ length: 30 }, (_, i) => {
          const day = i + 1;
          const evTitle = eventsRaw[String(day)];
          const evColor = colorMap[String(day)];
          return (
            <div key={day} className={`relative rounded-md p-1 text-xs ${day === 15 ? 'bg-primary/10 font-bold' : ''}`}>
              {day}
              {evTitle && <div className={`mt-0.5 h-1 w-full rounded-full ${evColor ?? 'bg-primary'}`} title={evTitle} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const WorkInstructionsPreview = () => {
  const { t } = useTranslation('landing');
  const steps = t('previews.workInstructions.steps', { returnObjects: true }) as Array<{ title: string; body: string }>;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">{t('previews.workInstructions.title')}</h4>
          <Badge variant="outline" className="text-[10px]">{t('previews.workInstructions.version')}</Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {t('previews.workInstructions.author')}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t('previews.workInstructions.updatedAt')}</span>
          <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" /> {t('previews.workInstructions.attachments')}</span>
        </div>
        <div className="rounded-md bg-muted/50 p-3 text-xs space-y-2">
          {steps.map((s) => (
            <div key={s.title}>
              <p className="font-semibold">{s.title}</p>
              <p className="text-muted-foreground pl-3">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const IdeasPreview = () => {
  const { t } = useTranslation('landing');
  const items = t('previews.ideas.items', { returnObjects: true }) as Array<{
    title: string;
    desc: string;
    tags: string[];
  }>;
  // Second item is "implemented" in the original mock
  const decorated = items.map((it, i) => ({ ...it, implemented: i === 1 }));

  return (
    <div className="grid grid-cols-2 gap-3">
      {decorated.map((idea) => (
        <div key={idea.title} className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold">{idea.title}</span>
            {idea.implemented && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">{idea.desc}</p>
          <div className="flex gap-1 flex-wrap">
            {idea.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                <Tag className="h-2.5 w-2.5 mr-0.5" />{tag}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const previewMap: Record<FeatureKey, () => JSX.Element> = {
  kanban: KanbanPreview,
  team: TeamPreview,
  meetings: MeetingPreview,
  dashboard: DashboardPreview,
  timer: TimerPreview,
  calendar: CalendarPreview,
  workInstructions: WorkInstructionsPreview,
  ideas: IdeasPreview,
};
