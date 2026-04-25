import { differenceInCalendarDays, isValid, parseISO, format } from 'date-fns';
import { getCurrentLocale } from './date';
import i18n from '@/i18n';

/**
 * Humanizes a date in the active locale (PT-BR or EN), compact form.
 *
 * - Today / Tomorrow / Yesterday
 * - In N days / N days ago (up to ±7)
 * - Outside that range: "Mar 12" / "12 mar" or "03/12/2026" / "12/03/2026"
 *
 * @param input ISO string or Date.
 * @param opts.now baseline (default: now). Useful in tests.
 * @param opts.prefix when 'deadline', adds "Due " / "Vence " when future and "Overdue " / "Atrasada " when past.
 * @returns humanized string or null if input is invalid.
 */
export function humanizeDate(
  input: string | Date | null | undefined,
  opts: { now?: Date; prefix?: 'deadline' } = {},
): string | null {
  if (!input) return null;
  const date = input instanceof Date ? input : parseISODateOnly(input);
  if (!date || !isValid(date)) return null;

  const now = opts.now ?? new Date();
  const diff = differenceInCalendarDays(date, now);
  const isEn = (i18n.language || 'pt-BR').startsWith('en');

  if (opts.prefix === 'deadline') {
    if (isEn) {
      if (diff === 0) return 'Due today';
      if (diff === 1) return 'Due tomorrow';
      if (diff === -1) return 'Due yesterday';
      if (diff > 1 && diff <= 7) return `Due in ${diff} days`;
      if (diff < -1 && diff >= -30) return `Overdue ${Math.abs(diff)} days`;
      return formatFallback(date, now);
    }
    if (diff === 0) return 'Vence hoje';
    if (diff === 1) return 'Vence amanhã';
    if (diff === -1) return 'Venceu ontem';
    if (diff > 1 && diff <= 7) return `Vence em ${diff} dias`;
    if (diff < -1 && diff >= -30) return `Atrasada há ${Math.abs(diff)} dias`;
    return formatFallback(date, now);
  }

  if (isEn) {
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff > 1 && diff <= 7) return `In ${diff} days`;
    if (diff < -1 && diff >= -7) return `${Math.abs(diff)} days ago`;
    return formatFallback(date, now);
  }
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  if (diff > 1 && diff <= 7) return `Em ${diff} dias`;
  if (diff < -1 && diff >= -7) return `Há ${Math.abs(diff)} dias`;
  return formatFallback(date, now);
}

/**
 * For timestamps (date+time) — relative to current moment.
 */
export function humanizeTimestamp(
  input: string | Date | null | undefined,
  opts: { now?: Date } = {},
): string | null {
  if (!input) return null;
  const date = input instanceof Date ? input : safeParse(input);
  if (!date || !isValid(date)) return null;
  const now = opts.now ?? new Date();
  const diffMs = date.getTime() - now.getTime();
  const absSec = Math.round(Math.abs(diffMs) / 1000);
  const isEn = (i18n.language || 'pt-BR').startsWith('en');

  if (isEn) {
    if (absSec < 60) return diffMs >= 0 ? 'just now' : 'moments ago';
    const absMin = Math.round(absSec / 60);
    if (absMin < 60) return diffMs < 0 ? `${absMin}m ago` : `in ${absMin}m`;
    const absHour = Math.round(absMin / 60);
    if (absHour < 24) return diffMs < 0 ? `${absHour}h ago` : `in ${absHour}h`;
    const absDay = Math.round(absHour / 24);
    if (absDay <= 7) return diffMs < 0 ? `${absDay}d ago` : `in ${absDay}d`;
    return formatFallback(date, now);
  }

  if (absSec < 60) return diffMs >= 0 ? 'agora' : 'há instantes';
  const absMin = Math.round(absSec / 60);
  if (absMin < 60) return diffMs < 0 ? `há ${absMin} min` : `em ${absMin} min`;
  const absHour = Math.round(absMin / 60);
  if (absHour < 24) return diffMs < 0 ? `há ${absHour} h` : `em ${absHour} h`;
  const absDay = Math.round(absHour / 24);
  if (absDay <= 7) return diffMs < 0 ? `há ${absDay} d` : `em ${absDay} d`;

  return formatFallback(date, now);
}

function parseISODateOnly(s: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return isValid(date) ? date : null;
  }
  return safeParse(s);
}

function safeParse(s: string): Date | null {
  try {
    const d = parseISO(s);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

function formatFallback(date: Date, now: Date): string {
  const locale = getCurrentLocale();
  const isEn = (i18n.language || 'pt-BR').startsWith('en');
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, isEn ? 'MMM d' : "d 'de' MMM", { locale });
  }
  return format(date, isEn ? 'MM/dd/yyyy' : 'dd/MM/yyyy', { locale });
}
