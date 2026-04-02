import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Task, TaskStatus } from './KanbanBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AssigneeSelector } from './AssigneeSelector';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Send, AlertTriangle, X, FileText } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { TaskAttachments } from './TaskAttachments';
import { TaskChangeHistory } from './TaskChangeHistory';
import { TaskTimer } from './TaskTimer';
import { TaskLinkedIdeas } from './TaskLinkedIdeas';

interface Comment {
  id: string;
  content: string;
  comment_type: string;
  created_at: string;
  user_id: string;
}

interface Props {
  task: Task;
  allStatuses: TaskStatus[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function TaskDetailDialog({ task, allStatuses, open, onOpenChange, onRefresh }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [statusId, setStatusId] = useState(task.status_id);
  const [startDate, setStartDate] = useState(task.start_date || '');
  const [endDate, setEndDate] = useState(task.end_date || '');
  const [estimatedDate, setEstimatedDate] = useState(task.estimated_delivery_date || '');
  const [actualEndDate, setActualEndDate] = useState(task.actual_end_date || '');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assignees.map((a) => a.user_id));
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCritical, setIsCritical] = useState(task.is_critical);
  const [saving, setSaving] = useState(false);
  const [pendencyText, setPendencyText] = useState<string | null>(null);

  const [justifyOpen, setJustifyOpen] = useState(false);
  const [justification, setJustification] = useState('');
  const [pendingDate, setPendingDate] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatusId(task.status_id);
      setStartDate(task.start_date || '');
      setEndDate(task.end_date || '');
      setEstimatedDate(task.estimated_delivery_date || '');
      setActualEndDate(task.actual_end_date || '');
      setIsCritical(task.is_critical);
      setAssigneeIds(task.assignees.map((a) => a.user_id));
      fetchComments();
      // Fetch linked pendency text
      if (task.meeting_pendency_id) {
        supabase.from('meeting_pendencies').select('description').eq('id', task.meeting_pendency_id).single().then(({ data }) => {
          setPendencyText(data?.description || null);
        });
      } else {
        setPendencyText(null);
      }
    }
  }, [open, task]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true });
    if (data) setComments(data);
  };

  const handleEstimatedDateChange = (newDate: string) => {
    if (task.estimated_delivery_date && newDate !== task.estimated_delivery_date) {
      setPendingDate(newDate);
      setJustifyOpen(true);
    } else {
      setEstimatedDate(newDate);
    }
  };

  const handleJustifyConfirm = async () => {
    if (!justification.trim()) {
      toast({ title: 'Justificativa obrigatória', variant: 'destructive' });
      return;
    }
    await supabase.from('delivery_date_logs').insert({
      task_id: task.id,
      old_date: task.estimated_delivery_date,
      new_date: pendingDate,
      changed_by: user!.id,
    });
    await supabase.from('task_comments').insert({
      task_id: task.id,
      user_id: user!.id,
      content: `📅 Data de previsão alterada: ${justification}`,
      comment_type: 'justification',
    });
    setEstimatedDate(pendingDate);
    setJustifyOpen(false);
    setJustification('');
    setPendingDate('');
    fetchComments();
  };

  const saveAssignees = async () => {
    const currentIds = task.assignees.map((a) => a.user_id);
    const toAdd = assigneeIds.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter((id) => !assigneeIds.includes(id));

    if (toAdd.length > 0) {
      await supabase.from('task_assignees').insert(
        toAdd.map((user_id) => ({ task_id: task.id, user_id }))
      );
    }
    if (toRemove.length > 0) {
      await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', task.id)
        .in('user_id', toRemove);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    // Build change logs
    const changes: { field_name: string; old_value: string | null; new_value: string | null }[] = [];
    if (title !== task.title) changes.push({ field_name: 'title', old_value: task.title, new_value: title });
    if ((description || '') !== (task.description || '')) changes.push({ field_name: 'description', old_value: task.description || '', new_value: description || '' });
    if (statusId !== task.status_id) {
      const oldName = allStatuses.find(s => s.id === task.status_id)?.name || '';
      const newName = allStatuses.find(s => s.id === statusId)?.name || '';
      changes.push({ field_name: 'status', old_value: oldName, new_value: newName });
    }
    if ((startDate || '') !== (task.start_date || '')) changes.push({ field_name: 'start_date', old_value: task.start_date || null, new_value: startDate || null });
    if ((estimatedDate || '') !== (task.estimated_delivery_date || '')) changes.push({ field_name: 'estimated_delivery_date', old_value: task.estimated_delivery_date || null, new_value: estimatedDate || null });
    if ((actualEndDate || '') !== (task.actual_end_date || '')) changes.push({ field_name: 'actual_end_date', old_value: task.actual_end_date || null, new_value: actualEndDate || null });
    if (isCritical !== task.is_critical) changes.push({ field_name: 'is_critical', old_value: String(task.is_critical), new_value: String(isCritical) });

    const { error } = await supabase.from('tasks').update({
      title,
      description: description || null,
      status_id: statusId,
      start_date: startDate || null,
      end_date: endDate || null,
      estimated_delivery_date: estimatedDate || null,
      actual_end_date: actualEndDate || null,
      is_critical: isCritical,
    }).eq('id', task.id);

    if (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } else {
      await saveAssignees();

      // Sync meeting pendency completion status
      if (task.meeting_pendency_id && actualEndDate && !task.actual_end_date) {
        await supabase.from('meeting_pendencies').update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        }).eq('id', task.meeting_pendency_id);
      } else if (task.meeting_pendency_id && !actualEndDate && task.actual_end_date) {
        await supabase.from('meeting_pendencies').update({
          is_completed: false,
          completed_at: null,
        }).eq('id', task.meeting_pendency_id);
      }

      // Log assignee changes
      const currentIds = task.assignees.map(a => a.user_id);
      const added = assigneeIds.filter(id => !currentIds.includes(id));
      const removed = currentIds.filter(id => !assigneeIds.includes(id));
      for (const id of added) changes.push({ field_name: 'assignee_added', old_value: null, new_value: id });
      for (const id of removed) changes.push({ field_name: 'assignee_removed', old_value: id, new_value: null });

      if (changes.length > 0 && user) {
        await supabase.from('task_change_logs').insert(
          changes.map(c => ({ task_id: task.id, user_id: user.id, ...c }))
        );
      }

      toast({ title: 'Tarefa atualizada!' });
      onRefresh();
      onOpenChange(false);
    }
    setSaving(false);
  };

  const addComment = async () => {
    if (!newComment.trim() || !user) return;
    await supabase.from('task_comments').insert({
      task_id: task.id,
      user_id: user.id,
      content: newComment.trim(),
      comment_type: 'normal',
    });
    setNewComment('');
    fetchComments();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/60" onClick={() => onOpenChange(false)} />
        <div className="relative z-50 w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl animate-fade-in">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold mb-1">Detalhes da Tarefa</h2>
          <p className="text-sm text-muted-foreground mb-4">Edite os campos e salve as alterações</p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Descrição Completa</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allStatuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Responsáveis</Label>
              <AssigneeSelector selectedIds={assigneeIds} onChange={setAssigneeIds} />
            </div>

            {pendencyText && (
              <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-primary mb-1">Origem: Reunião</p>
                  <p className="text-sm text-foreground">{pendencyText}</p>
                </div>
              </div>
            )}

            {/* Critical task toggle */}
            <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <Label htmlFor="critical-detail-toggle" className="cursor-pointer text-sm font-medium">Tarefa Crítica</Label>
              </div>
              <Switch id="critical-detail-toggle" checked={isCritical} onCheckedChange={setIsCritical} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Previsão</Label>
                <Input type="date" value={estimatedDate} onChange={(e) => handleEstimatedDateChange(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fim Real</Label>
                <Input type="date" value={actualEndDate} onChange={(e) => setActualEndDate(e.target.value)} />
              </div>
            </div>

            <Separator />

            <TaskChangeHistory taskId={task.id} />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </div>

            <Separator />

            <TaskAttachments taskId={task.id} />

            <Separator />

            <TaskLinkedIdeas taskId={task.id} />

            <Separator />

            <TaskTimer taskId={task.id} />

            <Separator />

            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
                <MessageSquare className="h-4 w-4" /> Comentários
              </h4>
              <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum comentário</p>
                )}
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-lg p-3 text-sm ${
                      c.comment_type === 'justification'
                        ? 'bg-secondary border border-secondary'
                        : 'bg-muted/50'
                    }`}
                  >
                    <p className="text-foreground">{c.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(c.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addComment()}
                />
                <Button size="icon" variant="outline" onClick={addComment}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {justifyOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => { setJustifyOpen(false); setPendingDate(''); }} />
          <div className="relative z-[60] w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-fade-in">
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Justificativa Obrigatória
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              A data de previsão de entrega está sendo alterada. Informe o motivo da mudança.
            </p>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Motivo da alteração da data..."
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setJustifyOpen(false); setPendingDate(''); }}>
                Cancelar
              </Button>
              <Button onClick={handleJustifyConfirm}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
