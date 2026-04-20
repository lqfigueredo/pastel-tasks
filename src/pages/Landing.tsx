import { useState, useEffect, useRef, type ReactNode } from 'react';
import FeaturePreviewDialog from '@/components/landing/FeaturePreviewDialog';
import {
  LayoutDashboard,
  Users,
  FileText,
  CalendarDays,
  Timer,
  Calendar,
  BookOpen,
  Lightbulb,
  UserPlus,
  ListChecks,
  BarChart3,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import logo from '@/assets/logo.webp';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import LeadFormTrigger from '@/components/landing/LeadFormTrigger';

/* ── Scroll-reveal wrapper ────────────────────────────── */
const RevealOnScroll = ({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-6'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const features = [
  {
    icon: LayoutDashboard,
    title: 'Kanban Intuitivo',
    description: 'Organize tarefas em colunas personalizáveis com arrastar e soltar.',
  },
  {
    icon: Users,
    title: 'Gestão de Equipes',
    description: 'Crie equipes, atribua tarefas e acompanhe o progresso de cada membro.',
  },
  {
    icon: FileText,
    title: 'Atas de Reunião',
    description: 'Registre reuniões, pendências e vincule tarefas automaticamente.',
  },
  {
    icon: CalendarDays,
    title: 'Dashboard de Prazos',
    description: 'Visualize entregas por período e nunca perca um prazo importante.',
  },
  {
    icon: Timer,
    title: 'Temporizador Pomodoro',
    description: 'Controle seu tempo com timer, countdown, pausa e retomada.',
  },
  {
    icon: Calendar,
    title: 'Agenda Pessoal',
    description: 'Gerencie eventos e compromissos em um calendário integrado.',
  },
  {
    icon: BookOpen,
    title: 'Instruções de Trabalho',
    description: 'Documentos versionados com histórico completo de alterações.',
  },
  {
    icon: Lightbulb,
    title: 'Registro de Ideias',
    description: 'Capture insights e vincule ideias diretamente a tarefas.',
  },
];

const steps = [
  {
    icon: UserPlus,
    number: '01',
    title: 'Crie sua conta',
    description: 'Cadastro rápido e sem complicações.',
  },
  {
    icon: ListChecks,
    number: '02',
    title: 'Organize suas tarefas',
    description: 'Monte seu quadro Kanban e distribua para a equipe.',
  },
  {
    icon: BarChart3,
    number: '03',
    title: 'Acompanhe os resultados',
    description: 'Dashboards em tempo real para decisões mais inteligentes.',
  },
];

const highlights = [
  { label: 'Tudo em um só lugar', value: '8+ módulos' },
  { label: 'Gestão simplificada', value: '100% visual' },
  { label: 'Equipes conectadas', value: 'Tempo real' },
];

const Landing = () => {
  const [previewFeature, setPreviewFeature] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground scroll-smooth">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="NEVVOH" className="h-9 w-9 rounded-xl" />
            <span className="text-lg font-bold font-display">NEVVOH</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link to="/precos" className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2">
              Preços
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="sm">Já tenho conta</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-mint-light/40 via-transparent to-transparent pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-6 py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-8 animate-fade-in">
            <Sparkles className="h-4 w-4" />
            Produtividade sem complexidade
          </div>

          <h1
            className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl font-display animate-fade-in"
            style={{ animationDelay: '100ms', animationFillMode: 'both' }}
          >
            Gestão de tarefas
            <span className="text-primary"> simples e eficiente</span>
          </h1>

          <p
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground animate-fade-in"
            style={{ animationDelay: '200ms', animationFillMode: 'both' }}
          >
            Organize projetos, gerencie equipes e acompanhe reuniões em um único lugar.
            O NEVVOH foi criado para times que querem produtividade sem complexidade.
          </p>

          <div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in"
            style={{ animationDelay: '300ms', animationFillMode: 'both' }}
          >
            <LeadFormTrigger />

            <Link to="/precos">
              <Button variant="outline" size="lg" className="text-base gap-2">
                Ver preços
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link to="/auth">
              <Button variant="ghost" size="lg" className="text-base gap-2">
                Já tenho conta
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 bg-muted/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <RevealOnScroll>
            <h2 className="text-center text-2xl font-bold sm:text-3xl font-display">
              Tudo que você precisa
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              8 módulos integrados para cobrir todo o ciclo de gestão da sua equipe.
            </p>
          </RevealOnScroll>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <RevealOnScroll key={f.title} delay={i * 80}>
                <div
                  className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg h-full cursor-pointer"
                  onClick={() => setPreviewFeature(f.title)}
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
                  <p className="mt-3 text-xs text-primary font-medium">Clique para ver exemplo →</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <RevealOnScroll>
            <h2 className="text-center text-2xl font-bold sm:text-3xl font-display">
              Como funciona
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              Comece em minutos. Sem curva de aprendizado.
            </p>
          </RevealOnScroll>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <RevealOnScroll key={step.number} delay={i * 150}>
                <div className="relative text-center">
                  {i < steps.length - 1 && (
                    <div className="hidden sm:block absolute top-8 left-[60%] w-[80%] h-px bg-border" />
                  )}
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-primary tracking-widest uppercase">
                    Passo {step.number}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Highlight band */}
      <section className="bg-primary py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 sm:grid-cols-3 text-center">
            {highlights.map((h, i) => (
              <RevealOnScroll key={h.label} delay={i * 120}>
                <div>
                  <p className="text-2xl font-bold text-primary-foreground sm:text-3xl font-display">
                    {h.value}
                  </p>
                  <p className="mt-1 text-primary-foreground/80 text-sm">{h.label}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ - SEO */}
      <section className="py-24 border-t border-border/50">
        <div className="mx-auto max-w-3xl px-6">
          <RevealOnScroll>
            <h2 className="text-center text-2xl font-bold sm:text-3xl font-display">
              Perguntas Frequentes
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              Tire suas dúvidas sobre o NEVVOH e gestão de tarefas.
            </p>
          </RevealOnScroll>

          <div className="mt-12 space-y-6">
            {[
              {
                q: 'O que é um gerenciador de tarefas online?',
                a: 'Um gerenciador de tarefas online é um software que permite criar, organizar e acompanhar atividades de forma digital. O NEVVOH vai além: integra Kanban, gestão de equipes, atas de reunião, temporizador Pomodoro e agenda pessoal em uma única plataforma.',
              },
              {
                q: 'Como organizar as tarefas da minha equipe?',
                a: 'Com o NEVVOH, você cria equipes, distribui tarefas no quadro Kanban com arrastar e soltar, define prazos e acompanha o progresso em tempo real pelo dashboard. Cada membro visualiza suas responsabilidades de forma clara.',
              },
              {
                q: 'O NEVVOH substitui ferramentas como Trello ou Asana?',
                a: 'Sim. O NEVVOH oferece funcionalidades equivalentes — Kanban, gestão de equipes, prazos — e ainda inclui módulos exclusivos como atas de reunião com pendências, instruções de trabalho versionadas e registro de ideias.',
              },
              {
                q: 'Posso usar o NEVVOH para gerenciar reuniões?',
                a: 'Sim! O módulo de Atas de Reunião permite registrar participantes, criar pendências com responsáveis e prazos, e vincular automaticamente tarefas geradas a partir da reunião.',
              },
              {
                q: 'O NEVVOH é gratuito?',
                a: 'O NEVVOH oferece um período de teste gratuito para que você conheça todas as funcionalidades. Entre em contato para saber mais sobre os planos disponíveis.',
              },
              {
                q: 'Como funciona o temporizador Pomodoro do NEVVOH?',
                a: 'O temporizador integrado permite controlar seu tempo de trabalho com sessões focadas, pausas e contagem regressiva. Você pode associar o timer a tarefas específicas para medir o tempo gasto em cada atividade.',
              },
            ].map((faq, i) => (
              <RevealOnScroll key={i} delay={i * 80}>
                <details className="group rounded-xl border border-border bg-card p-5">
                  <summary className="cursor-pointer list-none flex items-center justify-between font-semibold">
                    <span>{faq.q}</span>
                    <span className="ml-4 text-muted-foreground group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </p>
                </details>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="NEVVOH" className="h-7 w-7 rounded-lg" />
            <span className="text-sm font-semibold">NEVVOH</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} NEVVOH. Todos os direitos reservados.
          </p>
          <Link to="/auth" className="text-sm text-primary hover:underline">
            Acessar plataforma
          </Link>
        </div>
      </footer>
      <FeaturePreviewDialog
        open={!!previewFeature}
        onOpenChange={(open) => !open && setPreviewFeature(null)}
        featureTitle={previewFeature}
      />
    </div>
  );
};

export default Landing;
