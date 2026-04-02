import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Lightbulb } from 'lucide-react';

interface LinkedIdea {
  id: string;
  title: string;
  is_implemented: boolean;
}

interface Props {
  taskId: string;
}

export function TaskLinkedIdeas({ taskId }: Props) {
  const [ideas, setIdeas] = useState<LinkedIdea[]>([]);

  useEffect(() => {
    const fetch = async () => {
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
    fetch();
  }, [taskId]);

  if (ideas.length === 0) return null;

  return (
    <div>
      <Label className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-4 w-4" /> Ideias Vinculadas
      </Label>
      <div className="space-y-1.5">
        {ideas.map((idea) => (
          <div key={idea.id} className="flex items-center gap-2 text-sm rounded-md border border-border px-3 py-1.5">
            <span className="flex-1 truncate">{idea.title}</span>
            <Badge variant={idea.is_implemented ? 'default' : 'secondary'} className="text-xs">
              {idea.is_implemented ? 'Implementada' : 'Pendente'}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
