import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { resolved, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size={collapsed ? 'icon' : 'sm'}
      onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
      className="w-full justify-start text-muted-foreground"
    >
      {resolved === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!collapsed && <span className="ml-2">{resolved === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>}
    </Button>
  );
}
