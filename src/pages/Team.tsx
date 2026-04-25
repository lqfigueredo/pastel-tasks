import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus, Trash2, Loader2, Mail, Crown, Calendar, FileText, Save, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { TeamAttachments } from '@/components/team/TeamAttachments';
import { useTeamDetailQuery } from '@/hooks/useTeamDetailQuery';

interface TeamData {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  max_members: number;
}

interface Member {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
}

interface TeamTask {
  id: string;
  title: string;
  status_name: string;
  status_color: string;
  estimated_delivery_date: string | null;
  assignees: string[];
}

const Team = () => {
  const { t } = useTranslation('team');
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: teamDetail, isLoading: loading, refetch } = useTeamDetailQuery(teamId);
  const team = teamDetail?.team ?? null;
  const members = teamDetail?.members ?? [];
  const tasks = teamDetail?.tasks ?? [];

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const [description, setDescription] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  const isCreator = team?.created_by === user?.id;

  useEffect(() => {
    if (team) setDescription(team.description || '');
  }, [team?.id]);

  const reload = () => {
    refetch();
  };

  const handleDeleteTeam = async () => {
    if (!team) return;
    setDeleting(true);
    const { error } = await supabase.from('teams').delete().eq('id', team.id);
    if (error) {
      toast({ title: t('detail.errorDelete'), description: error.message, variant: 'destructive' });
      setDeleting(false);
    } else {
      toast({ title: t('detail.successDelete') });
      navigate('/equipe');
    }
  };

  const handleInvite = async () => {
    if (!team || !inviteEmail.trim()) return;
    setInviting(true);

    if (members.length >= team.max_members) {
      toast({ title: t('detail.memberLimit'), description: t('detail.memberLimitDesc', { max: team.max_members }), variant: 'destructive' });
      setInviting(false);
      return;
    }

    const { data, error } = await supabase.functions.invoke('lookup-user-by-email', {
      body: { email: inviteEmail.trim() },
    });

    if (error || !data || data.found === false || data.error) {
      toast({ title: 'Erro', description: data?.error || t('detail.userNotFound'), variant: 'destructive' });
      setInviting(false);
      return;
    }

    if (members.some(m => m.user_id === data.user_id)) {
      toast({ title: t('detail.alreadyMember'), description: t('detail.alreadyMemberDesc'), variant: 'destructive' });
      setInviting(false);
      return;
    }

    const { error: insertErr } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: data.user_id });

    if (insertErr) {
      toast({ title: t('detail.errorAddMember'), description: insertErr.message, variant: 'destructive' });
    } else {
      toast({ title: t('detail.memberAdded'), description: t('detail.memberAddedDesc', { name: data.display_name }) });
      setInviteEmail('');
      reload();
    }
    setInviting(false);
  };

  const handleSaveDescription = async () => {
    if (!team) return;
    setSavingDescription(true);
    const { error } = await supabase
      .from('teams')
      .update({ description: description.trim() || null })
      .eq('id', team.id);
    if (error) {
      toast({ title: t('detail.errorDescription'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('detail.successDescription') });
    }
    setSavingDescription(false);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!team) return;
    await supabase.from('team_members').delete().eq('team_id', team.id).eq('user_id', userId);
    toast({ title: t('detail.memberRemoved') });
    reload();
  };

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="animate-fade-in text-center py-20">
        <p className="text-muted-foreground">{t('detail.notFound')}</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/equipe')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('detail.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/equipe')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">{team.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t('detail.members', { count: members.length, max: team.max_members })}
          </p>
        </div>
        {isCreator && (
          <Button variant="ghost" size="icon" className="ml-auto text-destructive hover:text-destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setDeleteConfirmName(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> {t('detail.deleteTitle')}
            </DialogTitle>
            <DialogDescription>
              <span dangerouslySetInnerHTML={{ __html: t('detail.deleteDesc', { name: team.name }) }} />
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              <span dangerouslySetInnerHTML={{ __html: t('detail.confirmType', { name: team.name }) }} />
            </p>
            <Input
              value={deleteConfirmName}
              onChange={e => setDeleteConfirmName(e.target.value)}
              placeholder={team.name}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>{t('detail.cancel')}</Button>
            <Button variant="destructive" onClick={handleDeleteTeam} disabled={deleting || deleteConfirmName !== team.name}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {t('detail.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> {t('detail.membersTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {members.map(m => (
              <div key={m.user_id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{m.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{m.display_name}</span>
                      {m.user_id === team.created_by && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Crown className="h-3 w-3" /> {t('detail.creator')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {isCreator && m.user_id !== team.created_by && (
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(m.user_id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {isCreator && members.length < team.max_members && (
            <div className="flex gap-2 pt-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t('detail.emailPlaceholder')}
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                />
              </div>
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sobre o Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" /> {t('detail.aboutTeam')}
          </CardTitle>
          <CardDescription>{t('detail.aboutTeamDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isCreator ? (
            <div className="space-y-3">
              <Textarea
                placeholder={t('detail.descriptionPlaceholder')}
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
              />
              <Button size="sm" onClick={handleSaveDescription} disabled={savingDescription}>
                {savingDescription ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                {t('detail.save')}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {description || t('detail.noDescription')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Anexos do Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" /> {t('detail.attachments')}
          </CardTitle>
          <CardDescription>{t('detail.attachmentsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <TeamAttachments teamId={team.id} />
        </CardContent>
      </Card>

      {/* Team Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" /> {t('detail.tasks')}
          </CardTitle>
          <CardDescription>{t('detail.tasksDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t('detail.noTasks')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('detail.table.title')}</TableHead>
                  <TableHead>{t('detail.table.status')}</TableHead>
                  <TableHead>{t('detail.table.assignees')}</TableHead>
                  <TableHead>{t('detail.table.estimated')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map(t2 => (
                  <TableRow key={t2.id}>
                    <TableCell className="font-medium">{t2.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" style={{ borderColor: t2.status_color, color: t2.status_color }}>
                        {t2.status_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t2.assignees.length > 0 ? t2.assignees.join(', ') : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t2.estimated_delivery_date || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Team;
