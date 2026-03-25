import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Task, TaskStatus } from './KanbanBoard';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Send, AlertTriangle } from 'lucide-react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

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
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);

  // Justification modal state
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
      fetchComments();
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

    // Log the change
    await supabase.from('delivery_date_logs').insert({
      task_id: task.id,
      old_date: task.estimated_delivery_date,
      new_date: pendingDate,
      changed_by: user!.id,
    });

    // Add justification comment
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

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('tasks').update({
      title,
      description: description || null,
      status_id: statusId,
      start_date: startDate || null,
      end_date: endDate || null,
      estimated_delivery_date: estimatedDate || null,
    }).eq('id', task.id);

    if (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } else {
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Tarefa</DialogTitle>
            <DialogDescription>Edite os campos e salve as alterações</DialogDescription>
          </DialogHeader>

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
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </div>

            <Separator />

            {/* Comments */}
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
        </DialogContent>
      </Dialog>

      {/* Justification Alert */}
      <AlertDialog open={justifyOpen} onOpenChange={setJustifyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Justificativa Obrigatória
            </AlertDialogTitle>
            <AlertDialogDescription>
              A data de previsão de entrega está sendo alterada. Informe o motivo da mudança.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Motivo da alteração da data..."
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setJustifyOpen(false); setPendingDate(''); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleJustifyConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
