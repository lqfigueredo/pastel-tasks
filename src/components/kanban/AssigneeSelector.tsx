import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, X } from 'lucide-react';

export interface Profile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

interface AssigneeSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function AssigneeSelector({ selectedIds, onChange }: AssigneeSelectorProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const fetchProfiles = async () => {
      const { data: approvals } = await supabase
        .from('user_approvals')
        .select('user_id')
        .eq('created_by_admin', user.id);

      const visibleIds = [...new Set([user.id, ...(approvals?.map(a => a.user_id) || [])])];

      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', visibleIds);

      if (data) setProfiles(data);
    };
    fetchProfiles();
  }, [user]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (userId: string) => {
    onChange(
      selectedIds.includes(userId)
        ? selectedIds.filter((id) => id !== userId)
        : [...selectedIds, userId]
    );
  };

  const selected = profiles.filter((p) => selectedIds.includes(p.user_id));
  const initials = (name: string) => name.slice(0, 2).toUpperCase() || '??';

  return (
    <div className="relative" ref={ref}>
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((p) => (
          <span
            key={p.user_id}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
          >
            <Avatar className="h-4 w-4">
              {p.avatar_url && <AvatarImage src={p.avatar_url} />}
              <AvatarFallback className="text-[8px]">{initials(p.display_name)}</AvatarFallback>
            </Avatar>
            {p.display_name}
            <button onClick={() => toggle(p.user_id)} className="ml-0.5 opacity-60 hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setOpen(!open)}>
          <UserPlus className="h-3 w-3" /> Adicionar
        </Button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-popover p-1 shadow-lg">
          {profiles.length === 0 && (
            <p className="p-2 text-xs text-muted-foreground">Nenhum perfil encontrado</p>
          )}
          {profiles.map((p) => (
            <label
              key={p.user_id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Checkbox
                checked={selectedIds.includes(p.user_id)}
                onCheckedChange={() => toggle(p.user_id)}
              />
              <Avatar className="h-5 w-5">
                {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                <AvatarFallback className="text-[8px]">{initials(p.display_name)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{p.display_name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** Compact avatar stack for cards */
export function AssigneeAvatars({ assignees }: { assignees: Profile[] }) {
  if (assignees.length === 0) return null;
  const initials = (name: string) => name.slice(0, 2).toUpperCase() || '??';

  return (
    <div className="flex -space-x-1.5">
      {assignees.slice(0, 3).map((a) => (
        <Avatar key={a.user_id} className="h-5 w-5 border-2 border-card">
          {a.avatar_url && <AvatarImage src={a.avatar_url} />}
          <AvatarFallback className="text-[7px]">{initials(a.display_name)}</AvatarFallback>
        </Avatar>
      ))}
      {assignees.length > 3 && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-muted text-[7px] font-medium text-muted-foreground">
          +{assignees.length - 3}
        </span>
      )}
    </div>
  );
}
