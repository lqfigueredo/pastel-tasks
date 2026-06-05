import { useState, useEffect, useRef, lazy, Suspense, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { KanbanPreview, type FeatureKey } from '@/components/landing/featurePreviews';

// Lazy-load heavy below-the-fold pieces — keeps initial Landing bundle light
const FeaturePreviewDialog = lazy(() => import('@/components/landing/FeaturePreviewDialog'));
const FloatingTasksBackground = lazy(() => import('@/components/landing/FloatingTasksBackground'));
const FeatureMiniPreview = lazy(() => import('@/components/landing/FeatureMiniPreview'));
const TaskMarquee = lazy(() => import('@/components/landing/TaskMarquee'));
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
  Sparkles,
  CheckSquare,
} from 'lucide-react';
import logo from '@/assets/flowly-logo.svg';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import LeadFormTrigger from '@/components/landing/LeadFormTrigger';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { safeTArray } from '@/i18n/safeT';

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

    // If already in viewport on mount (above-the-fold), reveal immediately
    // to avoid delaying LCP paint behind opacity transition.
    const rect = el.getBoundingClientRect();
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < viewportH && rect.bottom > 0) {
      setVisible(true);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

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

const FEATURES: Array<{ icon: typeof LayoutDashboard; key: FeatureKey }> = [
  { icon: LayoutDashboard, key: 'kanban' },
  { icon: Users, key: 'team' },
  { icon: FileText, key: 'meetings' },
  { icon: CalendarDays, key: 'dashboard' },
  { icon: Timer, key: 'timer' },
  { icon: Calendar, key: 'calendar' },
  { icon: BookOpen, key: 'workInstructions' },
  { icon: Lightbulb, key: 'ideas' },
];

const STEPS: Array<{ icon: typeof UserPlus; key: 'signup' | 'organize' | 'track'; number: string }> = [
  { icon: UserPlus, key: 'signup', number: '01' },
  { icon: ListChecks, key: 'organize', number: '02' },
  { icon: BarChart3, key: 'track', number: '03' },
];

const HIGHLIGHT_KEYS = ['allInOne', 'simpleManagement', 'connectedTeams'] as const;

const Landing = () => {
  const { t } = useTranslation('landing');
  const [previewFeature, setPreviewFeature] = useState<FeatureKey | null>(null);
  const faqItems = safeTArray<{ q: string; a: string }>(t('faq.items', { returnObjects: true }));

  return (
    <div className="min-h-screen bg-background text-foreground scroll-smooth">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Flowly" className="h-9 w-9 rounded-xl" />
            <span className="text-lg font-bold font-display">Flowly</span>
          </div>
          <nav className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <Link to="/precos" className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2">
              {t('header.pricing')}
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="sm">{t('header.haveAccount')}</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-mint-light/40 via-transparent to-transparent pointer-events-none" />
        <Suspense fallback={null}>
          <FloatingTasksBackground />
        </Suspense>

        <div className="relative mx-auto max-w-6xl px-6 py-24 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: copy */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6 animate-fade-in">
                <Sparkles className="h-4 w-4" />
                {t('hero.badge')}
              </div>

              <h1
                className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl font-display animate-fade-in"
                style={{ animationDelay: '100ms', animationFillMode: 'both' }}
              >
                {t('hero.title1')}
                <span className="text-primary">{t('hero.titleHighlight')}</span>
              </h1>

              <p
                className="mx-auto lg:mx-0 mt-4 max-w-2xl text-sm italic text-primary/80 animate-fade-in"
                style={{ animationDelay: '150ms', animationFillMode: 'both' }}
              >
                {t('hero.meaning')}
              </p>

              <p
                className="mx-auto lg:mx-0 mt-6 max-w-2xl text-lg text-muted-foreground animate-fade-in"
                style={{ animationDelay: '200ms', animationFillMode: 'both' }}
              >
                {t('hero.subtitle')}
              </p>

              <div
                className="mt-10 flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-3 animate-fade-in"
                style={{ animationDelay: '300ms', animationFillMode: 'both' }}
              >
                <Link to="/auth">
                  <Button size="lg" className="text-base px-8 gap-2">
                    <Sparkles className="h-5 w-5" />
                    {t('hero.cta.trial')}
                  </Button>
                </Link>

                <LeadFormTrigger />
              </div>

              <p
                className="mt-4 text-xs text-muted-foreground animate-fade-in lg:text-left text-center"
                style={{ animationDelay: '400ms', animationFillMode: 'both' }}
              >
                {t('hero.trialNote')}
              </p>
            </div>

            {/* Right: Kanban mockup */}
            <div
              aria-hidden="true"
              className="hidden lg:block animate-fade-in"
              style={{ animationDelay: '350ms', animationFillMode: 'both' }}
            >
              <div
                className="relative rounded-2xl border border-border bg-card/95 p-5 shadow-2xl backdrop-blur"
                style={{ transform: 'perspective(1200px) rotateY(-6deg) rotateX(2deg)' }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{t('hero.mockup.boardLabel')}</span>
                </div>
                <KanbanPreview />
                <div className="absolute -bottom-3 -right-3 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold shadow-lg">
                  {t('hero.mockup.realtime')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 bg-muted/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <RevealOnScroll>
            <h2 className="text-center text-2xl font-bold sm:text-3xl font-display">
              {t('features.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              {t('features.subtitle')}
            </p>
          </RevealOnScroll>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <RevealOnScroll key={f.key} delay={i * 60}>
                <div
                  className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg h-full cursor-pointer"
                  onClick={() => setPreviewFeature(f.key)}
                >
                  <Suspense fallback={<div className="h-24" />}>
                    <FeatureMiniPreview featureKey={f.key} />
                  </Suspense>
                  <div className="mt-5 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{t(`features.items.${f.key}.title`)}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{t(`features.items.${f.key}.description`)}</p>
                      <p className="mt-2 text-xs text-primary font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                        {t('features.clickHint')}
                      </p>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Marquee transition */}
      <Suspense fallback={null}>
        <TaskMarquee />
      </Suspense>

      {/* How it works */}
      <section className="relative py-24 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-1/2 -translate-y-1/2 opacity-[0.05] dark:opacity-[0.07]"
        >
          <Calendar className="h-[420px] w-[420px] text-primary" strokeWidth={1} />
        </div>
        <div className="relative mx-auto max-w-6xl px-6">
          <RevealOnScroll>
            <h2 className="text-center text-2xl font-bold sm:text-3xl font-display">
              {t('steps.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              {t('steps.subtitle')}
            </p>
          </RevealOnScroll>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <RevealOnScroll key={step.number} delay={i * 150}>
                <div className="relative text-center">
                  {i < STEPS.length - 1 && (
                    <div className="hidden sm:block absolute top-8 left-[60%] w-[80%] h-px bg-border" />
                  )}
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-primary tracking-widest uppercase">
                    {t('steps.stepLabel', { number: step.number })}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold">{t(`steps.items.${step.key}.title`)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(`steps.items.${step.key}.description`)}</p>
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
            {HIGHLIGHT_KEYS.map((key, i) => (
              <RevealOnScroll key={key} delay={i * 120}>
                <div>
                  <p className="text-2xl font-bold text-primary-foreground sm:text-3xl font-display">
                    {t(`highlights.${key}.value`)}
                  </p>
                  <p className="mt-1 text-primary-foreground/80 text-sm">{t(`highlights.${key}.label`)}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ - SEO */}
      <section className="relative py-24 border-t border-border/50 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 top-20 opacity-[0.05] dark:opacity-[0.07]"
        >
          <CheckSquare className="h-[360px] w-[360px] text-primary" strokeWidth={1} />
        </div>
        <div className="relative mx-auto max-w-3xl px-6">
          <RevealOnScroll>
            <h2 className="text-center text-2xl font-bold sm:text-3xl font-display">
              {t('faq.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              {t('faq.subtitle')}
            </p>
          </RevealOnScroll>

          <div className="mt-12 space-y-6">
            {faqItems.map((faq, i) => (
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
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10">
        <div className="mx-auto max-w-6xl px-6 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Flowly" className="h-7 w-7 rounded-lg" />
              <span className="text-sm font-semibold">Flowly</span>
            </div>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/termos" className="hover:text-foreground">{t('footer.terms')}</Link>
              <Link to="/privacidade" className="hover:text-foreground">{t('footer.privacy')}</Link>
              <Link to="/auth" className="text-primary hover:underline">{t('footer.access')}</Link>
            </nav>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
      {previewFeature && (
        <Suspense fallback={null}>
          <FeaturePreviewDialog
            open={!!previewFeature}
            onOpenChange={(open) => !open && setPreviewFeature(null)}
            featureKey={previewFeature}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Landing;
