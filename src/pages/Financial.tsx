import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Check, X, Ban, CalendarIcon, RotateCcw, MailCheck, Pencil, Users, Send } from 'lucide-react';
import EditUserProfileDialog from '@/components/financial/EditUserProfileDialog';
import ReplyLeadDialog from '@/components/financial/ReplyLeadDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SupportTicketList from '@/components/support/SupportTicketList';
import HelpTextsManager from '@/components/financial/HelpTextsManager';
import { HelpButton } from '@/components/HelpButton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';

interface Lead {
  id: string;
  name: string;
  email: string;
  created_at: string;
  replied_at: string | null;
  reply_message: string | null;
}

interface UserApproval {
  id: string;
  user_id: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  license_expires_at: string | null;
  display_name: string;
  email: string;
  created_by_admin: string | null;
}

interface AdminLimit {
  admin_user_id: string;
  display_name: string;
  max_users: number;
  current_users: number;
}

const Financial = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [approvals, setApprovals] = useState<UserApproval[]>([]);
  const [adminLimits, setAdminLimits] = useState<AdminLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSolutionAdmin, setIsSolutionAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserApproval | null>(null);
  const [editingLimit, setEditingLimit] = useState<{ adminId: string; value: string } | null>(null);
  const [replyingLead, setReplyingLead] = useState<Lead | null>(null);
  const pendingCount = approvals.filter(a => a.status === 'pending').length;

  useEffect(() => {
    if (!user) return;
    supabase.rpc('has_role', { _user_id: user.id, _role: 'solution_admin' }).then(({ data }) => {
      setIsSolutionAdmin(!!data);
      if (data) {
        loadData();
      } else {
        setLoading(false);
      }
    });
  }, [user]);

  const loadData = async () => {
    const [leadsRes, approvalsRes, adminSettingsRes] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('user_approvals').select('*').order('requested_at', { ascending: false }),
      supabase.from('admin_settings').select('*'),
    ]);

    setLeads((leadsRes.data as Lead[]) || []);

    const rawApprovals = (approvalsRes.data || []) as any[];
    if (rawApprovals.length > 0) {
      const userIds = rawApprovals.map(a => a.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]));

      setApprovals(rawApprovals.map(a => ({
        ...a,
        display_name: profileMap.get(a.user_id) || 'Sem nome',
        email: '',
      })));

      // Build admin limits
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      const adminUserIds = (adminRoles || []).map(r => r.user_id);
      const settingsMap = new Map((adminSettingsRes.data || []).map((s: any) => [s.admin_user_id, s.max_users]));

      // Get admin profiles
      const adminProfileIds = adminUserIds.filter(id => !profileMap.has(id));
      let fullProfileMap = new Map(profileMap);
      if (adminProfileIds.length > 0) {
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', adminProfileIds);
        (adminProfiles || []).forEach(p => fullProfileMap.set(p.user_id, p.display_name));
      }

      const limits: AdminLimit[] = adminUserIds.map(adminId => ({
        admin_user_id: adminId,
        display_name: fullProfileMap.get(adminId) || 'Sem nome',
        max_users: settingsMap.get(adminId) ?? 10,
        current_users: rawApprovals.filter(a => a.created_by_admin === adminId).length,
      }));

      setAdminLimits(limits);
    } else {
      setApprovals([]);
      setAdminLimits([]);
    }

    setLoading(false);
  };

  const handleAction = async (userId: string, action: string, extra?: Record<string, any>) => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.functions.invoke('approve-user', {
        body: { userId, action, ...extra },
      });

      if (error) throw error;

      const messages: Record<string, string> = {
        approve: 'Usuário aprovado!',
        reject: 'Usuário rejeitado.',
        deactivate: 'Licença inativada com sucesso.',
        'update-license': 'Validade da licença atualizada.',
        reactivate: 'Licença reativada com sucesso!',
        'confirm-email': 'E-mail confirmado com sucesso!',
      };
      toast.success(messages[action] || 'Ação realizada.');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar ação');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLicenseDateChange = async (userId: string, date: Date | undefined) => {
    if (!date) return;
    await handleAction(userId, 'update-license', { licenseExpiresAt: date.toISOString() });
  };

  const handleSaveLimit = async (adminUserId: string, maxUsers: number) => {
    if (!maxUsers || maxUsers < 1) {
      toast.error('Limite deve ser pelo menos 1');
      return;
    }
    setActionLoading(adminUserId);
    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({ admin_user_id: adminUserId, max_users: maxUsers }, { onConflict: 'admin_user_id' });
      if (error) throw error;
      toast.success('Limite atualizado com sucesso!');
      setEditingLimit(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar limite');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    );
  }

  if (!isSolutionAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Acesso restrito.</p>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-600 border-yellow-400">Pendente</Badge>;
      case 'approved': return <Badge className="bg-green-600">Aprovado</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejeitado</Badge>;
      case 'expired': return <Badge variant="outline" className="text-orange-600 border-orange-400">Expirado</Badge>;
      case 'deactivated': return <Badge variant="destructive">Inativado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const licenseBadge = (expiresAt: string | null, status: string) => {
    if (!expiresAt || !['approved'].includes(status)) return null;
    const expired = isPast(new Date(expiresAt));
    return expired
      ? <Badge variant="outline" className="text-red-600 border-red-400">Expirada</Badge>
      : <Badge variant="outline" className="text-green-600 border-green-400">Vigente</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <HelpButton pageKey="financial" />
        </div>
        <p className="text-muted-foreground">Gerencie leads e aprovações de usuários.</p>
      </div>

      <Tabs defaultValue="approvals">
        <TabsList>
          <TabsTrigger value="approvals" className="relative">
            Aprovações
            {pendingCount > 0 && (
              <Badge className="ml-2 bg-destructive text-destructive-foreground text-xs px-1.5 py-0">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="limits">
            <Users className="h-4 w-4 mr-1" />
            Limites
          </TabsTrigger>
          <TabsTrigger value="support">Chamados</TabsTrigger>
          <TabsTrigger value="help-texts">Textos de Ajuda</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals">
          {approvals.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center">Nenhuma solicitação de aprovação.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Validade da Licença</TableHead>
                    <TableHead>Data da Solicitação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvals.map((approval) => (
                    <TableRow key={approval.id}>
                      <TableCell className="font-medium">{approval.display_name}</TableCell>
                      <TableCell>{statusBadge(approval.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {approval.license_expires_at ? (
                            <>
                              <span className="text-sm">
                                {format(new Date(approval.license_expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                              {licenseBadge(approval.license_expires_at, approval.status)}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                          {approval.status === 'approved' && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={actionLoading === approval.user_id}>
                                  <CalendarIcon className="h-3.5 w-3.5" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={approval.license_expires_at ? new Date(approval.license_expires_at) : undefined}
                                  onSelect={(date) => handleLicenseDateChange(approval.user_id, date)}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(approval.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {approval.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:bg-green-50"
                                disabled={actionLoading === approval.user_id}
                                onClick={() => handleAction(approval.user_id, 'approve')}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10"
                                disabled={actionLoading === approval.user_id}
                                onClick={() => handleAction(approval.user_id, 'reject')}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Rejeitar
                              </Button>
                            </>
                          )}
                          {approval.status === 'approved' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:bg-destructive/10"
                                  disabled={actionLoading === approval.user_id}
                                >
                                  <Ban className="h-4 w-4 mr-1" />
                                  Inativar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Inativar licença</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Isso irá inativar o admin <strong>{approval.display_name}</strong> e todos os usuários dos times criados por ele. Deseja continuar?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleAction(approval.user_id, 'deactivate')}
                                  >
                                    Inativar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {(approval.status === 'deactivated' || approval.status === 'expired') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:bg-green-50"
                              disabled={actionLoading === approval.user_id}
                              onClick={() => handleAction(approval.user_id, 'reactivate')}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Reativar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-600 hover:bg-blue-50"
                            disabled={actionLoading === approval.user_id}
                            onClick={() => handleAction(approval.user_id, 'confirm-email')}
                            title="Confirmar e-mail manualmente"
                          >
                            <MailCheck className="h-4 w-4 mr-1" />
                            Confirmar E-mail
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingUser(approval)}
                            title="Editar perfil do usuário"
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="leads">
          {leads.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center">Nenhum lead registrado ainda.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Data de Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>
                        {format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {lead.replied_at ? (
                          <Badge className="bg-green-600">Respondido</Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-400">Aguardando</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={lead.replied_at ? 'ghost' : 'outline'}
                          onClick={() => setReplyingLead(lead)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          {lead.replied_at ? 'Reenviar' : 'Responder'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="limits">
          {adminLimits.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center">Nenhum administrador encontrado.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Administrador</TableHead>
                    <TableHead>Usuários</TableHead>
                    <TableHead>Limite</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminLimits.map((admin) => {
                    const pct = admin.max_users > 0 ? (admin.current_users / admin.max_users) * 100 : 0;
                    const isEditing = editingLimit?.adminId === admin.admin_user_id;
                    return (
                      <TableRow key={admin.admin_user_id}>
                        <TableCell className="font-medium">{admin.display_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-[160px]">
                            <Progress value={pct} className="h-2 flex-1" />
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {admin.current_users}/{admin.max_users}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="number"
                              min={1}
                              className="w-20 h-8"
                              value={editingLimit.value}
                              onChange={(e) => setEditingLimit({ adminId: admin.admin_user_id, value: e.target.value })}
                              autoFocus
                            />
                          ) : (
                            <span>{admin.max_users}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600"
                                disabled={actionLoading === admin.admin_user_id}
                                onClick={() => handleSaveLimit(admin.admin_user_id, parseInt(editingLimit.value))}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingLimit(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingLimit({ adminId: admin.admin_user_id, value: String(admin.max_users) })}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="support">
          <SupportTicketList role="solution_admin" />
        </TabsContent>

        <TabsContent value="help-texts">
          <HelpTextsManager />
        </TabsContent>
      </Tabs>

      {editingUser && (
        <EditUserProfileDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          userId={editingUser.user_id}
          currentDisplayName={editingUser.display_name}
          onSaved={loadData}
        />
      )}

      <ReplyLeadDialog
        lead={replyingLead}
        open={!!replyingLead}
        onOpenChange={(open) => !open && setReplyingLead(null)}
        onSuccess={loadData}
      />
    </div>
  );
};

export default Financial;
