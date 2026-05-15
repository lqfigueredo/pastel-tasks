import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Task, TaskStatus } from '@/types/kanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AssigneeSelector } from './AssigneeSelector';
import { format } from 'date-fns';
import { getCurrentLocale } from '@/lib/date';
import { MessageSquare, Send, AlertTriangle, FileText, Copy, CheckCircle2, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { TaskAttachments } from './TaskAttachments';
import { TaskChangeHistory } from './TaskChangeHistory';
import { TaskTimer } from './TaskTimer';
import { TaskLinkedIdeas } from './TaskLinkedIdeas';
import {
  ResponsiveDialog,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from '@/components/ui/responsive-dialog';

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
  const { t } = useTranslation('kanban');
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
      toast({ title: t('detail.justifyRequired'), variant: 'destructive' });
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
      content: t('detail.dateChanged', { reason: justification }),
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

  const isValidDate = (d: string) => {
    if (!d) return true;
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return false;
    const year = parseInt(m[1], 10);
    return year >= 1900 && year <= 2100;
  };

  const handleSave = async () => {
    if (!isValidDate(startDate) || !isValidDate(estimatedDate) || !isValidDate(actualEndDate)) {
      toast({ title: t('detail.invalidDate'), description: t('detail.yearRange'), variant: 'destructive' });
      return;
    }
    setSaving(true);

    // Note: change logs are now generated automatically by the database
    // (trigger trg_log_task_changes on tasks + trg_log_task_assignee_changes on task_assignees).

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
      toast({ title: t('detail.errorSave'), variant: 'destructive' });
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

      toast({ title: t('detail.updated') });
      onRefresh();
      onOpenChange(false);
    }
    setSaving(false);
  };

  const handleToggleArchive = async (currentlyArchived: boolean) => {
    setSaving(true);
    const newDate = currentlyArchived ? null : new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from('tasks')
      .update({ actual_end_date: newDate })
      .eq('id', task.id);
    if (error) {
      toast({ title: t('detail.errorSave'), variant: 'destructive' });
      setSaving(false);
      return;
    }
    if (task.meeting_pendency_id) {
      await supabase
        .from('meeting_pendencies')
        .update({
          is_completed: !!newDate,
          completed_at: newDate ? new Date().toISOString() : null,
        })
        .eq('id', task.meeting_pendency_id);
    }
    setActualEndDate(newDate || '');
    toast({ title: currentlyArchived ? t('detail.reopenedToast') : t('detail.archivedToast') });
    onRefresh();
    onOpenChange(false);
    setSaving(false);
  };

  const addComment = async () => {
    if (!newComment.trim() || !user) return;
    const { error } = await supabase.from('task_comments').insert({
      task_id: task.id,
      user_id: user.id,
      content: newComment.trim(),
      comment_type: 'normal',
    });
    if (error) {
      toast({ title: t('detail.errorComment'), description: t('detail.errorCommentDesc'), variant: 'destructive' });
      return;
    }
    setNewComment('');
    fetchComments();
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(task.id);
      toast({ title: t('detail.idCopied'), description: task.id });
    } catch {
      toast({ title: t('detail.errorCopy'), variant: 'destructive' });
    }
  };

  const shortId = task.id.slice(0, 8);

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={onOpenChange} contentClassName="max-w-xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 flex-wrap">
            <span>{t('detail.title')}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="inline-flex items-center"
                    aria-label={t('detail.copyId')}
                  >
                    <Badge variant="secondary" className="font-mono text-xs gap-1 cursor-pointer hover:bg-secondary/80">
                      #{shortId}
                      <Copy className="h-3 w-3" />
                    </Badge>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">{task.id}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('detail.clickToCopy')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{t('detail.description')}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

          <div className="space-y-4">

            <div className="space-y-2">
              <Label>{t('detail.fields.title')}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>{t('detail.fields.fullDescription')}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>

            <div className="space-y-2">
              <Label>{t('detail.fields.status')}</Label>
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
              <Label>{t('detail.fields.assignees')}</Label>
              <AssigneeSelector selectedIds={assigneeIds} onChange={setAssigneeIds} />
            </div>

            {pendencyText && (
              <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-primary mb-1">{t('detail.fromMeetingLabel')}</p>
                  <p className="text-sm text-foreground">{pendencyText}</p>
                </div>
              </div>
            )}

            {/* Critical task toggle */}
            <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <Label htmlFor="critical-detail-toggle" className="cursor-pointer text-sm font-medium">{t('detail.fields.critical')}</Label>
              </div>
              <Switch id="critical-detail-toggle" checked={isCritical} onCheckedChange={setIsCritical} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>{t('detail.fields.start')}</Label>
                <Input type="date" min="1900-01-01" max="2100-12-31" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('detail.fields.estimated')}</Label>
                <Input type="date" min="1900-01-01" max="2100-12-31" value={estimatedDate} onChange={(e) => handleEstimatedDateChange(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('detail.fields.actualEnd')}</Label>
                <Input type="date" min="1900-01-01" max="2100-12-31" value={actualEndDate} onChange={(e) => setActualEndDate(e.target.value)} />
              </div>
            </div>

            <Separator />

            <TaskChangeHistory taskId={task.id} />

            <div className="flex flex-wrap justify-end gap-2">
              {actualEndDate ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={saving}
                  onClick={() => handleToggleArchive(true)}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('detail.reopen')}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 text-success border-success/40 hover:bg-success/10 hover:text-success"
                  disabled={saving}
                  onClick={() => handleToggleArchive(false)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t('detail.completeAndArchive')}
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t('detail.cancel')}</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? t('detail.saving') : t('detail.save')}</Button>
            </div>

            <Separator />

            <TaskAttachments taskId={task.id} />

            <Separator />

            <TaskLinkedIdeas taskId={task.id} isOwner={task.created_by === user?.id} />

            <Separator />

            <TaskTimer taskId={task.id} />

            <Separator />

            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
                <MessageSquare className="h-4 w-4" /> {t('detail.comments')}
              </h4>
              <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">{t('detail.noComments')}</p>
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
                      {format(new Date(c.created_at), 'Pp', { locale: getCurrentLocale() })}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={t('detail.addComment')}
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
      </ResponsiveDialog>

      <ResponsiveDialog open={justifyOpen} onOpenChange={(o) => { if (!o) { setJustifyOpen(false); setPendingDate(''); } }}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t('detail.justifyTitle')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('detail.justifyDescription')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <Textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder={t('detail.justifyPlaceholder')}
          rows={3}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => { setJustifyOpen(false); setPendingDate(''); }}>
            {t('detail.cancel')}
          </Button>
          <Button onClick={handleJustifyConfirm}>{t('detail.justifyConfirm')}</Button>
        </div>
      </ResponsiveDialog>
    </>
  );
}
