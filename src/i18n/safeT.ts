/**
 * Defensive helpers for i18next `t(key, { returnObjects: true })` calls.
 *
 * During language switches (or when a key is momentarily missing), i18next can
 * return the key string itself instead of the expected array/object. Casting
 * with `as Array<...>` does NOT validate at runtime and a `.map()` on a string
 * crashes the entire page via the ErrorBoundary.
 *
 * Always wrap `returnObjects` results with these helpers.
 */

export function safeTArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

export function safeTObject<T extends Record<string, unknown>>(
  value: unknown,
  fallback: T = {} as T,
): T {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return value as T;
  }
  return fallback;
}
