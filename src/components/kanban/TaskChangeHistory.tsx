import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface ChangeLog {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  user_id: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  display_name: string;
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Título',
  description: 'Descrição',
  status: 'Status',
  start_date: 'Data início',
  actual_end_date: 'Data fim real',
  estimated_delivery_date: 'Previsão entrega',
  assignee_added: 'Responsável adicionado',
  assignee_removed: 'Responsável removido',
};

export function TaskChangeHistory({ taskId }: { taskId: string }) {
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchLogs();
  }, [open, taskId]);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('task_change_logs')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      setLogs(data);
      const userIds = [...new Set(data.map((l) => l.user_id))];
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);
      if (profs) {
        const map = new Map<string, string>();
        profs.forEach((p: Profile) => map.set(p.user_id, p.display_name));
        setProfiles(map);
      }
    } else {
      setLogs([]);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sm font-semibold">
          <History className="h-4 w-4" />
          Histórico de Alterações ({open ? 'ocultar' : 'expandir'})
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 max-h-48 overflow-y-auto mt-2">
          {logs.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma alteração registrada</p>
          )}
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="text-foreground">
                <span className="font-medium">{FIELD_LABELS[log.field_name] || log.field_name}</span>
                {log.old_value && log.new_value && (
                  <>: <span className="text-muted-foreground line-through">{log.old_value}</span> → <span>{log.new_value}</span></>
                )}
                {!log.old_value && log.new_value && <>: <span>{log.new_value}</span></>}
                {log.old_value && !log.new_value && <>: <span className="text-muted-foreground line-through">{log.old_value}</span> → <span className="italic">vazio</span></>}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {profiles.get(log.user_id) || 'Usuário'} • {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
