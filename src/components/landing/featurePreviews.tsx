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

export const KanbanPreview = () => (
  <div className="grid grid-cols-3 gap-3">
    {[
      { title: 'A Fazer', color: 'bg-blue-500', cards: ['Redesign da homepage', 'Documentar API', 'Revisar contratos'] },
      { title: 'Em Progresso', color: 'bg-yellow-500', cards: ['Integração de pagamentos', 'Testes unitários'] },
      { title: 'Concluído', color: 'bg-green-500', cards: ['Setup do projeto', 'Design system', 'Deploy CI/CD', 'Onboarding'] },
    ].map((col) => (
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

export const TeamPreview = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between mb-4">
      <h4 className="text-sm font-semibold">Equipe Produto</h4>
      <Badge variant="secondary">5 membros</Badge>
    </div>
    {[
      { name: 'Ana Silva', role: 'Líder', status: 'online', avatar: 'AS' },
      { name: 'Carlos Souza', role: 'Desenvolvedor', status: 'online', avatar: 'CS' },
      { name: 'Maria Oliveira', role: 'Designer', status: 'away', avatar: 'MO' },
      { name: 'Pedro Santos', role: 'QA', status: 'online', avatar: 'PS' },
      { name: 'Julia Costa', role: 'Product Owner', status: 'offline', avatar: 'JC' },
    ].map((m) => (
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

export const MeetingPreview = () => (
  <div className="space-y-4">
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">Reunião de Sprint Planning</h4>
        <Badge variant="outline" className="text-xs">15/04/2026</Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Definição das tarefas do próximo sprint e priorização de backlog.</p>
      <div className="flex items-center gap-1 mb-4">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Ana Silva, Carlos Souza, Maria Oliveira</span>
      </div>
      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold mb-2">Pendências</p>
        <div className="space-y-2">
          {[
            { text: 'Definir escopo do módulo financeiro', done: true, resp: 'Carlos' },
            { text: 'Enviar proposta ao cliente', done: false, resp: 'Ana' },
            { text: 'Atualizar documentação técnica', done: false, resp: 'Maria' },
          ].map((p) => (
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

export const DashboardPreview = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: 'No prazo', value: 12, color: 'text-green-500', icon: CheckCircle2 },
        { label: 'Atenção', value: 5, color: 'text-yellow-500', icon: Clock },
        { label: 'Atrasadas', value: 3, color: 'text-red-500', icon: AlertCircle },
      ].map((s) => (
        <div key={s.label} className="rounded-lg border border-border bg-card p-3 text-center">
          <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
          <p className="text-xl font-bold">{s.value}</p>
          <p className="text-xs text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
    <div className="space-y-2">
      {[
        { task: 'Entrega do relatório Q2', date: '18/04', progress: 85 },
        { task: 'Lançamento v2.0', date: '25/04', progress: 60 },
        { task: 'Review de segurança', date: '12/04', progress: 30 },
        { task: 'Migração de dados', date: '10/04', progress: 10 },
      ].map((t) => (
        <div key={t.task} className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium">{t.task}</span>
            <span className="text-[10px] text-muted-foreground">{t.date}</span>
          </div>
          <Progress value={t.progress} className="h-1.5" />
        </div>
      ))}
    </div>
  </div>
);

export const TimerPreview = () => (
  <div className="flex flex-col items-center py-4">
    <div className="relative h-40 w-40 mb-6">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" strokeWidth="6" className="stroke-muted" />
        <circle cx="50" cy="50" r="45" fill="none" strokeWidth="6" strokeDasharray={`${0.65 * 283} 283`} strokeLinecap="round" className="stroke-primary" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold font-mono">16:15</span>
        <span className="text-xs text-muted-foreground">Foco</span>
      </div>
    </div>
    <div className="flex gap-3">
      {[
        { icon: Play, label: 'Iniciar' },
        { icon: Pause, label: 'Pausar' },
        { icon: RotateCcw, label: 'Resetar' },
      ].map((b) => (
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

export const CalendarPreview = () => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const events: Record<number, { title: string; color: string }> = {
    3: { title: 'Sprint Review', color: 'bg-blue-500' },
    7: { title: 'Dentista', color: 'bg-green-500' },
    12: { title: 'Deploy v2', color: 'bg-primary' },
    15: { title: 'Planning', color: 'bg-yellow-500' },
    22: { title: 'Férias', color: 'bg-purple-500' },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Abril 2026</span>
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
          const ev = events[day];
          return (
            <div key={day} className={`relative rounded-md p-1 text-xs ${day === 15 ? 'bg-primary/10 font-bold' : ''}`}>
              {day}
              {ev && <div className={`mt-0.5 h-1 w-full rounded-full ${ev.color}`} title={ev.title} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const WorkInstructionsPreview = () => (
  <div className="space-y-3">
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">IT-001 — Procedimento de Deploy</h4>
        <Badge variant="outline" className="text-[10px]">v3.2</Badge>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1"><User className="h-3 w-3" /> Carlos Souza</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Atualizado em 10/04/2026</span>
        <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" /> 2 anexos</span>
      </div>
      <div className="rounded-md bg-muted/50 p-3 text-xs space-y-2">
        <p className="font-semibold">1. Preparação do ambiente</p>
        <p className="text-muted-foreground pl-3">Verificar que todos os testes passaram no CI antes de iniciar o processo de deploy.</p>
        <p className="font-semibold">2. Execução do deploy</p>
        <p className="text-muted-foreground pl-3">Executar o script de deploy no ambiente de staging antes de produção.</p>
        <p className="font-semibold">3. Validação pós-deploy</p>
        <p className="text-muted-foreground pl-3">Monitorar logs e métricas por 30 minutos após a conclusão.</p>
      </div>
    </div>
  </div>
);

export const IdeasPreview = () => (
  <div className="grid grid-cols-2 gap-3">
    {[
      { title: 'Dashboard de analytics', tags: ['Produto', 'Alta'], implemented: false, desc: 'Painel visual com métricas de uso em tempo real.' },
      { title: 'Modo escuro automático', tags: ['UX', 'Média'], implemented: true, desc: 'Alternar tema com base no horário do dispositivo.' },
      { title: 'Integração com Slack', tags: ['Integração', 'Alta'], implemented: false, desc: 'Notificações de tarefas direto no canal da equipe.' },
      { title: 'Gamificação de tarefas', tags: ['Engajamento', 'Baixa'], implemented: false, desc: 'Pontos e badges para tarefas concluídas no prazo.' },
    ].map((idea) => (
      <div key={idea.title} className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold">{idea.title}</span>
          {idea.implemented && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
        </div>
        <p className="text-[11px] text-muted-foreground mb-2">{idea.desc}</p>
        <div className="flex gap-1 flex-wrap">
          {idea.tags.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
              <Tag className="h-2.5 w-2.5 mr-0.5" />{t}
            </Badge>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const previewMap: Record<string, () => JSX.Element> = {
  'Kanban Intuitivo': KanbanPreview,
  'Gestão de Equipes': TeamPreview,
  'Atas de Reunião': MeetingPreview,
  'Dashboard de Prazos': DashboardPreview,
  'Temporizador Pomodoro': TimerPreview,
  'Agenda Pessoal': CalendarPreview,
  'Instruções de Trabalho': WorkInstructionsPreview,
  'Registro de Ideias': IdeasPreview,
};
