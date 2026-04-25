import { useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { ShieldX, UserPlus, Loader2, ShieldCheck, ShieldOff, UserX, UserCheck, Pencil } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpButton } from '@/components/HelpButton';
import { PageLoader, InlineLoader } from '@/components/ui/loaders';
import { getCurrentLocale } from '@/lib/date';

const SupportTicketList = lazy(() => import('@/components/support/SupportTicketList'));
const EmailDashboard = lazy(() => import('@/components/admin/EmailDashboard'));
const EditUserDialog = lazy(() => import('@/components/admin/EditUserDialog'));
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { RequestSeatsDialog } from '@/components/admin/RequestSeatsDialog';
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
  const { t } = useTranslation('admin');
  const TabFallback = () => <InlineLoader label={t('loading')} />;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bannedUsers, setBannedUsers] = useState<Set<string>>(new Set());
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamId, setTeamId] = useState<string>('none');
  const [requestSeatsOpen, setRequestSeatsOpen] = useState(false);

  const { data: isAdminData, isLoading: checkingAdmin } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc('has_role', { _user_id: user!.id, _role: 'admin' });
      return !!data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
  const isAdmin = isAdminData ?? null;

  const { data: adminData, isLoading: loadingData } = useQuery({
    queryKey: ['admin-data', user?.id],
    queryFn: async () => {
      const { data: approvalsData } = await supabase
        .from('user_approvals')
        .select('user_id')
        .eq('created_by_admin', user!.id);

      const createdUserIds = approvalsData?.map(a => a.user_id) || [];
      const visibleUserIds = [...new Set([user!.id, ...createdUserIds])];

      const [profilesRes, teamsRes, membersRes, rolesRes, settingsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name, created_at').in('user_id', visibleUserIds).order('created_at', { ascending: false }),
        supabase.from('teams').select('id, name').eq('created_by', user!.id),
        supabase.from('team_members').select('user_id, team_id, teams(name)'),
        supabase.from('user_roles').select('user_id, role').eq('role', 'admin'),
        supabase.from('admin_settings').select('max_users').eq('admin_user_id', user!.id).maybeSingle(),
      ]);

      const maxUsers = settingsRes.data?.max_users ?? 10;
      return {
        profiles: (profilesRes.data || []) as Profile[],
        teams: (teamsRes.data || []) as Team[],
        teamMembers: (membersRes.data || []) as unknown as TeamMember[],
        adminRoles: new Set((rolesRes.data || []).map((r: UserRole) => r.user_id)),
        userLimit: { current: createdUserIds.length, max: maxUsers },
      };
    },
    enabled: !!user && isAdmin === true,
    staleTime: 30_000,
  });

  const profiles = adminData?.profiles ?? [];
  const teams = adminData?.teams ?? [];
  const teamMembers = adminData?.teamMembers ?? [];
  const adminRoles = adminData?.adminRoles ?? new Set<string>();
  const userLimit = adminData?.userLimit ?? null;
  const loading = checkingAdmin || (isAdmin === true && loadingData);

  const loadData = () => queryClient.invalidateQueries({ queryKey: ['admin-data', user?.id] });

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
        let msg = 'Erro ao cadastrar usuário';
        try {
          const errBody = await (error as any).context?.json?.();
          if (errBody?.error) msg = errBody.error;
        } catch {
          if (data?.error) msg = data.error;
        }
        toast.error(msg);
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
      if (action === 'promote' || action === 'demote') {
        loadData();
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

  const getTeamIdForUser = (userId: string): string | null => {
    const member = teamMembers.find(m => m.user_id === userId);
    return member?.team_id || null;
  };

  const isCurrentUser = (userId: string) => userId === user?.id;

  if (loading) {
    return <PageLoader />;
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
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-foreground">Administração</h1>
          <HelpButton pageKey="admin" />
        </div>
        <p className="text-sm text-muted-foreground">Cadastre novos usuários e gerencie o sistema.</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="support">Suporte</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-8">

      {userLimit && userLimit.current >= userLimit.max && (
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Limite de {userLimit.max} usuários atingido</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Você atingiu o limite do seu plano. Solicite ao Financeiro a liberação de assentos adicionais.
            </span>
            <Button size="sm" onClick={() => setRequestSeatsOpen(true)}>
              Solicitar mais assentos
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Cadastrar Usuário
          </CardTitle>
          <CardDescription>
            O usuário poderá fazer login imediatamente após o cadastro.
            {userLimit && (
              <span className="ml-2 font-medium">
                ({userLimit.current}/{userLimit.max} usuários utilizados)
              </span>
            )}
          </CardDescription>
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
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={submitting || (userLimit ? userLimit.current >= userLimit.max : false)}
                className="w-full sm:w-auto"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar Usuário
              </Button>
              {userLimit && userLimit.current >= userLimit.max && (
                <span className="text-xs text-muted-foreground">
                  Limite atingido — solicite mais assentos acima.
                </span>
              )}
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

                        {/* Edit user */}
                        {!isSelf && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={actionLoading !== null}
                                onClick={() => setEditingUser(p)}
                              >
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar usuário</TooltipContent>
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

        </TabsContent>

        <TabsContent value="support">
          <Suspense fallback={<TabFallback />}>
            <SupportTicketList role="admin" />
          </Suspense>
        </TabsContent>

        <TabsContent value="emails">
          <Suspense fallback={<TabFallback />}>
            <EmailDashboard scope="own" />
          </Suspense>
        </TabsContent>
      </Tabs>

      {userLimit && (
        <RequestSeatsDialog
          open={requestSeatsOpen}
          onOpenChange={setRequestSeatsOpen}
          currentSeats={userLimit.max}
          onSuccess={loadData}
        />
      )}

      {editingUser && (
        <Suspense fallback={null}>
          <EditUserDialog
            open={!!editingUser}
            onOpenChange={(o) => { if (!o) setEditingUser(null); }}
            userId={editingUser.user_id}
            currentDisplayName={editingUser.display_name}
            currentTeamId={getTeamIdForUser(editingUser.user_id)}
            teams={teams}
            onSaved={loadData}
          />
        </Suspense>
      )}
    </div>
  );
}
