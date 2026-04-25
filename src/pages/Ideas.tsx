import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Lightbulb } from 'lucide-react';
import { CreateIdeaDialog } from '@/components/ideas/CreateIdeaDialog';
import { EditIdeaDialog } from '@/components/ideas/EditIdeaDialog';
import { EmptyState } from '@/components/ui/empty-state';
import { format } from 'date-fns';

interface Idea {
  id: string;
  title: string;
  description: string | null;
  is_implemented: boolean;
  created_by: string;
  created_at: string;
  team_id: string | null;
  profiles?: { display_name: string } | null;
  teams?: { name: string } | null;
}

export default function Ideas() {
  const { user } = useAuth();
  const { t } = useTranslation('ideas');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editIdea, setEditIdea] = useState<Idea | null>(null);

  const { data: ideas = [] } = useQuery({
    queryKey: ['ideas', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('ideas')
        .select('*')
        .order('created_at', { ascending: false });
      if (!data) return [] as Idea[];

      const userIds = [...new Set(data.map((i) => i.created_by))];
      const teamIds = [...new Set(data.map((i) => i.team_id).filter(Boolean))] as string[];

      const [{ data: profiles }, { data: teamsData }] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name').in('user_id', userIds),
        teamIds.length > 0
          ? supabase.from('teams').select('id, name').in('id', teamIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      ]);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.display_name]) || []);
      const teamMap = new Map(teamsData?.map((t) => [t.id, t.name]) || []);

      return data.map((i) => ({
        ...i,
        profiles: { display_name: profileMap.get(i.created_by) || t('table.userFallback') },
        teams: i.team_id ? { name: teamMap.get(i.team_id) || '' } : null,
      })) as Idea[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const fetchIdeasWithProfiles = () => queryClient.invalidateQueries({ queryKey: ['ideas', user?.id] });

  const filtered = ideas.filter((idea) => {
    const matchSearch =
      !search ||
      idea.title.toLowerCase().includes(search.toLowerCase()) ||
      idea.description?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'implemented' && idea.is_implemented) ||
      (filter === 'pending' && !idea.is_implemented);
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t('page.title')}</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" /> {t('page.newIdea')}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('page.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('page.filterAll')}</SelectItem>
            <SelectItem value="implemented">{t('page.filterImplemented')}</SelectItem>
            <SelectItem value="pending">{t('page.filterPending')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title={search || filter !== 'all' ? t('empty.noResultsTitle') : t('empty.noIdeasTitle')}
          description={
            search || filter !== 'all'
              ? t('empty.noResultsDesc')
              : t('empty.noIdeasDesc')
          }
          action={
            search || filter !== 'all'
              ? undefined
              : { label: t('empty.registerFirst'), onClick: () => setCreateOpen(true) }
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
             <TableHeader>
              <TableRow>
                <TableHead>{t('table.title')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('table.description')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('table.team')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('table.author')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('table.date')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((idea) => (
                <TableRow
                  key={idea.id}
                  className="cursor-pointer"
                  onClick={() => setEditIdea(idea)}
                >
                  <TableCell className="font-medium">{idea.title}</TableCell>
                  <TableCell className="hidden md:table-cell max-w-[300px] truncate text-muted-foreground">
                    {idea.description || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={idea.is_implemented ? 'default' : 'secondary'}>
                      {idea.is_implemented ? t('status.implemented') : t('status.pending')}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {idea.teams?.name || '—'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {idea.profiles?.display_name || t('table.userFallback')}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {format(new Date(idea.created_at), 'dd/MM/yyyy')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateIdeaDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={fetchIdeasWithProfiles} />
      <EditIdeaDialog idea={editIdea} open={!!editIdea} onOpenChange={(o) => { if (!o) setEditIdea(null); }} onUpdated={fetchIdeasWithProfiles} />
    </div>
  );
}
