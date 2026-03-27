import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ShieldX, UserPlus, Loader2, ShieldCheck, ShieldOff, UserX, UserCheck } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Profile {
  user_id: string;
  display_name: string;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
}

interface TeamMember {
  user_id: string;
  team_id: string;
  teams: { name: string } | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface BannedUser {
  id: string;
  banned: boolean;
}

export default function Admin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [adminRoles, setAdminRoles] = useState<Set<string>>(new Set());
  const [bannedUsers, setBannedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamId, setTeamId] = useState<string>('none');

  useEffect(() => {
    if (!user) return;
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    const { data } = await supabase.rpc('has_role', { _user_id: user!.id, _role: 'admin' });
    setIsAdmin(!!data);
    if (data) {
      await loadData();
    }
    setLoading(false);
  };

  const loadData = async () => {
    // First, get user_ids of users created by this admin
    const { data: approvalsData } = await supabase
      .from('user_approvals')
      .select('user_id')
      .eq('created_by_admin', user!.id);

    const createdUserIds = approvalsData?.map(a => a.user_id) || [];
    // Include the admin's own ID
    const visibleUserIds = [...new Set([user!.id, ...createdUserIds])];

    const [profilesRes, teamsRes, membersRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('user_id, display_name, created_at').in('user_id', visibleUserIds).order('created_at', { ascending: false }),
      supabase.from('teams').select('id, name'),
      supabase.from('team_members').select('user_id, team_id, teams(name)'),
      supabase.from('user_roles').select('user_id, role').eq('role', 'admin'),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (teamsRes.data) setTeams(teamsRes.data);
    if (membersRes.data) setTeamMembers(membersRes.data as unknown as TeamMember[]);
    if (rolesRes.data) setAdminRoles(new Set(rolesRes.data.map((r: UserRole) => r.user_id)));

    // Fetch banned status via edge function for all users
    await loadBannedStatus(profilesRes.data || []);
  };

  const loadBannedStatus = async (userProfiles: Profile[]) => {
    // We'll check ban status by trying to get user info via the manage function
    // For now, we track it locally after actions
    // The banned set is updated when actions are performed
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: email.trim(),
          password,
          displayName: name.trim(),
          teamId: teamId !== 'none' ? teamId : undefined,
        },
      });

      if (error) {
        toast.error(data?.error || 'Erro ao cadastrar usuário');
        setSubmitting(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setSubmitting(false);
        return;
      }

      toast.success('Usuário cadastrado com sucesso!');
      setName('');
      setEmail('');
      setPassword('');
      setTeamId('none');
      await loadData();
    } catch {
      toast.error('Erro ao cadastrar usuário');
    }
    setSubmitting(false);
  };

  const handleAction = async (action: string, targetUserId: string) => {
    setActionLoading(`${action}-${targetUserId}`);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', {
        body: { action, targetUserId },
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Erro ao executar ação');
        setActionLoading(null);
        return;
      }

      toast.success(data.message);

      // Update local state
      if (action === 'promote') {
        setAdminRoles(prev => new Set([...prev, targetUserId]));
      } else if (action === 'demote') {
        setAdminRoles(prev => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
      } else if (action === 'deactivate') {
        setBannedUsers(prev => new Set([...prev, targetUserId]));
      } else if (action === 'activate') {
        setBannedUsers(prev => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
      }
    } catch {
      toast.error('Erro ao executar ação');
    }
    setActionLoading(null);
  };

  const getTeamForUser = (userId: string) => {
    const member = teamMembers.find(m => m.user_id === userId);
    return member?.teams?.name || null;
  };

  const isCurrentUser = (userId: string) => userId === user?.id;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <ShieldX className="h-16 w-16" />
        <h2 className="text-xl font-semibold">Acesso Negado</h2>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Administração</h1>
        <p className="text-sm text-muted-foreground">Cadastre novos usuários e gerencie o sistema.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Cadastrar Usuário
          </CardTitle>
          <CardDescription>O usuário poderá fazer login imediatamente após o cadastro.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team">Time (opcional)</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar Usuário
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
          <CardDescription>{profiles.length} usuário(s) no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map(p => {
                const isUserAdmin = adminRoles.has(p.user_id);
                const isBanned = bannedUsers.has(p.user_id);
                const isSelf = isCurrentUser(p.user_id);

                return (
                  <TableRow key={p.user_id} className={isBanned ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">
                      {p.display_name || '—'}
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                    </TableCell>
                    <TableCell>
                      {getTeamForUser(p.user_id) ? (
                        <Badge variant="secondary">{getTeamForUser(p.user_id)}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isUserAdmin ? (
                        <Badge className="bg-primary/15 text-primary border-primary/30">Admin</Badge>
                      ) : (
                        <Badge variant="outline">Usuário</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isBanned ? (
                        <Badge variant="destructive">Inativo</Badge>
                      ) : (
                        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Promote / Demote Admin */}
                        {!isSelf && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={actionLoading !== null}
                                onClick={() => handleAction(isUserAdmin ? 'demote' : 'promote', p.user_id)}
                              >
                                {actionLoading === `${isUserAdmin ? 'demote' : 'promote'}-${p.user_id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isUserAdmin ? (
                                  <ShieldOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isUserAdmin ? 'Remover admin' : 'Promover a admin'}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Activate / Deactivate */}
                        {!isSelf && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={actionLoading !== null}
                                onClick={() => handleAction(isBanned ? 'activate' : 'deactivate', p.user_id)}
                              >
                                {actionLoading === `${isBanned ? 'activate' : 'deactivate'}-${p.user_id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isBanned ? (
                                  <UserCheck className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <UserX className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isBanned ? 'Reativar usuário' : 'Inativar usuário'}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
