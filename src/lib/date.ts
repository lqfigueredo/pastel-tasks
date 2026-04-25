import { format, parseISO, isValid, type Locale } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import i18n from '@/i18n';

/**
 * Returns the date-fns locale matching the active i18n language.
 * Defaults to ptBR.
 */
export function getCurrentLocale(): Locale {
  const lng = i18n.language || 'pt-BR';
  if (lng.startsWith('en')) return enUS;
  return ptBR;
}

/**
 * Safely parse an ISO date string. Returns null when input is empty or invalid.
 * Never throws.
 */
export function safeParseISO(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  try {
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Safely format an ISO date string. Returns null on invalid input — never throws.
 * Defaults to Brazilian Portuguese locale.
 */
export function safeFormatDate(
  dateStr: string | null | undefined,
  formatStr: string,
  options: { locale?: Locale } = {}
): string | null {
  const parsed = safeParseISO(dateStr);
  if (!parsed) return null;
  try {
    return format(parsed, formatStr, { locale: options.locale ?? getCurrentLocale() });
  } catch {
    return null;
  }
}
