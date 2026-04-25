import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { getCurrentLocale } from '@/lib/date';
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
  const { t } = useTranslation('workInstructions');
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
      toast({ title: t('versions.errorDownload'), description: error.message, variant: 'destructive' });
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
      toast({ title: t('versions.errorLastVersion'), variant: 'destructive' });
      return;
    }
    if (!confirm(t('versions.confirmDelete'))) return;

    await supabase.storage.from('work-instructions').remove([version.file_path]);
    await supabase.from('work_instruction_versions').delete().eq('id', version.id);

    toast({ title: t('versions.removed') });
    fetchVersions();
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('versions.title', { title: instruction.title })}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground">{t('versions.loading')}</p>
        ) : versions.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center">{t('versions.empty')}</p>
        ) : (
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('versions.version')}</TableHead>
                  <TableHead>{t('versions.file')}</TableHead>
                  <TableHead>{t('versions.reason')}</TableHead>
                  <TableHead>{t('versions.changedBy')}</TableHead>
                  <TableHead>{t('versions.date')}</TableHead>
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
                      {format(new Date(v.created_at), 'P HH:mm', { locale: getCurrentLocale() })}
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
