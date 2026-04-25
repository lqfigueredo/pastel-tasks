import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { getCurrentLocale } from '@/lib/date';

interface Log {
  id: string;
  action: string;
  details: string | null;
  user_id: string;
  created_at: string;
}

interface Props {
  instruction: { id: string; title: string };
  onClose: () => void;
  profiles: Record<string, string>;
}

export function InstructionLogs({ instruction, onClose, profiles }: Props) {
  const { t } = useTranslation('workInstructions');
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('work_instruction_logs')
      .select('*')
      .eq('instruction_id', instruction.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setLogs((data as Log[]) || []);
        setLoading(false);
      });
  }, [instruction.id]);

  const actionLabel = (action: string) => {
    const key = `logs.actions.${action}`;
    const translated = t(key);
    return translated === key ? action : translated;
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('logs.title', { title: instruction.title })}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground">{t('logs.loading')}</p>
        ) : logs.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center">{t('logs.empty')}</p>
        ) : (
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('logs.action')}</TableHead>
                  <TableHead>{t('logs.details')}</TableHead>
                  <TableHead>{t('logs.user')}</TableHead>
                  <TableHead>{t('logs.date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm font-medium">{actionLabel(log.action)}</TableCell>
                    <TableCell className="text-xs max-w-[250px] truncate">{log.details || '—'}</TableCell>
                    <TableCell className="text-xs">{profiles[log.user_id] || '—'}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(log.created_at), 'P HH:mm', { locale: getCurrentLocale() })}
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
