import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<TeamTask[]>([]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const [description, setDescription] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  const isCreator = team?.created_by === user?.id;

  const handleDeleteTeam = async () => {
    if (!team) return;
    setDeleting(true);
    const { error } = await supabase.from('teams').delete().eq('id', team.id);
    if (error) {
      toast({ title: 'Erro ao excluir time', description: error.message, variant: 'destructive' });
      setDeleting(false);
    } else {
      toast({ title: 'Time excluído com sucesso' });
      navigate('/equipe');
    }
  };

  const loadTeam = useCallback(async () => {
    if (!user || !teamId) return;
    setLoading(true);

    // Load team directly by ID
    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (!teamData) {
      setTeam(null);
      setLoading(false);
      return;
    }
    setTeam(teamData);
    setDescription(teamData.description || '');

    // Load members with profiles
    const { data: memberRows } = await supabase
      .from('team_members')
      .select('user_id, joined_at')
      .eq('team_id', teamData.id);

    if (memberRows && memberRows.length > 0) {
      const userIds = memberRows.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const merged: Member[] = memberRows.map(m => {
        const p = profiles?.find(p => p.user_id === m.user_id);
        return {
          user_id: m.user_id,
          display_name: p?.display_name || 'Usuário',
          avatar_url: p?.avatar_url || null,
          joined_at: m.joined_at,
        };
      });
      setMembers(merged);
    } else {
      setMembers([]);
    }

    // Load team tasks
    const { data: taskRows } = await supabase
      .from('tasks')
      .select('id, title, status_id, estimated_delivery_date')
      .eq('team_id', teamData.id)
      .order('created_at', { ascending: false });

    if (taskRows && taskRows.length > 0) {
      const statusIds = [...new Set(taskRows.map(t => t.status_id))];
      const { data: statuses } = await supabase
        .from('task_statuses')
        .select('id, name, color')
        .in('id', statusIds);

      const taskIds = taskRows.map(t => t.id);
      const { data: assigneeRows } = await supabase
        .from('task_assignees')
        .select('task_id, user_id')
        .in('task_id', taskIds);

      const assigneeUserIds = [...new Set(assigneeRows?.map(a => a.user_id) || [])];
      const { data: assigneeProfiles } = assigneeUserIds.length > 0
        ? await supabase.from('profiles').select('user_id, display_name').in('user_id', assigneeUserIds)
        : { data: [] };

      const teamTasks: TeamTask[] = taskRows.map(t => {
        const s = statuses?.find(s => s.id === t.status_id);
        const taskAssignees = assigneeRows?.filter(a => a.task_id === t.id) || [];
        const names = taskAssignees.map(a => {
          const p = assigneeProfiles?.find(p => p.user_id === a.user_id);
          return p?.display_name || 'Usuário';
        });
        return {
          id: t.id,
          title: t.title,
          status_name: s?.name || 'Desconhecido',
          status_color: s?.color || '#94A3B8',
          estimated_delivery_date: t.estimated_delivery_date,
          assignees: names,
        };
      });
      setTasks(teamTasks);
    } else {
      setTasks([]);
    }

    setLoading(false);
  }, [user, teamId]);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const handleInvite = async () => {
    if (!team || !inviteEmail.trim()) return;
    setInviting(true);

    if (members.length >= team.max_members) {
      toast({ title: 'Limite atingido', description: `O time já tem ${team.max_members} membros.`, variant: 'destructive' });
      setInviting(false);
      return;
    }

    const { data, error } = await supabase.functions.invoke('lookup-user-by-email', {
      body: { email: inviteEmail.trim() },
    });

    if (error || data?.error) {
      toast({ title: 'Erro', description: data?.error || 'Usuário não encontrado', variant: 'destructive' });
      setInviting(false);
      return;
    }

    if (members.some(m => m.user_id === data.user_id)) {
      toast({ title: 'Já é membro', description: 'Este usuário já faz parte do time.', variant: 'destructive' });
      setInviting(false);
      return;
    }

    const { error: insertErr } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: data.user_id });

    if (insertErr) {
      toast({ title: 'Erro ao adicionar membro', description: insertErr.message, variant: 'destructive' });
    } else {
      toast({ title: 'Membro adicionado!', description: `${data.display_name} foi adicionado ao time.` });
      setInviteEmail('');
      loadTeam();
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
      toast({ title: 'Erro ao salvar descrição', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Descrição salva!' });
    }
    setSavingDescription(false);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!team) return;
    await supabase.from('team_members').delete().eq('team_id', team.id).eq('user_id', userId);
    toast({ title: 'Membro removido' });
    loadTeam();
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
        <p className="text-muted-foreground">Time não encontrado.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/equipe')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
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
            {members.length}/{team.max_members} membros
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
              <AlertTriangle className="h-5 w-5 text-destructive" /> Excluir Time
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o time <strong>{team.name}</strong>? Todos os membros, anexos e dados associados serão removidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              Para confirmar, digite <strong className="text-foreground">{team.name}</strong> abaixo:
            </p>
            <Input
              value={deleteConfirmName}
              onChange={e => setDeleteConfirmName(e.target.value)}
              placeholder={team.name}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteTeam} disabled={deleting || deleteConfirmName !== team.name}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> Membros
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
                          <Crown className="h-3 w-3" /> Criador
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
                  placeholder="Email do membro..."
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
            <FileText className="h-5 w-5" /> Sobre o Time
          </CardTitle>
          <CardDescription>Descrição e informações sobre o time</CardDescription>
        </CardHeader>
        <CardContent>
          {isCreator ? (
            <div className="space-y-3">
              <Textarea
                placeholder="Descreva o propósito e objetivos do time..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
              />
              <Button size="sm" onClick={handleSaveDescription} disabled={savingDescription}>
                {savingDescription ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Salvar
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {description || 'Nenhuma descrição adicionada.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Anexos do Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" /> Anexos do Time
          </CardTitle>
          <CardDescription>Arquivos compartilhados com a equipe</CardDescription>
        </CardHeader>
        <CardContent>
          <TeamAttachments teamId={team.id} />
        </CardContent>
      </Card>

      {/* Team Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Tarefas da Equipe
          </CardTitle>
          <CardDescription>Tarefas associadas ao time</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma tarefa associada ao time ainda. Ao criar tarefas, selecione este time.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsáveis</TableHead>
                  <TableHead>Previsão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" style={{ borderColor: t.status_color, color: t.status_color }}>
                        {t.status_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.assignees.length > 0 ? t.assignees.join(', ') : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.estimated_delivery_date || '—'}
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
