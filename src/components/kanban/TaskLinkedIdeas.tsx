import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lightbulb, Search, X, Link } from 'lucide-react';

interface LinkedIdea {
  id: string;
  title: string;
  is_implemented: boolean;
}

interface SearchIdea {
  id: string;
  title: string;
}

interface Props {
  taskId: string;
  isOwner?: boolean;
}

export function TaskLinkedIdeas({ taskId, isOwner = false }: Props) {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<LinkedIdea[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchIdea[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchLinked = async () => {
    const { data: links } = await supabase
      .from('idea_tasks')
      .select('idea_id')
      .eq('task_id', taskId);

    if (!links || links.length === 0) {
      setIdeas([]);
      return;
    }

    const ideaIds = links.map((l) => l.idea_id);
    const { data } = await supabase
      .from('ideas')
      .select('id, title, is_implemented')
      .in('id', ideaIds);

    setIdeas(data || []);
  };

  useEffect(() => {
    fetchLinked();
  }, [taskId]);

  useEffect(() => {
    if (!search.trim() || search.length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const linkedIds = ideas.map((i) => i.id);
      const { data } = await supabase
        .from('ideas')
        .select('id, title')
        .ilike('title', `%${search}%`)
        .limit(5);
      setResults((data || []).filter((i) => !linkedIds.includes(i.id)));
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, ideas]);

  const linkIdea = async (ideaId: string) => {
    if (!user) return;
    await supabase.from('idea_tasks').insert({
      idea_id: ideaId,
      task_id: taskId,
      linked_by: user.id,
    });
    setSearch('');
    setResults([]);
    fetchLinked();
  };

  const unlinkIdea = async (ideaId: string) => {
    await supabase
      .from('idea_tasks')
      .delete()
      .eq('idea_id', ideaId)
      .eq('task_id', taskId);
    fetchLinked();
  };

  if (ideas.length === 0 && !isOwner) return null;

  return (
    <div>
      <Label className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-4 w-4" /> Ideias Vinculadas
      </Label>

      {isOwner && (
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ideia para vincular..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
              {results.map((idea) => (
                <button
                  key={idea.id}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => linkIdea(idea.id)}
                >
                  <span className="truncate">{idea.title}</span>
                  <Link className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {ideas.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma ideia vinculada</p>
      )}

      <div className="space-y-1.5">
        {ideas.map((idea) => (
          <div key={idea.id} className="flex items-center gap-2 text-sm rounded-md border border-border px-3 py-1.5">
            <span className="flex-1 truncate">{idea.title}</span>
            <Badge variant={idea.is_implemented ? 'default' : 'secondary'} className="text-xs">
              {idea.is_implemented ? 'Implementada' : 'Pendente'}
            </Badge>
            {isOwner && (
              <button onClick={() => unlinkIdea(idea.id)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
