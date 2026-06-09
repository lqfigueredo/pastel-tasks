import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

type DocType = 'terms' | 'privacy';

interface LegalDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docType: DocType | null;
}

export const LegalDocumentDialog = ({ open, onOpenChange, docType }: LegalDocumentDialogProps) => {
  const { t, i18n } = useTranslation('auth');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !docType) return;
    let cancelled = false;
    setLoading(true);
    setContent('');

    const currentLocale = i18n.language?.startsWith('pt') ? 'pt-BR' : 'en';

    (async () => {
      const { data } = await supabase
        .from('legal_documents')
        .select('content')
        .eq('doc_type', docType)
        .eq('locale', currentLocale)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      let resolved = data?.content;

      if (!resolved && currentLocale !== 'pt-BR') {
        const { data: fallback } = await supabase
          .from('legal_documents')
          .select('content')
          .eq('doc_type', docType)
          .eq('locale', 'pt-BR')
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();
        resolved = fallback?.content;
      }

      if (cancelled) return;
      setContent(resolved || '');
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, docType, i18n.language]);

  const title =
    docType === 'terms'
      ? t('signup.acceptTermsLink')
      : docType === 'privacy'
      ? t('signup.acceptPrivacyLink')
      : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : content ? (
            <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display">
              <ReactMarkdown>{content}</ReactMarkdown>
            </article>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('legal.notAvailable', { defaultValue: 'Documento ainda não publicado.' })}
            </p>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('legal.close', { defaultValue: 'Fechar' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
