import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Static imports of translation resources.
// They are tiny JSON files and tree-shaken by Vite per chunk.
import ptCommon from './locales/pt-BR/common.json';
import ptNav from './locales/pt-BR/nav.json';
import ptAuth from './locales/pt-BR/auth.json';
import ptNotifications from './locales/pt-BR/notifications.json';
import ptKanban from './locales/pt-BR/kanban.json';
import ptDashboard from './locales/pt-BR/dashboard.json';
import ptCalendar from './locales/pt-BR/calendar.json';
import ptTimer from './locales/pt-BR/timer.json';
import ptTeam from './locales/pt-BR/team.json';
import ptSettings from './locales/pt-BR/settings.json';
import ptIdeas from './locales/pt-BR/ideas.json';
import ptMeetings from './locales/pt-BR/meetings.json';
import ptKnowledge from './locales/pt-BR/knowledge.json';
import ptWorkInstructions from './locales/pt-BR/workInstructions.json';
import ptOnboarding from './locales/pt-BR/onboarding.json';
import ptBilling from './locales/pt-BR/billing.json';
import ptPricing from './locales/pt-BR/pricing.json';
import ptAdmin from './locales/pt-BR/admin.json';
import ptFinancial from './locales/pt-BR/financial.json';
import ptFinancialRegister from './locales/pt-BR/financialRegister.json';
import ptLanding from './locales/pt-BR/landing.json';
import ptPublic from './locales/pt-BR/public.json';

import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enAuth from './locales/en/auth.json';
import enNotifications from './locales/en/notifications.json';
import enKanban from './locales/en/kanban.json';
import enDashboard from './locales/en/dashboard.json';
import enCalendar from './locales/en/calendar.json';
import enTimer from './locales/en/timer.json';
import enTeam from './locales/en/team.json';
import enSettings from './locales/en/settings.json';
import enIdeas from './locales/en/ideas.json';
import enMeetings from './locales/en/meetings.json';
import enKnowledge from './locales/en/knowledge.json';
import enWorkInstructions from './locales/en/workInstructions.json';
import enOnboarding from './locales/en/onboarding.json';
import enBilling from './locales/en/billing.json';
import enPricing from './locales/en/pricing.json';
import enAdmin from './locales/en/admin.json';
import enFinancial from './locales/en/financial.json';
import enFinancialRegister from './locales/en/financialRegister.json';
import enLanding from './locales/en/landing.json';
import enPublic from './locales/en/public.json';

export const SUPPORTED_LOCALES = ['pt-BR', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'pt-BR';
export const LOCALE_STORAGE_KEY = 'app_locale';

const NAMESPACES = [
  'common',
  'nav',
  'auth',
  'notifications',
  'kanban',
  'dashboard',
  'calendar',
  'timer',
  'team',
  'settings',
  'ideas',
  'meetings',
  'knowledge',
  'workInstructions',
  'onboarding',
  'billing',
  'pricing',
  'admin',
  'financial',
  'financialRegister',
  'landing',
  'public',
] as const;

const resources = {
  'pt-BR': {
    common: ptCommon,
    nav: ptNav,
    auth: ptAuth,
    notifications: ptNotifications,
    kanban: ptKanban,
    dashboard: ptDashboard,
    calendar: ptCalendar,
    timer: ptTimer,
    team: ptTeam,
    settings: ptSettings,
    ideas: ptIdeas,
    meetings: ptMeetings,
    knowledge: ptKnowledge,
    workInstructions: ptWorkInstructions,
    onboarding: ptOnboarding,
    billing: ptBilling,
    pricing: ptPricing,
    admin: ptAdmin,
    financial: ptFinancial,
    financialRegister: ptFinancialRegister,
    landing: ptLanding,
    public: ptPublic,
  },
  en: {
    common: enCommon,
    nav: enNav,
    auth: enAuth,
    notifications: enNotifications,
    kanban: enKanban,
    dashboard: enDashboard,
    calendar: enCalendar,
    timer: enTimer,
    team: enTeam,
    settings: enSettings,
    ideas: enIdeas,
    meetings: enMeetings,
    knowledge: enKnowledge,
    workInstructions: enWorkInstructions,
    onboarding: enOnboarding,
    billing: enBilling,
    pricing: enPricing,
    admin: enAdmin,
    financial: enFinancial,
    financialRegister: enFinancialRegister,
    landing: enLanding,
    public: enPublic,
  },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES as unknown as string[],
    load: 'currentOnly', // do not strip region (pt-BR -> pt) when looking up resources
    nonExplicitSupportedLngs: false,
    defaultNS: 'common',
    ns: NAMESPACES as unknown as string[],
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
