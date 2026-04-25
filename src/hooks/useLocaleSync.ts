import { useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@/i18n';

function normalize(value: string | null | undefined): SupportedLocale {
  if (!value) return DEFAULT_LOCALE;
  if (value.startsWith('en')) return 'en';
  if (value.startsWith('pt')) return 'pt-BR';
  return DEFAULT_LOCALE;
}

/**
 * Syncs the user's preferred locale across:
 *  - i18next runtime
 *  - localStorage (so anonymous visitors keep their choice)
 *  - profiles.locale (so the choice follows the user across devices)
 *
 * Behaviour:
 *  - On login: reads profiles.locale and applies it (server wins over local).
 *  - On manual change: updates i18n + localStorage + profiles.locale (best-effort).
 */
export function useLocaleSync() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const lastSyncedUserRef = useRef<string | null>(null);

  // When user logs in, fetch their stored preference and apply it.
  useEffect(() => {
    if (!user) {
      lastSyncedUserRef.current = null;
      return;
    }
    if (lastSyncedUserRef.current === user.id) return;
    lastSyncedUserRef.current = user.id;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('locale')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled || error || !data) return;
      const remote = normalize(data.locale);
      if (remote !== normalize(i18n.language)) {
        await i18n.changeLanguage(remote);
        try {
          window.localStorage.setItem(LOCALE_STORAGE_KEY, remote);
        } catch {
          // ignore storage errors (private mode etc.)
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, i18n]);

  const changeLocale = useCallback(
    async (locale: SupportedLocale) => {
      if (!SUPPORTED_LOCALES.includes(locale)) return;
      await i18n.changeLanguage(locale);
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      } catch {
        // ignore
      }
      if (user) {
        // best-effort update; failure shouldn't break UX
        await supabase.from('profiles').update({ locale }).eq('user_id', user.id);
      }
    },
    [i18n, user]
  );

  return {
    locale: normalize(i18n.language),
    changeLocale,
  };
}
