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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Team {
  id: string;
  name: string;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentDisplayName: string;
  currentTeamId: string | null;
  teams: Team[];
  onSaved: () => void;
}

const NO_TEAM = 'none';

const extractFunctionError = async (error: unknown): Promise<string | null> => {
  try {
    const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } })?.context;
    const body = await ctx?.json?.();
    return body?.error ?? null;
  } catch {
    return null;
  }
};

export default function EditUserDialog({
  open,
  onOpenChange,
  userId,
  currentDisplayName,
  currentTeamId,
  teams,
  onSaved,
}: EditUserDialogProps) {
  const { t } = useTranslation('admin');
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [email, setEmail] = useState('');
  const [teamId, setTeamId] = useState<string>(currentTeamId ?? NO_TEAM);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDisplayName(currentDisplayName);
    setTeamId(currentTeamId ?? NO_TEAM);
    setLoadingInfo(true);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('admin-manage-user', {
          body: { action: 'get_user_info', targetUserId: userId },
        });
        if (error) {
          const msg = (await extractFunctionError(error)) || t('editDialog.errors.loadEmail');
          toast.error(msg);
          setEmail('');
        } else if (data?.email) {
          setEmail(data.email);
        }
      } catch {
        toast.error(t('editDialog.errors.loadUser'));
      } finally {
        setLoadingInfo(false);
      }
    })();
  }, [open, userId, currentDisplayName, currentTeamId, t]);

  const handleSave = async () => {
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      toast.error(t('editDialog.errors.nameRequired'));
      return;
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error(t('editDialog.errors.invalidEmail'));
      return;
    }

    setSaving(true);
    try {
      const { error: profileError } = await supabase.functions.invoke('admin-manage-user', {
        body: {
          action: 'update_profile',
          targetUserId: userId,
          displayName: trimmedName,
          email: trimmedEmail,
        },
      });
      if (profileError) {
        const msg = (await extractFunctionError(profileError)) || t('editDialog.errors.updateProfile');
        toast.error(msg);
        return;
      }

      const newTeamValue = teamId === NO_TEAM ? null : teamId;
      const oldTeamValue = currentTeamId ?? null;
      if (newTeamValue !== oldTeamValue) {
        const { error: teamError } = await supabase.functions.invoke('admin-manage-user', {
          body: {
            action: 'assign_team',
            targetUserId: userId,
            teamId: newTeamValue,
          },
        });
        if (teamError) {
          const msg = (await extractFunctionError(teamError)) || t('editDialog.errors.updateTeam');
          toast.error(msg);
          return;
        }
      }

      toast.success(t('editDialog.success'));
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error(t('editDialog.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('editDialog.title')}</DialogTitle>
          <DialogDescription>{t('editDialog.description')}</DialogDescription>
        </DialogHeader>

        {loadingInfo ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('editDialog.displayName')}</Label>
              <Input
                id="edit-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">{t('editDialog.email')}</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
              />
              <p className="text-xs text-muted-foreground">{t('editDialog.emailHint')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-team">{t('editDialog.team')}</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger id="edit-team">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEAM}>{t('editDialog.noTeam')}</SelectItem>
                  {teams.map((tm) => (
                    <SelectItem key={tm.id} value={tm.id}>
                      {tm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                {t('editDialog.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving || !displayName.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t('editDialog.save')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
