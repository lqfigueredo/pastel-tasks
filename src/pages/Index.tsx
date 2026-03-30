import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { KanbanBoard, KanbanBoardRef } from '@/components/kanban/KanbanBoard';
import { CreateTaskDialog } from '@/components/kanban/CreateTaskDialog';
import { useUserRoles } from '@/hooks/useUserRoles';
import { HelpButton } from '@/components/HelpButton';

const Index = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const boardRef = useRef<KanbanBoardRef>(null);
  const { isSolutionAdmin, isAdmin, isRegularUser } = useUserRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSolutionAdmin && !isAdmin && !isRegularUser) {
      navigate('/financeiro', { replace: true });
    }
  }, [isSolutionAdmin, isAdmin, isRegularUser, navigate]);

  const handleTaskCreated = () => {
    boardRef.current?.refresh();
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">Minhas Tarefas</h1>
            <HelpButton pageKey="tasks" />
          </div>
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
