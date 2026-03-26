import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Loader2, Pencil, Check, X, GripVertical, AlertTriangle, RotateCcw, ChevronDown } from 'lucide-react';
import { RecurringTasksSettings } from '@/components/settings/RecurringTasksSettings';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Status {
  id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  deleted_at: string | null;
}

const PASTEL_COLORS = [
  '#B2DFDB', '#E0F2F1', '#DCEDC8', '#FFF9C4',
  '#F8BBD0', '#D1C4E9', '#BBDEFB', '#FFE0B2',
  '#FFCCBC', '#C8E6C9', '#B3E5FC', '#F0F4C3',
  '#CFD8DC', '#D7CCC8', '#FFCDD2', '#E1BEE7',
];

const Settings = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [archivedStatuses, setArchivedStatuses] = useState<Status[]>([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PASTEL_COLORS[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ status: Status; taskCount: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStatuses = async () => {
    const { data } = await supabase.from('task_statuses').select('*').order('position');
    if (data) {
      setStatuses(data.filter(s => !s.deleted_at));
      setArchivedStatuses(data.filter(s => !!s.deleted_at));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user]);

  useEffect(() => { fetchStatuses(); }, []);

  const getFallbackStatus = () => statuses.find(s => s.is_default && s.position === 0) || statuses.find(s => s.is_default);

  if (isAdmin === null) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const maxPos = statuses.length > 0 ? Math.max(...statuses.map(s => s.position)) : 0;
    const { error } = await supabase.from('task_statuses').insert({
      name: newName.trim(),
      color: newColor,
      position: maxPos + 1,
    });
    if (error) {
      toast({ title: 'Erro ao criar status', variant: 'destructive' });
    } else {
      setNewName('');
      toast({ title: 'Status criado!' });
      await fetchStatuses();
    }
    setSaving(false);
  };

  const handleDeleteClick = async (status: Status) => {
    const fallback = getFallbackStatus();
    if (!fallback || fallback.id === status.id) {
      toast({ title: 'Não é possível arquivar o status padrão', variant: 'destructive' });
      return;
    }

    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status_id', status.id);

    const taskCount = count || 0;

    if (taskCount > 0) {
      setDeleteTarget({ status, taskCount });
    } else {
      await executeArchive(status, 0);
    }
  };

  const executeArchive = async (status: Status, taskCount: number) => {
    const fallback = getFallbackStatus()!;
    setDeleting(true);

    if (taskCount > 0) {
      const { error: moveError } = await supabase
        .from('tasks')
        .update({ status_id: fallback.id })
        .eq('status_id', status.id);

      if (moveError) {
        toast({ title: 'Erro ao migrar tarefas', variant: 'destructive' });
        setDeleting(false);
        setDeleteTarget(null);
        return;
      }
    }

    const { error } = await supabase
      .from('task_statuses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', status.id);

    if (error) {
      toast({ title: 'Erro ao arquivar', variant: 'destructive' });
    } else {
      toast({
        title: 'Status arquivado',
        description: taskCount > 0 ? `${taskCount} tarefa(s) movida(s) para "${fallback.name}".` : undefined,
      });
      await fetchStatuses();
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const handleRestore = async (status: Status) => {
    const maxPos = statuses.length > 0 ? Math.max(...statuses.map(s => s.position)) : 0;
    const { error } = await supabase
      .from('task_statuses')
      .update({ deleted_at: null, position: maxPos + 1 })
      .eq('id', status.id);

    if (error) {
      toast({ title: 'Erro ao restaurar', variant: 'destructive' });
    } else {
      toast({ title: `Status "${status.name}" restaurado!` });
      await fetchStatuses();
    }
  };

  const startEdit = (status: Status) => {
    setEditingId(status.id);
    setEditName(status.name);
    setEditColor(status.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setEditSaving(true);
    const { error } = await supabase
      .from('task_statuses')
      .update({ name: editName.trim(), color: editColor })
      .eq('id', editingId);

    if (error) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    } else {
      toast({ title: 'Status atualizado!' });
      cancelEdit();
      await fetchStatuses();
    }
    setEditSaving(false);
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragEnter = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) return;
    setDragOverIdx(idx);
  };

  const handleDragEnd = async () => {
    if (dragIdx === null || dragOverIdx === null || dragIdx === dragOverIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }

    const reordered = [...statuses];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dragOverIdx, 0, moved);

    const updated = reordered.map((s, i) => ({ ...s, position: i }));
    setStatuses(updated);
    setDragIdx(null);
    setDragOverIdx(null);

    const promises = updated.map((s) =>
      supabase.from('task_statuses').update({ position: s.position }).eq('id', s.id)
    );
    const results = await Promise.all(promises);
    if (results.some((r) => r.error)) {
      toast({ title: 'Erro ao reordenar', variant: 'destructive' });
      await fetchStatuses();
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Configurações</h1>
        <p className="text-sm text-muted-foreground mb-6">Gerencie seu perfil e preferências</p>
      </div>

      {/* Profile */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Perfil</h2>
        <div>
          <label className="text-sm font-medium text-foreground">E-mail</label>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Nome</label>
          <p className="text-sm text-muted-foreground">{user?.user_metadata?.display_name || '—'}</p>
        </div>
      </div>

      {/* Kanban Statuses */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Status do Kanban</h2>
        <p className="text-sm text-muted-foreground">Gerencie as colunas do seu quadro Kanban. Arraste para reordenar.</p>

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-1">
            {statuses.map((s, idx) => (
              <div
                key={s.id}
                draggable={editingId !== s.id}
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/30 transition-all cursor-grab active:cursor-grabbing ${
                  dragOverIdx === idx ? 'border-2 border-primary/50' : 'border-2 border-transparent'
                }`}
              >
                {editingId === s.id ? (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {PASTEL_COLORS.map((c) => (
                        <button
                          key={c}
                          className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
                          style={{
                            backgroundColor: c,
                            borderColor: editColor === c ? 'hsl(var(--foreground))' : 'transparent',
                          }}
                          onClick={() => setEditColor(c)}
                        />
                      ))}
                    </div>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                      className="flex-1 h-8 text-sm"
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit} disabled={editSaving || !editName.trim()}>
                      {editSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-green-600" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </>
                ) : (
                  <>
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-sm font-medium text-foreground flex-1">{s.name}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(s)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    {!s.is_default && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteClick(s)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create new */}
        <div className="pt-2 border-t border-border/50 space-y-3">
          <p className="text-sm font-medium text-foreground">Novo status</p>
          <div className="flex flex-wrap gap-2">
            {PASTEL_COLORS.map((c) => (
              <button
                key={c}
                className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: newColor === c ? 'hsl(var(--foreground))' : 'transparent',
                }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Nome do status"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1"
            />
            <Button onClick={handleCreate} disabled={saving || !newName.trim()} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar
            </Button>
          </div>
        </div>

        {/* Archived statuses */}
        {archivedStatuses.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-2">
                <ChevronDown className={`h-4 w-4 transition-transform ${archivedOpen ? 'rotate-180' : ''}`} />
                Status arquivados ({archivedStatuses.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pt-1">
                {archivedStatuses.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/20 opacity-70"
                  >
                    <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-sm text-foreground flex-1">{s.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleRestore(s)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restaurar
                    </Button>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>

      {/* Recurring Tasks */}
      <RecurringTasksSettings />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Arquivar status "{deleteTarget?.status.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.taskCount === 1
                ? `Existe 1 tarefa usando este status. Ela será movida para "${getFallbackStatus()?.name || 'Não Afiliado'}".`
                : `Existem ${deleteTarget?.taskCount} tarefas usando este status. Elas serão movidas para "${getFallbackStatus()?.name || 'Não Afiliado'}".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && executeArchive(deleteTarget.status, deleteTarget.taskCount)}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Arquivar e migrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
