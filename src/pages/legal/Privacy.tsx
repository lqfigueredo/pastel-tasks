import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { PageLoader } from '@/components/ui/loaders';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Wordmark } from '@/components/Wordmark';
import logo from '@/assets/nevvoh-logo.svg';

const Privacy = () => {
  const { t, i18n } = useTranslation('public');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    document.title = t('legal.privacyTitle');
    setLoading(true);

    const currentLocale = i18n.language?.startsWith('pt') ? 'pt-BR' : 'en';

    const fetchDoc = async () => {
      // Try requested locale first
      const { data } = await supabase
        .from('legal_documents')
        .select('content')
        .eq('doc_type', 'privacy')
        .eq('locale', currentLocale)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      let resolved = data?.content;

      // Fallback to pt-BR if requested locale has no published version
      if (!resolved && currentLocale !== 'pt-BR') {
        const { data: fallback } = await supabase
          .from('legal_documents')
          .select('content')
          .eq('doc_type', 'privacy')
          .eq('locale', 'pt-BR')
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();
        resolved = fallback?.content;
      }

      if (cancelled) return;
      setContent(resolved || `# ${t('legal.privacyHeading')}\n\n${t('legal.notPublished')}`);
      setLoading(false);
    };

    fetchDoc();
    return () => {
      cancelled = true;
    };
  }, [t, i18n.language]);

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Nevvoh" className="h-7 w-7 rounded-lg" />
            <Wordmark />
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />{t('legal.home')}</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <article className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:font-display">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </main>
    </div>
  );
};

export default Privacy;
