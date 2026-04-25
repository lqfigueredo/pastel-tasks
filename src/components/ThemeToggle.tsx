import { Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { resolved, setTheme } = useTheme();
  const { t } = useTranslation();

  const label = resolved === 'dark' ? t('theme.lightMode') : t('theme.darkMode');

  return (
    <Button
      variant="ghost"
      size={collapsed ? 'icon' : 'sm'}
      onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
      className="w-full justify-start text-muted-foreground"
      aria-label={t('theme.toggle')}
    >
      {resolved === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!collapsed && <span className="ml-2">{label}</span>}
    </Button>
  );
}
