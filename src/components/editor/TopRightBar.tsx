'use client';
// ============================================================
// TopRightBar — Export, Share, Profile
// ============================================================

import React from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { Download, Share2, User } from 'lucide-react';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { useI18n } from '@/stores/useLanguageStore';

export default function TopRightBar() {
  const { t } = useI18n();
  const { setActiveModal } = useUIStore();

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    height: '34px',
    padding: '0 12px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        height: '48px',
        padding: '0 8px',
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 100,
        backgroundColor: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderRadius: '12px',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
      }}
    >
      <LanguageSwitcher />

      <button
        onClick={() => setActiveModal('export')}
        style={{
          ...buttonStyle,
          backgroundColor: 'transparent',
          color: '#475569',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = '#F1F5F9')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
        }
      >
        <Download size={15} />
        <span>{t.editor.export}</span>
      </button>

      <button
        onClick={() => setActiveModal('share')}
        style={{
          ...buttonStyle,
          backgroundColor: '#6366F1',
          color: '#FFFFFF',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = '#4F46E5')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = '#6366F1')
        }
      >
        <Share2 size={15} />
        <span>{t.editor.share}</span>
      </button>

      <div style={{ width: '1px', height: '20px', backgroundColor: '#E2E8F0', margin: '0 2px' }} />

      <button
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #E0E7FF, #C7D2FE)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#4338CA',
        }}
      >
        <User size={16} />
      </button>
    </div>
  );
}
