import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const actionLabels: Record<string, string> = {
  created: 'Criado',
  updated_metadata: 'Metadados atualizados',
  updated_file: 'Documento atualizado',
  deleted_version: 'Versão removida',
  deleted: 'Excluído',
};

export function InstructionLogs({ instruction, onClose, profiles }: Props) {
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

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log de Alterações — {instruction.title}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : logs.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center">Nenhum registro encontrado</p>
        ) : (
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ação</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm font-medium">{actionLabels[log.action] || log.action}</TableCell>
                    <TableCell className="text-xs max-w-[250px] truncate">{log.details || '—'}</TableCell>
                    <TableCell className="text-xs">{profiles[log.user_id] || '—'}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
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
