import { toast } from '@/hooks/use-toast';

/**
 * Toast de erro padronizado e informativo.
 *
 * @param action - verbo + objeto, ex: "mover a tarefa", "criar tarefa", "entrar"
 * @param error - opcional: erro com message para detalhar a causa
 */
export function errorToast(action: string, error?: { message?: string } | null) {
  toast({
    title: `Não foi possível ${action}`,
    description: error?.message
      ? `Detalhes: ${error.message}`
      : 'Verifique sua conexão e tente novamente.',
    variant: 'destructive',
  });
}

/** Toast de sucesso curto. */
export function successToast(message: string, description?: string) {
  toast({ title: message, description });
}
