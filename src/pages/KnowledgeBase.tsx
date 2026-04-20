import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, ExternalLink, FileText, Users, User } from 'lucide-react';
import { CreateKnowledgeDialog } from '@/components/knowledge/CreateKnowledgeDialog';
import { EditKnowledgeDialog } from '@/components/knowledge/EditKnowledgeDialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ListSkeleton } from '@/components/ui/loaders';
import { BookMarked } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KnowledgeSource {
  id: string;
  title: string;
  description: string | null;
  reference_url: string | null;
  file_path: string | null;
  file_name: string | null;
  scope: string;
  team_id: string | null;
  created_by: string;
  created_at: string;
}

export default function KnowledgeBase() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editSource, setEditSource] = useState<KnowledgeSource | null>(null);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['knowledge-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_sources')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as KnowledgeSource[];
    },
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['user-teams-for-knowledge'],
    queryFn: async () => {
      if (!user) return [];
      const { data: memberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id);
      if (!memberships?.length) return [];
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', memberships.map((m) => m.team_id));
      return teamData || [];
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return sources;
    const q = search.toLowerCase();
    return sources.filter((s) => s.title.toLowerCase().includes(q));
  }, [sources, search]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Fonte de Conhecimento</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Nova Fonte
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filtrar por título..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <ListSkeleton variant="card" rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title={search ? 'Nenhuma fonte encontrada' : 'Nenhuma fonte cadastrada'}
          description={
            search
              ? 'Tente buscar por outro termo.'
              : 'Centralize links e arquivos de referência da sua equipe em um só lugar.'
          }
          action={
            search
              ? undefined
              : { label: 'Adicionar primeira fonte', onClick: () => setCreateOpen(true) }
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((source) => (
            <Card
              key={source.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setEditSource(source)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-2 text-base">{source.title}</CardTitle>
                  <Badge variant={source.scope === 'team' ? 'default' : 'secondary'} className="shrink-0">
                    {source.scope === 'team' ? (
                      <><Users className="mr-1 h-3 w-3" />Equipe</>
                    ) : (
                      <><User className="mr-1 h-3 w-3" />Individual</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {source.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{source.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {source.reference_url && (
                    <Badge variant="outline" className="gap-1">
                      <ExternalLink className="h-3 w-3" />Link
                    </Badge>
                  )}
                  {source.file_name && (
                    <Badge variant="outline" className="gap-1">
                      <FileText className="h-3 w-3" />{source.file_name}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(source.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateKnowledgeDialog open={createOpen} onOpenChange={setCreateOpen} teams={teams} />
      <EditKnowledgeDialog
        open={!!editSource}
        onOpenChange={(open) => !open && setEditSource(null)}
        source={editSource}
        teams={teams}
        isOwner={editSource?.created_by === user?.id}
      />
    </div>
  );
}
