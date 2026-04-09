import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Repeat, Pause, Play, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RecurringTask {
  id: string;
  title: string;
  recurrence_type: string;
  recurrence_day: number | null;
  next_run_date: string;
  is_active: boolean;
  created_at: string;
}

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function describeRecurrence(type: string, day: number | null): string {
  if (type === 'daily') return 'Diária';
  if (type === 'weekly') return `Semanal — ${WEEKDAYS[day ?? 0]}`;
  if (type === 'monthly') return `Mensal — Dia ${day ?? 1}`;
  if (type === 'yearly') return `Anual — ${MONTHS[day ?? 0]}`;
  return type;
}

export function RecurringTasksSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<RecurringTask | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTasks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('recurring_tasks')
      .select('id, title, recurrence_type, recurrence_day, next_run_date, is_active, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [user]);

  const toggleActive = async (task: RecurringTask) => {
    const { error } = await supabase
      .from('recurring_tasks')
      .update({ is_active: !task.is_active })
      .eq('id', task.id);

    if (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    } else {
      toast({ title: task.is_active ? 'Recorrência pausada' : 'Recorrência ativada' });
      await fetchTasks();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from('recurring_tasks')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    } else {
      toast({ title: 'Recorrência excluída' });
      await fetchTasks();
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Repeat className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Tarefas Recorrentes</h2>
      </div>
      <p className="text-sm text-muted-foreground">Gerencie suas tarefas que se repetem automaticamente.</p>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma tarefa recorrente criada.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-lg bg-muted/30 ${!task.is_active ? 'opacity-50' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {describeRecurrence(task.recurrence_type, task.recurrence_day)}
                  {' · '}Próxima: {task.next_run_date}
                </p>
              </div>
              <Badge variant={task.is_active ? 'default' : 'secondary'} className="text-xs shrink-0">
                {task.is_active ? 'Ativa' : 'Pausada'}
              </Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(task)}>
                {task.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(task)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recorrência "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              A recorrência será removida. Tarefas já criadas não serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
