import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'task' | 'idea' | 'instruction' | 'meeting' | 'knowledge';
  route: string;
}

const LIMIT = 5;

export function useGlobalSearch(query: string) {
  const { user } = useAuth();
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['global-search', user?.id, trimmed],
    enabled: !!user && trimmed.length >= 2,
    staleTime: 60_000,
    queryFn: async (): Promise<SearchResult[]> => {
      const term = `%${trimmed}%`;

      const [tasks, ideas, instructions, meetings, knowledge] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, description')
          .or(`title.ilike.${term},description.ilike.${term}`)
          .limit(LIMIT),
        supabase
          .from('ideas')
          .select('id, title, description')
          .or(`title.ilike.${term},description.ilike.${term}`)
          .limit(LIMIT),
        supabase
          .from('work_instructions')
          .select('id, title, description')
          .ilike('title', term)
          .limit(LIMIT),
        supabase
          .from('meeting_minutes')
          .select('id, description, meeting_date')
          .ilike('description', term)
          .limit(LIMIT),
        supabase
          .from('knowledge_sources')
          .select('id, title, description')
          .or(`title.ilike.${term},description.ilike.${term}`)
          .limit(LIMIT),
      ]);

      const results: SearchResult[] = [];

      (tasks.data || []).forEach((t) => {
        results.push({
          id: t.id,
          title: t.title,
          subtitle: t.description?.slice(0, 80) || undefined,
          type: 'task',
          route: `/tarefas?taskId=${t.id}`,
        });
      });

      (ideas.data || []).forEach((i) => {
        results.push({
          id: i.id,
          title: i.title,
          subtitle: i.description?.slice(0, 80) || undefined,
          type: 'idea',
          route: `/ideias`,
        });
      });

      (instructions.data || []).forEach((w) => {
        results.push({
          id: w.id,
          title: w.title,
          subtitle: w.description?.slice(0, 80) || undefined,
          type: 'instruction',
          route: `/instrucoes`,
        });
      });

      (meetings.data || []).forEach((m) => {
        results.push({
          id: m.id,
          title: m.description?.slice(0, 60) || 'Ata sem descrição',
          subtitle: m.meeting_date,
          type: 'meeting',
          route: `/atas/${m.id}`,
        });
      });

      (knowledge.data || []).forEach((k) => {
        results.push({
          id: k.id,
          title: k.title,
          subtitle: k.description?.slice(0, 80) || undefined,
          type: 'knowledge',
          route: `/conhecimento`,
        });
      });

      return results;
    },
  });
}
