'use client';

import { create } from 'zustand';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  detectPreferredLanguage,
  getLocale,
  messages,
  type Language,
} from '@/lib/i18n';

interface LanguageState {
  language: Language;
  hydrated: boolean;
  setLanguage: (language: Language) => void;
  hydrateLanguage: () => void;
  toggleLanguage: () => void;
}

function persistLanguage(language: Language) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export const useLanguageStore = create<LanguageState>()((set, get) => ({
  language: DEFAULT_LANGUAGE,
  hydrated: false,
  setLanguage: (language) => {
    persistLanguage(language);
    set({ language });
  },
  hydrateLanguage: () => {
    const language = detectPreferredLanguage();
    set({ language, hydrated: true });
  },
  toggleLanguage: () => {
    const nextLanguage = get().language === 'en' ? 'ru' : 'en';
    persistLanguage(nextLanguage);
    set({ language: nextLanguage });
  },
}));

export function useI18n() {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const toggleLanguage = useLanguageStore((state) => state.toggleLanguage);

  return {
    language,
    locale: getLocale(language),
    setLanguage,
    toggleLanguage,
    t: messages[language],
  };
}
