import { toast } from '@/hooks/use-toast';
import i18n from '@/i18n';

/**
 * Standardized error toast.
 * Falls back to translation when running inside the app shell, but accepts
 * raw strings (already-localized verbs like "criar tarefa" / "create task")
 * to keep call sites short.
 */
export function errorToast(action: string, error?: { message?: string } | null) {
  const t = i18n.t.bind(i18n);
  toast({
    title: t('errors.couldNot', { action }),
    description: error?.message
      ? t('errors.details', { message: error.message })
      : t('errors.network'),
    variant: 'destructive',
  });
}

/** Short success toast. */
export function successToast(message: string, description?: string) {
  toast({ title: message, description });
}
