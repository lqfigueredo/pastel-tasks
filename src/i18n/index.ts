import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Static imports of translation resources.
// They are tiny JSON files and tree-shaken by Vite per chunk.
import ptCommon from './locales/pt-BR/common.json';
import ptNav from './locales/pt-BR/nav.json';
import ptAuth from './locales/pt-BR/auth.json';
import ptNotifications from './locales/pt-BR/notifications.json';

import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enAuth from './locales/en/auth.json';
import enNotifications from './locales/en/notifications.json';

export const SUPPORTED_LOCALES = ['pt-BR', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'pt-BR';
export const LOCALE_STORAGE_KEY = 'app_locale';

const resources = {
  'pt-BR': {
    common: ptCommon,
    nav: ptNav,
    auth: ptAuth,
    notifications: ptNotifications,
  },
  en: {
    common: enCommon,
    nav: enNav,
    auth: enAuth,
    notifications: enNotifications,
  },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES as unknown as string[],
    nonExplicitSupportedLngs: true, // accept "en-US" as "en"
    defaultNS: 'common',
    ns: ['common', 'nav', 'auth', 'notifications'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false, // resources are static, no async loading
    },
  });

// Keep <html lang="..."> in sync with the active language for a11y / SEO
const applyHtmlLang = (lng: string) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng.startsWith('en') ? 'en' : 'pt-BR';
  }
};
applyHtmlLang(i18n.language);
i18n.on('languageChanged', applyHtmlLang);

export default i18n;
