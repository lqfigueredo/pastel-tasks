import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Loader2, Crown, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface TeamSummary {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  member_count: number;
}

const TeamList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [creating, setCreating] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadTeams = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) {
      setTeams([]);
      setLoading(false);
      return;
    }

    const teamIds = memberships.map(m => m.team_id);

    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name, description, created_by')
      .in('id', teamIds);

    if (!teamsData) {
      setTeams([]);
      setLoading(false);
      return;
    }

    // Get member counts
    const { data: allMembers } = await supabase
      .from('team_members')
      .select('team_id')
      .in('team_id', teamIds);

    const countMap: Record<string, number> = {};
    allMembers?.forEach(m => {
      countMap[m.team_id] = (countMap[m.team_id] || 0) + 1;
    });

    const summaries: TeamSummary[] = teamsData.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      created_by: t.created_by,
      member_count: countMap[t.id] || 0,
    }));

    setTeams(summaries);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const handleCreateTeam = async () => {
    if (!user || !teamName.trim()) return;
    setCreating(true);

    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert({ name: teamName.trim(), created_by: user.id })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro ao criar time', description: error.message, variant: 'destructive' });
      setCreating(false);
      return;
    }

    await supabase.from('team_members').insert({ team_id: newTeam.id, user_id: user.id });

    toast({ title: 'Time criado com sucesso!' });
    setTeamName('');
    setCreating(false);
    setDialogOpen(false);
    loadTeams();
  };

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">Equipes</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus times e colabore com outros membros</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Criar Time
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar novo time</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="Nome do time"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
              />
              <Button onClick={handleCreateTeam} disabled={creating || !teamName.trim()} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Criar Time
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {teams.length === 0 ? (
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle className="text-lg">Nenhum time ainda</CardTitle>
            <CardDescription>Crie um time para colaborar com outros membros</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map(t => (
            <Card
              key={t.id}
              className="cursor-pointer hover:border-primary/50 transition-colors group"
              onClick={() => navigate(`/equipe/${t.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                </div>
                {t.description && (
                  <CardDescription className="line-clamp-2 text-xs">
                    {t.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Users className="h-3 w-3" />
                    {t.member_count} {t.member_count === 1 ? 'membro' : 'membros'}
                  </Badge>
                  {t.created_by === user?.id && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Crown className="h-3 w-3" />
                      Criador
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamList;
