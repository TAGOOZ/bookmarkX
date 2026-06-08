import { create } from 'zustand';

const LOCALE_KEY = 'bookmarkx-locale';

export type Locale = 'ar' | 'en';

interface SettingsStore {
  locale: Locale;
  showSettings: boolean;

  setLocale: (locale: Locale) => void;
  setShowSettings: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  locale: (() => {
    try {
      const stored = localStorage.getItem(LOCALE_KEY);
      if (stored === 'ar' || stored === 'en') return stored;
    } catch { /* localStorage may be unavailable */ }
    return 'ar';
  })(),
  showSettings: false,

  setLocale: (locale) => {
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch { /* localStorage may be unavailable */ }
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    set({ locale });
  },
  setShowSettings: (show) => set({ showSettings: show }),
}));
