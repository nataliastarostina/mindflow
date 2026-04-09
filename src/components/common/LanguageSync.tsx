'use client';

import { useEffect } from 'react';
import { useLanguageStore } from '@/stores/useLanguageStore';

export default function LanguageSync() {
  const language = useLanguageStore((state) => state.language);
  const hydrateLanguage = useLanguageStore((state) => state.hydrateLanguage);

  useEffect(() => {
    hydrateLanguage();
  }, [hydrateLanguage]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return null;
}
