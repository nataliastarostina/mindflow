'use client';

import React from 'react';
import { useI18n } from '@/stores/useLanguageStore';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  const buttonStyle = (active: boolean): React.CSSProperties => ({
    height: '28px',
    minWidth: '38px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: active ? '#FFFFFF' : 'transparent',
    color: active ? '#0F172A' : '#64748B',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    boxShadow: active ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
    transition: 'all 0.15s ease',
  });

  return (
    <div
      aria-label={t.languageSwitcher.label}
      title={t.languageSwitcher.label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        padding: '3px',
        borderRadius: '10px',
        backgroundColor: '#F1F5F9',
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={() => setLanguage('ru')}
        style={buttonStyle(language === 'ru')}
      >
        RU
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        style={buttonStyle(language === 'en')}
      >
        EN
      </button>
    </div>
  );
}
