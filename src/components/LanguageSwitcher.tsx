import { Languages, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocaleSync } from '@/hooks/useLocaleSync';
import type { SupportedLocale } from '@/i18n';

interface Option {
  value: SupportedLocale;
  flag: string;
  labelKey: string;
  short: string;
}

const OPTIONS: Option[] = [
  { value: 'pt-BR', flag: '🇧🇷', labelKey: 'language.ptBR', short: 'PT' },
  { value: 'en', flag: '🇺🇸', labelKey: 'language.en', short: 'EN' },
];

interface Props {
  /** Compact mode renders only flag + short code (no label). */
  compact?: boolean;
}

export function LanguageSwitcher({ compact = true }: Props) {
  const { t } = useTranslation();
  const { locale, changeLocale } = useLocaleSync();
  const current = OPTIONS.find((o) => o.value === locale) ?? OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 px-2"
          aria-label={t('language.ariaLabel')}
        >
          <Languages className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs font-medium" aria-hidden="true">
            {current.short}
          </span>
          {!compact && <span className="hidden md:inline text-xs">{t(current.labelKey)}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <DropdownMenuLabel>{t('language.label')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onSelect={() => {
              if (opt.value !== locale) void changeLocale(opt.value);
            }}
            className="gap-2"
          >
            <span aria-hidden="true">{opt.flag}</span>
            <span className="flex-1">{t(opt.labelKey)}</span>
            {opt.value === locale && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
