import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { getCurrentLocale } from '@/lib/date';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface ChangeLog {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  user_id: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  display_name: string;
}

export function TaskChangeHistory({ taskId }: { taskId: string }) {
  const { t, i18n } = useTranslation('kanban');
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchLogs();
  }, [open, taskId]);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('task_change_logs')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      setLogs(data);
      const userIds = [...new Set(data.map((l) => l.user_id))];
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);
      if (profs) {
        const map = new Map<string, string>();
        profs.forEach((p: Profile) => map.set(p.user_id, p.display_name));
        setProfiles(map);
      }
    } else {
      setLogs([]);
    }
  };

  const fieldLabel = (name: string) => {
    const key = `history.fields.${name}`;
    const translated = t(key);
    return translated === key ? name : translated;
  };

  const isEn = (i18n.language || 'pt-BR').startsWith('en');
  const dateFormat = isEn ? "MM/dd/yyyy 'at' HH:mm" : "dd/MM/yyyy 'às' HH:mm";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sm font-semibold">
          <History className="h-4 w-4" />
          {t('history.title')} ({open ? t('history.hide') : t('history.show')})
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 max-h-48 overflow-y-auto mt-2">
          {logs.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">{t('history.empty')}</p>
          )}
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="text-foreground">
                <span className="font-medium">{fieldLabel(log.field_name)}</span>
                {log.old_value && log.new_value && (
                  <>: <span className="text-muted-foreground line-through">{log.old_value}</span> → <span>{log.new_value}</span></>
                )}
                {!log.old_value && log.new_value && <>: <span>{log.new_value}</span></>}
                {log.old_value && !log.new_value && <>: <span className="text-muted-foreground line-through">{log.old_value}</span> → <span className="italic">{t('history.empty_value')}</span></>}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {profiles.get(log.user_id) || t('history.userFallback')} • {format(new Date(log.created_at), dateFormat, { locale: getCurrentLocale() })}
              </p>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
