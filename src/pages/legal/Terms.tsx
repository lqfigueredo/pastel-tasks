import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { PageLoader } from '@/components/ui/loaders';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo.webp';

const Terms = () => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Termos de Uso | NEVVOH';
    supabase
      .from('legal_documents')
      .select('content')
      .eq('doc_type', 'terms')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setContent(data?.content || '# Termos de Uso\n\nDocumento ainda não publicado.');
        setLoading(false);
      });
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="NEVVOH" className="h-7 w-7 rounded-lg" />
            <span className="font-semibold">NEVVOH</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Início</Link>
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

export default Terms;
