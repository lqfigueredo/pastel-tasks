import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import LeadFormTrigger from '@/components/landing/LeadFormTrigger';
import { Wordmark } from '@/components/Wordmark';
import logo from '@/assets/flowly-logo.svg';
import { safeTArray } from '@/i18n/safeT';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_per_seat_cents: number;
  currency: string;
  minimum_seats: number;
  billing_interval: string;
  features: unknown;
}

const Pricing = () => {
  const { t } = useTranslation('pricing');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = t('meta.title');
    const meta =
      document.querySelector('meta[name="description"]') ||
      Object.assign(document.createElement('meta'), { name: 'description' });
    meta.setAttribute('content', t('meta.description'));
    if (!meta.parentNode) document.head.appendChild(meta);

    supabase
      .from('plans')
      .select('id, name, description, price_per_seat_cents, currency, minimum_seats, billing_interval, features')
      .eq('is_active', true)
      .order('price_per_seat_cents', { ascending: true })
      .then(({ data }) => {
        setPlans((data as Plan[]) ?? []);
        setLoading(false);
      });
  }, [t]);

  const primary = plans[0];

  const featuresList: string[] = useMemo(() => {
    if (!primary) return [];
    const f = primary.features;
    if (Array.isArray(f)) return f.filter((i): i is string => typeof i === 'string');
    return [];
  }, [primary]);

  const faqItems = safeTArray<{ q: string; a: string }>(t('faq.items', { returnObjects: true }));

  return (
    <div className="min-h-screen bg-background text-foreground scroll-smooth">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Flowly" className="h-9 w-9 rounded-xl" />
            <Wordmark className="text-lg font-display" />
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground px-3">
              {t('header.home')}
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="sm">{t('header.haveAccount')}</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-mint-light/40 via-transparent to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Sparkles className="h-4 w-4" />
            {t('hero.badge')}
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-display">
            {t('hero.title1')} <span className="text-primary">{t('hero.titleHighlight')}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {t('hero.subtitle')}
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-3xl px-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : !primary ? (
            <p className="text-center text-muted-foreground">{t('noPlans')}</p>
          ) : (
            <div className="rounded-2xl border-2 border-primary/30 bg-card shadow-xl overflow-hidden">
              <div className="bg-primary/5 border-b border-primary/20 p-8 text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary mb-4">
                  {t('plan.freeBadge')}
                </div>
                <h2 className="text-2xl font-bold font-display">{primary.name}</h2>
                {primary.description && (
                  <p className="mt-2 text-muted-foreground">{primary.description}</p>
                )}
                <div className="mt-6 flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-primary font-display">
                    {t('plan.freePrice')}
                  </span>
                  <span className="text-muted-foreground">{t('plan.perSeatMonth')}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('plan.freeForOneYear')}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('plan.minValue', { n: primary.minimum_seats })}
                </p>
              </div>

              <div className="p-8 space-y-8">
                {featuresList.length > 0 && (
                  <ul className="space-y-3">
                    {featuresList.map((feat, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feat}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Link to="/auth" className="flex-1">
                    <Button size="lg" className="w-full gap-2">
                      {t('plan.startTrial')}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <div className="flex-1">
                    <LeadFormTrigger />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-border/50 bg-muted/30 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-2xl font-bold sm:text-3xl font-display mb-10">
            {t('faq.title')}
          </h2>
          <div className="space-y-4">
            {faqItems.map((faq, i) => (
              <details key={i} className="group rounded-xl border border-border bg-card p-5">
                <summary className="cursor-pointer list-none flex items-center justify-between font-semibold">
                  <span>{faq.q}</span>
                  <span className="ml-4 text-muted-foreground group-open:rotate-45 transition-transform text-xl leading-none">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-10">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Flowly" className="h-7 w-7 rounded-lg" />
            <Wordmark className="text-sm font-display" />
          </div>
          <p className="text-sm text-muted-foreground">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
          <Link to="/auth" className="text-sm text-primary hover:underline">
            {t('footer.access')}
          </Link>
        </div>
      </footer>

      {primary && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: `Flowly — ${primary.name}`,
              description: primary.description || 'Plataforma de gestão de tarefas e equipes',
              offers: {
                '@type': 'Offer',
                price: '0.00',
                priceCurrency: primary.currency,
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: '0.00',
                  priceCurrency: primary.currency,
                  unitText: 'usuário/mês',
                },
              },
            }),
          }}
        />
      )}
    </div>
  );
};

export default Pricing;
