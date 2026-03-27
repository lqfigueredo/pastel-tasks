import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreateInstructionDialog } from '@/components/work-instructions/CreateInstructionDialog';
import { EditInstructionDialog } from '@/components/work-instructions/EditInstructionDialog';
import { UpdateDocumentDialog } from '@/components/work-instructions/UpdateDocumentDialog';
import { VersionHistory } from '@/components/work-instructions/VersionHistory';
import { InstructionLogs } from '@/components/work-instructions/InstructionLogs';

interface WorkInstruction {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  team_id: string;
  current_file_path: string;
  current_file_name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Team {
  id: string;
  name: string;
}

export default function WorkInstructions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [instructions, setInstructions] = useState<WorkInstruction[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editInstruction, setEditInstruction] = useState<WorkInstruction | null>(null);
  const [updateDocInstruction, setUpdateDocInstruction] = useState<WorkInstruction | null>(null);
  const [versionInstruction, setVersionInstruction] = useState<WorkInstruction | null>(null);
  const [logInstruction, setLogInstruction] = useState<WorkInstruction | null>(null);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    const [{ data: instrData }, { data: teamsData }, { data: profilesData }] = await Promise.all([
      supabase.from('work_instructions').select('*').order('created_at', { ascending: false }),
      supabase.from('teams').select('id, name'),
      supabase.from('profiles').select('user_id, display_name'),
    ]);
    setInstructions((instrData as WorkInstruction[]) || []);
    setTeams(teamsData || []);
    const pMap: Record<string, string> = {};
    (profilesData || []).forEach((p: any) => { pMap[p.user_id] = p.display_name; });
    setProfiles(pMap);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = instructions.filter(i => {
    if (filterTeam !== 'all' && i.team_id !== filterTeam) return false;
    if (filterStatus === 'active' && !i.is_active) return false;
    if (filterStatus === 'inactive' && i.is_active) return false;
    return true;
  });

  const teamName = (id: string) => teams.find(t => t.id === id)?.name || '—';

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from('work-instructions').download(filePath);
    if (error) {
      toast({ title: 'Erro ao baixar arquivo', description: error.message, variant: 'destructive' });
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (instruction: WorkInstruction) => {
    if (!confirm('Tem certeza que deseja excluir esta instrução de trabalho?')) return;

    // Delete file from storage
    await supabase.storage.from('work-instructions').remove([instruction.current_file_path]);

    // Delete version files
    const { data: versions } = await supabase
      .from('work_instruction_versions')
      .select('file_path')
      .eq('instruction_id', instruction.id);
    if (versions?.length) {
      await supabase.storage.from('work-instructions').remove(versions.map(v => v.file_path));
    }

    // Log before deleting
    await supabase.from('work_instruction_logs').insert({
      instruction_id: instruction.id,
      action: 'deleted',
      details: `Instrução "${instruction.title}" excluída`,
      user_id: user!.id,
    });

    const { error } = await supabase.from('work_instructions').delete().eq('id', instruction.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Instrução excluída' });
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Instruções de Trabalho</h1>
          <p className="text-muted-foreground">Gerencie documentos e procedimentos da equipe</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Instrução
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={filterTeam} onValueChange={setFilterTeam}>
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Equipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as equipes</SelectItem>
            {teams.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">Nenhuma instrução de trabalho encontrada</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Equipe</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado por</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(instr => (
                <TableRow key={instr.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{instr.title}</p>
                      {instr.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{instr.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{teamName(instr.team_id)}</TableCell>
                  <TableCell>
                    <Badge variant={instr.is_active ? 'default' : 'secondary'}>
                      {instr.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{profiles[instr.created_by] || '—'}</TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => handleDownload(instr.current_file_path, instr.current_file_name)}
                    >
                      {instr.current_file_name}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditInstruction(instr)}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => setUpdateDocInstruction(instr)}>Atualizar PDF</Button>
                      <Button variant="ghost" size="sm" onClick={() => setVersionInstruction(instr)}>Versões</Button>
                      <Button variant="ghost" size="sm" onClick={() => setLogInstruction(instr)}>Log</Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(instr)}>Excluir</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateInstructionDialog open={createOpen} onOpenChange={setCreateOpen} teams={teams} onCreated={fetchData} />
      {editInstruction && (
        <EditInstructionDialog instruction={editInstruction} onClose={() => setEditInstruction(null)} onUpdated={fetchData} />
      )}
      {updateDocInstruction && (
        <UpdateDocumentDialog instruction={updateDocInstruction} onClose={() => setUpdateDocInstruction(null)} onUpdated={fetchData} />
      )}
      {versionInstruction && (
        <VersionHistory instruction={versionInstruction} onClose={() => setVersionInstruction(null)} profiles={profiles} />
      )}
      {logInstruction && (
        <InstructionLogs instruction={logInstruction} onClose={() => setLogInstruction(null)} profiles={profiles} />
      )}
    </div>
  );
}
