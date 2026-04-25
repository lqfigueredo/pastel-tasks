import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Loader2, Crown, ChevronRight, Mail, RefreshCw, X, Clock } from 'lucide-react';
import { HelpButton } from '@/components/HelpButton';
import { InviteUserDialog } from '@/components/team/InviteUserDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatDistanceToNow, format } from 'date-fns';
import { getCurrentLocale } from '@/lib/date';

interface TeamSummary {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  member_count: number;
}

interface PendingInvite {
  id: string;
  email: string;
  display_name: string | null;
  team_id: string | null;
  expires_at: string;
  created_at: string;
}

const TeamList = () => {
  const { t } = useTranslation('team');
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [creating, setCreating] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id);

    const teamIds = memberships?.map(m => m.team_id) || [];

    let summaries: TeamSummary[] = [];
    if (teamIds.length > 0) {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, description, created_by')
        .in('id', teamIds);

      const { data: allMembers } = await supabase
        .from('team_members')
        .select('team_id')
        .in('team_id', teamIds);

      const countMap: Record<string, number> = {};
      allMembers?.forEach(m => {
        countMap[m.team_id] = (countMap[m.team_id] || 0) + 1;
      });

      summaries = (teamsData || []).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        created_by: t.created_by,
        member_count: countMap[t.id] || 0,
      }));
    }

    // Carrega convites pendentes do usuário (apenas admins têm convites próprios)
    const { data: invitesData } = await supabase
      .from('team_invites')
      .select('id, email, display_name, team_id, expires_at, created_at')
      .eq('inviter_id', user.id)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    setTeams(summaries);
    setInvites(invitesData || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateTeam = async () => {
    if (!user || !teamName.trim()) return;
    setCreating(true);

    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert({ name: teamName.trim(), created_by: user.id })
      .select()
      .single();

    if (error) {
      toast({ title: t('list.errorCreate'), description: error.message, variant: 'destructive' });
      setCreating(false);
      return;
    }

    await supabase.from('team_members').insert({ team_id: newTeam.id, user_id: user.id });

    toast({ title: t('list.successCreate') });
    setTeamName('');
    setCreating(false);
    setDialogOpen(false);
    loadData();
  };

  const handleRevoke = async (inviteId: string) => {
    setActionLoading(inviteId);
    const { data, error } = await supabase.functions.invoke('revoke-team-invite', {
      body: { inviteId },
    });
    setActionLoading(null);
    if (error || data?.error) {
      toast({ title: 'Erro', description: data?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('list.successRevoke') });
    loadData();
  };

  const handleResend = async (invite: PendingInvite) => {
    setActionLoading(invite.id);
    // Revoga o atual e envia um novo
    await supabase.functions.invoke('revoke-team-invite', { body: { inviteId: invite.id } });
    const { data, error } = await supabase.functions.invoke('invite-team-member', {
      body: {
        email: invite.email,
        displayName: invite.display_name || undefined,
        teamId: invite.team_id || undefined,
      },
    });
    setActionLoading(null);
    if (error || data?.error) {
      toast({ title: t('list.errorResend'), description: data?.error || error?.message, variant: 'destructive' });
      loadData();
      return;
    }
    toast({ title: t('list.successResend'), description: t('list.successResendDesc', { email: invite.email }) });
    loadData();
  };

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground mb-1">{t('list.title')}</h1>
            <HelpButton pageKey="team" />
          </div>
          <p className="text-sm text-muted-foreground">{t('list.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setInviteOpen(true)}>
            <Mail className="h-4 w-4 mr-2" />
            {t('list.inviteByEmail')}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('list.createTeam')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('list.createDialogTitle')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Input
                  placeholder={t('list.namePlaceholder')}
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
                />
                <Button onClick={handleCreateTeam} disabled={creating || !teamName.trim()} className="w-full">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {t('list.createTeam')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvited={loadData} />

      {teams.length === 0 ? (
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle className="text-lg">{t('list.emptyTitle')}</CardTitle>
            <CardDescription>{t('list.emptyDesc')}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map(t2 => (
            <Card
              key={t2.id}
              className="cursor-pointer hover:border-primary/50 transition-colors group"
              onClick={() => navigate(`/equipe/${t2.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{t2.name}</CardTitle>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                </div>
                {t2.description && (
                  <CardDescription className="line-clamp-2 text-xs">
                    {t2.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Users className="h-3 w-3" />
                    {t2.member_count === 1 ? t('list.memberOne', { count: 1 }) : t('list.memberOther', { count: t2.member_count })}
                  </Badge>
                  {t2.created_by === user?.id && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Crown className="h-3 w-3" />
                      {t('list.creator')}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t('list.pendingInvites', { count: invites.length })}
            </CardTitle>
            <CardDescription>{t('list.pendingDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {invites.map(inv => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{inv.email}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {t('list.expires', { when: formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true, locale: getCurrentLocale() }) })}
                    <span className="text-muted-foreground/60">·</span>
                    {t('list.sentOn', { date: format(new Date(inv.created_at), 'dd/MM/yyyy', { locale: getCurrentLocale() }) })}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleResend(inv)}
                    disabled={actionLoading === inv.id}
                    title={t('list.resendInvite')}
                  >
                    {actionLoading === inv.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevoke(inv.id)}
                    disabled={actionLoading === inv.id}
                    title={t('list.revokeInvite')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamList;
