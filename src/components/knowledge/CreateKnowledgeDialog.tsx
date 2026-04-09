import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: { id: string; name: string }[];
}

export function CreateKnowledgeDialog({ open, onOpenChange, teams }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [scope, setScope] = useState('individual');
  const [teamId, setTeamId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const reset = () => {
    setTitle(''); setDescription(''); setReferenceUrl('');
    setScope('individual'); setTeamId(''); setFile(null);
  };

  const handleSubmit = async () => {
    if (!user || !title.trim()) return;
    setLoading(true);

    let filePath: string | null = null;
    let fileName: string | null = null;

    if (file) {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('knowledge-attachments')
        .upload(path, file);
      if (uploadError) {
        toast({ title: 'Erro ao enviar arquivo', description: uploadError.message, variant: 'destructive' });
        setLoading(false);
        return;
      }
      filePath = path;
      fileName = file.name;
    }

    const { error } = await supabase.from('knowledge_sources').insert({
      title: title.trim(),
      description: description.trim() || null,
      reference_url: referenceUrl.trim() || null,
      file_path: filePath,
      file_name: fileName,
      scope,
      team_id: scope === 'team' ? teamId || null : null,
      created_by: user.id,
    });

    if (error) {
      toast({ title: 'Erro ao criar fonte', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Fonte de conhecimento criada!' });
      queryClient.invalidateQueries({ queryKey: ['knowledge-sources'] });
      reset();
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Fonte de Conhecimento</DialogTitle>
          <DialogDescription>Adicione um link de referência ou arquivo importante.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Documentação da API" />
          </div>

          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrição..." rows={3} />
          </div>

          <div className="space-y-1">
            <Label>Link de referência</Label>
            <Input type="url" value={referenceUrl} onChange={(e) => setReferenceUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-1">
            <Label>Arquivo</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>

          <div className="space-y-1">
            <Label>Escopo</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="team">Equipe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === 'team' && (
            <div className="space-y-1">
              <Label>Equipe</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger><SelectValue placeholder="Selecione a equipe" /></SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || !title.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
