import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { KanbanBoard, KanbanBoardRef } from '@/components/kanban/KanbanBoard';
import { CreateTaskDialog } from '@/components/kanban/CreateTaskDialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const boardRef = useRef<KanbanBoardRef>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const checkRole = async () => {
      const [{ data: isAdmin }, { data: isRegular }, { data: isSolution }] = await Promise.all([
        supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'user' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'solution_admin' }),
      ]);
      if (isSolution && !isAdmin && !isRegular) {
        navigate('/financeiro', { replace: true });
      }
    };
    checkRole();
  }, [user, navigate]);

  const handleTaskCreated = () => {
    boardRef.current?.refresh();
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Minhas Tarefas</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas atividades no quadro Kanban</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>
      <KanbanBoard ref={boardRef} />
      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} onTaskCreated={handleTaskCreated} />
    </div>
  );
};

export default Index;
