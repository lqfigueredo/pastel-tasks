import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface EditUserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentDisplayName: string;
  onSaved: () => void;
}

const EditUserProfileDialog = ({
  open,
  onOpenChange,
  userId,
  currentDisplayName,
  onSaved,
}: EditUserProfileDialogProps) => {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(true);

  useEffect(() => {
    if (!open) return;
    setDisplayName(currentDisplayName);
    setLoadingInfo(true);

    const fetchUserInfo = async () => {
      // Fetch email via edge function
      const { data, error } = await supabase.functions.invoke('approve-user', {
        body: { userId, action: 'get-user-info' },
      });
      if (data?.email) setEmail(data.email);

      // Fetch role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const hasAdmin = roles?.some(r => r.role === 'admin');
      setRole(hasAdmin ? 'admin' : 'user');

      setLoadingInfo(false);
    };

    fetchUserInfo();
  }, [open, userId, currentDisplayName]);

  const handleSave = async () => {
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
      toast.error('Formato de e-mail inválido');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('approve-user', {
        body: {
          userId,
          action: 'update-profile',
          displayName: displayName.trim(),
          email: trimmedEmail,
          role,
        },
      });

      if (error) {
        let msg = 'Erro ao atualizar perfil';
        try {
          const errBody = await (error as any).context?.json?.();
          if (errBody?.error) msg = errBody.error;
        } catch {
          if (data?.error) msg = data.error;
        }
        toast.error(msg);
        return;
      }

      toast.success('Perfil atualizado com sucesso!');
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Perfil do Usuário</DialogTitle>
        </DialogHeader>
        {loadingInfo ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de exibição</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Papel</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'user' | 'admin')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSave}
              disabled={loading || !displayName.trim()}
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar Alterações
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditUserProfileDialog;
