import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Link2, X, Search, Plus } from 'lucide-react';

interface LinkedTask {
  id: string;
  task_id: string;
  task_title: string;
  status_name: string;
  status_color: string;
}

interface Props {
  ideaId: string;
  isOwner: boolean;
}

export function IdeaLinkedTasks({ ideaId, isOwner }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [linkedTasks, setLinkedTasks] = useState<LinkedTask[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; title: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const fetchLinkedTasks = async () => {
    const { data: links } = await supabase
      .from('idea_tasks')
      .select('id, task_id')
      .eq('idea_id', ideaId);

    if (!links || links.length === 0) {
      setLinkedTasks([]);
      return;
    }

    const taskIds = links.map((l) => l.task_id);
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status_id')
      .in('id', taskIds);

    if (!tasks) return;

    const statusIds = [...new Set(tasks.map((t) => t.status_id))];
    const { data: statuses } = await supabase
      .from('task_statuses')
      .select('id, name, color')
      .in('id', statusIds);

    const statusMap = new Map(statuses?.map((s) => [s.id, s]) || []);

    setLinkedTasks(
      links.map((link) => {
        const task = tasks.find((t) => t.id === link.task_id);
        const status = task ? statusMap.get(task.status_id) : null;
        return {
          id: link.id,
          task_id: link.task_id,
          task_title: task?.title || 'Tarefa não encontrada',
          status_name: status?.name || '',
          status_color: status?.color || '#94A3B8',
        };
      })
    );
  };

  useEffect(() => {
    fetchLinkedTasks();
  }, [ideaId]);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from('tasks')
      .select('id, title')
      .ilike('title', `%${term}%`)
      .limit(10);

    const linkedIds = new Set(linkedTasks.map((l) => l.task_id));
    setSearchResults((data || []).filter((t) => !linkedIds.has(t.id)));
    setSearching(false);
  };

  const linkTask = async (taskId: string) => {
    if (!user) return;
    const { error } = await supabase.from('idea_tasks').insert({
      idea_id: ideaId,
      task_id: taskId,
      linked_by: user.id,
    });
    if (error) {
      toast({ title: 'Erro ao vincular tarefa', variant: 'destructive' });
      return;
    }
    setSearchTerm('');
    setSearchResults([]);
    fetchLinkedTasks();
    toast({ title: 'Tarefa vinculada!' });
  };

  const unlinkTask = async (linkId: string) => {
    await supabase.from('idea_tasks').delete().eq('id', linkId);
    fetchLinkedTasks();
    toast({ title: 'Vínculo removido' });
  };

  return (
    <div>
      <Label className="flex items-center gap-2 mb-2">
        <Link2 className="h-4 w-4" /> Tarefas Vinculadas
      </Label>

      {linkedTasks.length === 0 && (
        <p className="text-xs text-muted-foreground mb-2">Nenhuma tarefa vinculada</p>
      )}

      <div className="space-y-1.5 mb-2">
        {linkedTasks.map((lt) => (
          <div key={lt.id} className="flex items-center gap-2 text-sm rounded-md border border-border px-3 py-1.5">
            <span className="flex-1 truncate">{lt.task_title}</span>
            {lt.status_name && (
              <Badge variant="outline" style={{ borderColor: lt.status_color, color: lt.status_color }} className="text-xs">
                {lt.status_name}
              </Badge>
            )}
            {isOwner && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => unlinkTask(lt.id)}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {isOwner && (
        <>
          {!showSearch ? (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowSearch(true)}>
              <Plus className="h-3 w-3" /> Vincular tarefa
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar tarefa pelo título..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  autoFocus
                />
              </div>
              {searchResults.length > 0 && (
                <div className="border border-border rounded-md max-h-32 overflow-y-auto">
                  {searchResults.map((t) => (
                    <button
                      key={t.id}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
                      onClick={() => linkTask(t.id)}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              )}
              {searchTerm.length >= 2 && searchResults.length === 0 && !searching && (
                <p className="text-xs text-muted-foreground">Nenhuma tarefa encontrada</p>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setShowSearch(false); setSearchTerm(''); setSearchResults([]); }}>
                Cancelar
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
