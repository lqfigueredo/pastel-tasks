import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { CreateTaskDialog } from '@/components/kanban/CreateTaskDialog';

const Index = () => {
  const [createOpen, setCreateOpen] = useState(false);

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
      <KanbanBoard />
      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};

export default Index;
