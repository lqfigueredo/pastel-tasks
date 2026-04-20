import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  CheckSquare,
  Lightbulb,
  BookOpen,
  FileText,
  BookMarked,
  LayoutDashboard,
  Plus,
  Calendar,
  Loader2,
} from 'lucide-react';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeMeta = {
  task: { icon: CheckSquare, label: 'Tarefas' },
  idea: { icon: Lightbulb, label: 'Ideias' },
  instruction: { icon: BookOpen, label: 'Instruções' },
  meeting: { icon: FileText, label: 'Atas' },
  knowledge: { icon: BookMarked, label: 'Conhecimento' },
} as const;

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  // Debounce query (200ms)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setDebounced('');
    }
  }, [open]);

  const { data: results = [], isFetching } = useGlobalSearch(debounced);

  const go = (route: string) => {
    onOpenChange(false);
    navigate(route);
  };

  const grouped = results.reduce<Record<string, typeof results>>((acc, r) => {
    (acc[r.type] ||= []).push(r);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar tarefas, ideias, atas, instruções..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {debounced.length < 2 ? (
          <CommandEmpty>Digite pelo menos 2 caracteres para buscar.</CommandEmpty>
        ) : isFetching ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Buscando...
          </div>
        ) : results.length === 0 ? (
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        ) : null}

        {Object.entries(grouped).map(([type, items]) => {
          const meta = typeMeta[type as keyof typeof typeMeta];
          const Icon = meta.icon;
          return (
            <CommandGroup key={type} heading={meta.label}>
              {items.map((r) => (
                <CommandItem
                  key={`${type}-${r.id}`}
                  value={`${type}-${r.id}-${r.title}`}
                  onSelect={() => go(r.route)}
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{r.title}</span>
                    {r.subtitle && (
                      <span className="truncate text-xs text-muted-foreground">
                        {r.subtitle}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        <CommandSeparator />
        <CommandGroup heading="Ações rápidas">
          <CommandItem value="action-dashboard" onSelect={() => go('/dashboard')}>
            <LayoutDashboard className="mr-2 h-4 w-4 text-muted-foreground" />
            Ir para Dashboard
          </CommandItem>
          <CommandItem value="action-new-task" onSelect={() => go('/tarefas?new=1')}>
            <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
            Nova tarefa
          </CommandItem>
          <CommandItem value="action-meetings" onSelect={() => go('/atas')}>
            <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
            Ver atas
          </CommandItem>
          <CommandItem value="action-calendar" onSelect={() => go('/agenda')}>
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
            Abrir agenda
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export default GlobalSearch;
