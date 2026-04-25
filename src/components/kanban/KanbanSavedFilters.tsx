import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Bookmark, Plus, Trash2, Check } from 'lucide-react';

export interface KanbanFilters {
  assigneeId: string | null;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: KanbanFilters;
}

interface Props {
  current: KanbanFilters;
  onApply: (filters: KanbanFilters) => void;
}

export function KanbanSavedFilters({ current, onApply }: Props) {
  const { t } = useTranslation('kanban');
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');

  const { data: filters = [] } = useQuery({
    queryKey: ['kanban-saved-filters', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('kanban_saved_filters')
        .select('id, name, filters')
        .order('name');
      return (data ?? []).map((f: any) => ({
        id: f.id,
        name: f.name,
        filters: (f.filters ?? {}) as KanbanFilters,
      })) as SavedFilter[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!saveOpen) setName('');
  }, [saveOpen]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['kanban-saved-filters', user?.id] });

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    const { error } = await supabase.from('kanban_saved_filters').insert({
      user_id: user.id,
      name: name.trim(),
      filters: current as any,
    });
    if (error) {
      toast({ title: t('savedFilters.errorSave'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('savedFilters.savedToast') });
    setSaveOpen(false);
    refresh();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('kanban_saved_filters').delete().eq('id', id);
    if (error) {
      toast({ title: t('savedFilters.errorDelete'), description: error.message, variant: 'destructive' });
      return;
    }
    refresh();
  };

  const isCurrent = (f: SavedFilter) => f.filters?.assigneeId === current.assigneeId;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Bookmark className="h-3.5 w-3.5" />
            {t('savedFilters.trigger')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>{t('savedFilters.label')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {filters.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              {t('savedFilters.empty')}
            </div>
          )}
          {filters.map((f) => (
            <DropdownMenuItem
              key={f.id}
              className="flex items-center justify-between gap-2"
              onSelect={(e) => e.preventDefault()}
            >
              <button
                type="button"
                onClick={() => onApply(f.filters)}
                className="flex items-center gap-2 flex-1 text-left truncate"
              >
                {isCurrent(f) ? (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}
                <span className="truncate">{f.name}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(f.id)}
                className="rounded p-1 text-destructive hover:bg-destructive/10"
                aria-label={t('savedFilters.delete')}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSaveOpen(true)} className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            {t('savedFilters.saveCurrent')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('savedFilters.saveTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="filter-name">{t('savedFilters.nameLabel')}</Label>
            <Input
              id="filter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('savedFilters.namePlaceholder')}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              {t('create.cancel', { defaultValue: 'Cancelar' })}
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {t('detail.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
