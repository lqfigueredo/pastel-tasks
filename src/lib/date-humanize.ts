import { differenceInCalendarDays, isValid, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Humaniza uma data em PT-BR de forma compacta e útil para listas/cards/notificações.
 *
 * - Hoje / Amanhã / Ontem
 * - Em N dias / Há N dias (até ±7)
 * - Fora desse intervalo: "12 mar" (mesmo ano) ou "12/03/2026" (ano diferente)
 *
 * @param input ISO string ou Date.
 * @param opts.now baseline (default: agora). Útil em testes.
 * @param opts.prefix se true, prefixa com "Vence " quando data futura e "Atrasada " quando passada.
 *                    Útil em contexto de prazos/deadlines.
 * @returns string humanizada ou null se input inválido.
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

  if (opts.prefix === 'deadline') {
    if (diff === 0) return 'Vence hoje';
    if (diff === 1) return 'Vence amanhã';
    if (diff === -1) return 'Venceu ontem';
    if (diff > 1 && diff <= 7) return `Vence em ${diff} dias`;
    if (diff < -1 && diff >= -30) return `Atrasada há ${Math.abs(diff)} dias`;
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
 * Para timestamps (datas com hora) — humaniza relativo ao momento atual.
 * Útil para "criado há X" em listas de notificações.
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
  // 'YYYY-MM-DD' deve ser tratado como data local, não UTC, para evitar off-by-one.
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
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, "d 'de' MMM", { locale: ptBR });
  }
  return format(date, 'dd/MM/yyyy', { locale: ptBR });
}
