import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Lead {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface UserApproval {
  id: string;
  user_id: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  display_name: string;
  email: string;
}

const Financial = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [approvals, setApprovals] = useState<UserApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSolutionAdmin, setIsSolutionAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
    const [leadsRes, approvalsRes] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('user_approvals').select('*').order('requested_at', { ascending: false }),
    ]);

    setLeads((leadsRes.data as Lead[]) || []);

    // Enrich approvals with profile data
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
    } else {
      setApprovals([]);
    }

    setLoading(false);
  };

  const handleApproval = async (userId: string, action: 'approve' | 'reject') => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.functions.invoke('approve-user', {
        body: { userId, action },
      });

      if (error) throw error;

      toast.success(action === 'approve' ? 'Usuário aprovado!' : 'Usuário rejeitado.');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar aprovação');
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
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financeiro</h1>
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
        </TabsList>

        <TabsContent value="approvals">
          {approvals.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center">Nenhuma solicitação de aprovação.</p>
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
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
                        {format(new Date(approval.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        {approval.status === 'pending' && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:bg-green-50"
                              disabled={actionLoading === approval.user_id}
                              onClick={() => handleApproval(approval.user_id, 'approve')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10"
                              disabled={actionLoading === approval.user_id}
                              onClick={() => handleApproval(approval.user_id, 'reject')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        )}
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
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Data de Contato</TableHead>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Financial;
