import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  participants: { user_id: string; display_name: string }[];
  externalParticipants: string[];
  onCreated: () => void;
}

export function AddPendencyDialog({ open, onOpenChange, meetingId, participants, externalParticipants, onCreated }: Props) {
  const [description, setDescription] = useState('');
  const [responsibleValue, setResponsibleValue] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setDescription('');
    setResponsibleValue('');
    setDueDate(undefined);
  };

  const handleSave = async () => {
    if (!description.trim() || !responsibleValue) {
      toast.error('Preencha descrição e responsável');
      return;
    }
    setSaving(true);

    // Check if the value is a user_id (internal) or external name
    const isInternal = participants.some((p) => p.user_id === responsibleValue);

    const { error } = await supabase.from('meeting_pendencies').insert({
      meeting_id: meetingId,
      description: description.trim(),
      responsible_user_id: isInternal ? responsibleValue : null,
      responsible_external_name: isInternal ? null : responsibleValue,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
    });

    if (error) {
      toast.error('Erro ao criar pendência');
      setSaving(false);
      return;
    }

    toast.success('Pendência adicionada');
    reset();
    onOpenChange(false);
    onCreated();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Pendência</DialogTitle>
          <DialogDescription>Adicione uma pendência à ata</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Textarea
              placeholder="Descreva a pendência..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Responsável *</Label>
            <Select value={responsibleValue} onValueChange={setResponsibleValue}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.display_name}
                  </SelectItem>
                ))}
                {externalParticipants.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Externos</div>
                    {externalParticipants.map((name) => (
                      <SelectItem key={`ext-${name}`} value={`ext:${name}`}>
                        {name} (Externo)
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data de Conclusão</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !dueDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'dd/MM/yyyy') : 'Selecione uma data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  locale={ptBR}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
