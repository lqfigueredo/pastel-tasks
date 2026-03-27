import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, Trash2 } from 'lucide-react';

interface Version {
  id: string;
  version_number: number;
  file_path: string;
  file_name: string;
  change_reason: string;
  changed_by: string;
  created_at: string;
}

interface Props {
  instruction: { id: string; title: string };
  onClose: () => void;
  profiles: Record<string, string>;
}

export function VersionHistory({ instruction, onClose, profiles }: Props) {
  const { toast } = useToast();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVersions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('work_instruction_versions')
      .select('*')
      .eq('instruction_id', instruction.id)
      .order('version_number', { ascending: false });
    setVersions((data as Version[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchVersions(); }, [instruction.id]);

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from('work-instructions').download(filePath);
    if (error) {
      toast({ title: 'Erro ao baixar', description: error.message, variant: 'destructive' });
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteVersion = async (version: Version) => {
    if (versions.length <= 1) {
      toast({ title: 'Não é possível remover a última versão do histórico', variant: 'destructive' });
      return;
    }
    if (!confirm('Remover esta versão do histórico? O arquivo será excluído permanentemente.')) return;

    await supabase.storage.from('work-instructions').remove([version.file_path]);
    await supabase.from('work_instruction_versions').delete().eq('id', version.id);

    toast({ title: 'Versão removida' });
    fetchVersions();
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico de Versões — {instruction.title}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : versions.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center">Nenhuma versão anterior encontrada</p>
        ) : (
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versão</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Alterado por</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>v{v.version_number}</TableCell>
                    <TableCell className="text-xs">{v.file_name}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{v.change_reason}</TableCell>
                    <TableCell className="text-xs">{profiles[v.changed_by] || '—'}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(v.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(v.file_path, v.file_name)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        {versions.length > 1 && (
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteVersion(v)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
