import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface Profile {
  user_id: string;
  display_name: string;
}

export function CreateMeetingDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const [date, setDate] = useState<Date>();
  const [description, setDescription] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [externalParticipants, setExternalParticipants] = useState<string[]>([]);
  const [externalName, setExternalName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from('profiles').select('user_id, display_name').then(({ data }) => {
      setProfiles((data || []).filter((p) => p.user_id !== user?.id));
    });
  }, [open, user]);

  const reset = () => {
    setDate(undefined);
    setDescription('');
    setSelectedUsers([]);
    setExternalParticipants([]);
    setExternalName('');
  };

  const addExternal = () => {
    const name = externalName.trim();
    if (!name) return;
    if (externalParticipants.includes(name)) {
      toast.error('Nome já adicionado');
      return;
    }
    setExternalParticipants((prev) => [...prev, name]);
    setExternalName('');
  };

  const removeExternal = (name: string) => {
    setExternalParticipants((prev) => prev.filter((n) => n !== name));
  };

  const handleSave = async () => {
    if (!user || !date || !description.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setSaving(true);

    const { data: meeting, error } = await supabase
      .from('meeting_minutes')
      .insert({
        meeting_date: format(date, 'yyyy-MM-dd'),
        description: description.trim(),
        created_by: user.id,
        external_participants: externalParticipants,
      })
      .select('id')
      .single();

    if (error || !meeting) {
      toast.error('Erro ao criar ata');
      setSaving(false);
      return;
    }

    if (selectedUsers.length > 0) {
      const rows = selectedUsers.map((uid) => ({ meeting_id: meeting.id, user_id: uid }));
      await supabase.from('meeting_participants').insert(rows);
    }
    await supabase.from('meeting_participants').insert({ meeting_id: meeting.id, user_id: user.id });

    toast.success('Ata criada com sucesso');
    reset();
    onOpenChange(false);
    onCreated();
    setSaving(false);
  };

  const toggleUser = (uid: string) => {
    setSelectedUsers((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Ata de Reunião</DialogTitle>
          <DialogDescription>Preencha os dados da reunião</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Data da Reunião *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecione uma data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={ptBR}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Textarea
              placeholder="Descreva os assuntos tratados na reunião..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Participantes</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {profiles.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum usuário disponível</p>
              ) : (
                profiles.map((p) => (
                  <label key={p.user_id} className="flex items-center gap-2 rounded p-1 text-sm hover:bg-accent cursor-pointer">
                    <Checkbox
                      checked={selectedUsers.includes(p.user_id)}
                      onCheckedChange={() => toggleUser(p.user_id)}
                    />
                    {p.display_name || 'Sem nome'}
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Participantes Externos</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Nome do participante externo"
                value={externalName}
                onChange={(e) => setExternalName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExternal(); } }}
              />
              <Button type="button" size="sm" variant="outline" onClick={addExternal}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {externalParticipants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {externalParticipants.map((name) => (
                  <Badge key={name} variant="secondary" className="gap-1">
                    {name}
                    <button type="button" onClick={() => removeExternal(name)} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Criar Ata'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
