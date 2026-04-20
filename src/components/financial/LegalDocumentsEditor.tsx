import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

type DocType = 'terms' | 'privacy';

interface LegalDoc {
  id: string;
  doc_type: DocType;
  content: string;
  version: number;
  published_at: string;
}

const LABELS: Record<DocType, string> = {
  terms: 'Termos de Uso',
  privacy: 'Política de Privacidade',
};

const DocEditor = ({ docType }: { docType: DocType }) => {
  const { user } = useAuth();
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
      .order('version', { ascending: false });
    const list = (data || []) as LegalDoc[];
    setVersions(list);
    setDraft(list[0]?.content || '');
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [docType]);

  const handlePublish = async () => {
    if (!draft.trim()) {
      toast.error('Conteúdo não pode estar vazio.');
      return;
    }
    if (draft === versions[0]?.content) {
      toast.info('Nenhuma alteração para publicar.');
      return;
    }
    setPublishing(true);
    const nextVersion = (versions[0]?.version || 0) + 1;
    const { error } = await supabase.from('legal_documents').insert({
      doc_type: docType,
      content: draft,
      version: nextVersion,
      updated_by: user?.id,
    });
    setPublishing(false);
    if (error) {
      toast.error('Erro ao publicar: ' + error.message);
      return;
    }
    toast.success(`Versão ${nextVersion} publicada.`);
    await load();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Use markdown. As versões publicadas são imutáveis e ficam visíveis em <code>/termos</code> ou <code>/privacidade</code>.
          Recomenda-se revisão jurídica antes do go-live público.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Editor (markdown)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[500px] font-mono text-xs"
              placeholder="# Título&#10;&#10;Conteúdo em markdown..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <article className="prose prose-sm dark:prose-invert max-w-none min-h-[500px] max-h-[500px] overflow-auto rounded-md border border-border p-4">
              <ReactMarkdown>{draft || '_Vazio_'}</ReactMarkdown>
            </article>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Versão atual publicada: <strong>v{versions[0]?.version || 0}</strong>
          {versions[0] && (
            <> · {format(new Date(versions[0].published_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
          )}
        </p>
        <Button onClick={handlePublish} disabled={publishing}>
          {publishing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Publicando...</> : 'Publicar nova versão'}
        </Button>
      </div>

      {versions.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Histórico de versões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between border-b border-border/50 py-1.5 last:border-0">
                  <span>v{v.version}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(v.published_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const LegalDocumentsEditor = () => {
  return (
    <Tabs defaultValue="terms" className="space-y-4">
      <TabsList>
        <TabsTrigger value="terms">{LABELS.terms}</TabsTrigger>
        <TabsTrigger value="privacy">{LABELS.privacy}</TabsTrigger>
      </TabsList>
      <TabsContent value="terms"><DocEditor docType="terms" /></TabsContent>
      <TabsContent value="privacy"><DocEditor docType="privacy" /></TabsContent>
    </Tabs>
  );
};

export default LegalDocumentsEditor;
