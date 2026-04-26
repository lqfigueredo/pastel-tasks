import { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { getCurrentLocale } from '@/lib/date';
import { toast } from 'sonner';

type DocType = 'terms' | 'privacy';
type DocLocale = 'pt-BR' | 'en';

interface LegalDoc {
  id: string;
  doc_type: DocType;
  locale: DocLocale;
  content: string;
  version: number;
  published_at: string;
}

const DocEditor = ({ docType }: { docType: DocType }) => {
  const { t } = useTranslation('financial');
  const { user } = useAuth();
  const [locale, setLocale] = useState<DocLocale>('pt-BR');
  const [versions, setVersions] = useState<LegalDoc[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('doc_type', docType)
      .eq('locale', locale)
      .order('version', { ascending: false });
    const list = (data || []) as LegalDoc[];
    setVersions(list);
    setDraft(list[0]?.content || '');
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docType, locale]);

  const handlePublish = async () => {
    if (!draft.trim()) {
      toast.error(t('legal.errors.empty'));
      return;
    }
    if (draft === versions[0]?.content) {
      toast.info(t('legal.errors.noChanges'));
      return;
    }
    setPublishing(true);
    const nextVersion = (versions[0]?.version || 0) + 1;
    const { error } = await supabase.from('legal_documents').insert({
      doc_type: docType,
      locale,
      content: draft,
      version: nextVersion,
      updated_by: user?.id,
    });
    setPublishing(false);
    if (error) {
      toast.error(t('legal.errors.publish', { message: error.message }));
      return;
    }
    toast.success(t('legal.success', { n: nextVersion }));
    await load();
  };

  const hasPublishedVersion = versions.length > 0;

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <Trans i18nKey="legal.alert" t={t} components={{ code: <code /> }} />
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          value={locale}
          onValueChange={(v) => v && setLocale(v as DocLocale)}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="pt-BR">{t('legal.localeTabs.ptBR')}</ToggleGroupItem>
          <ToggleGroupItem value="en">{t('legal.localeTabs.en')}</ToggleGroupItem>
        </ToggleGroup>
        {!loading && !hasPublishedVersion && (
          <Badge variant="outline" className="text-xs">{t('legal.notPublishedYet')}</Badge>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('legal.editor')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="min-h-[500px] font-mono text-xs"
                  placeholder="# Title&#10;&#10;Markdown content..."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t('legal.preview')}</CardTitle>
              </CardHeader>
              <CardContent>
                <article className="prose prose-sm dark:prose-invert max-w-none min-h-[500px] max-h-[500px] overflow-auto rounded-md border border-border p-4">
                  <ReactMarkdown>{draft || t('legal.empty')}</ReactMarkdown>
                </article>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              <Trans
                i18nKey="legal.currentVersion"
                t={t}
                values={{ n: versions[0]?.version || 0 }}
                components={{ bold: <strong /> }}
              />
              {versions[0] && (
                <> · {format(new Date(versions[0].published_at), "dd/MM/yyyy 'às' HH:mm", { locale: getCurrentLocale() })}</>
              )}
            </p>
            <Button onClick={handlePublish} disabled={publishing}>
              {publishing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('legal.publishing')}</> : t('legal.publish')}
            </Button>
          </div>

          {versions.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t('legal.history')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {versions.map((v) => (
                    <li key={v.id} className="flex items-center justify-between border-b border-border/50 py-1.5 last:border-0">
                      <span>v{v.version}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(v.published_at), "dd/MM/yyyy HH:mm", { locale: getCurrentLocale() })}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

const LegalDocumentsEditor = () => {
  const { t } = useTranslation('financial');
  return (
    <Tabs defaultValue="terms" className="space-y-4">
      <TabsList>
        <TabsTrigger value="terms">{t('legal.tabs.terms')}</TabsTrigger>
        <TabsTrigger value="privacy">{t('legal.tabs.privacy')}</TabsTrigger>
      </TabsList>
      <TabsContent value="terms"><DocEditor docType="terms" /></TabsContent>
      <TabsContent value="privacy"><DocEditor docType="privacy" /></TabsContent>
    </Tabs>
  );
};

export default LegalDocumentsEditor;
