'use client';
// ============================================================
// ShareModal — Link sharing
// ============================================================

import React, { useState } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { useMapStore } from '@/stores/useMapStore';
import { X, Copy, Check, Link2 } from 'lucide-react';
import { useI18n } from '@/stores/useLanguageStore';

export default function ShareModal() {
  const { t } = useI18n();
  const { activeModal, setActiveModal } = useUIStore();
  const mapData = useMapStore((s) => s.mapData);
  const [copied, setCopied] = useState(false);

  if (activeModal !== 'share') return null;

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/editor/${mapData?.id || ''}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
      }}
      onClick={() => setActiveModal(null)}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          width: '420px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.16)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1E293B', margin: 0 }}>{t.shareModal.title}</h2>
          <button onClick={() => setActiveModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px',
          backgroundColor: '#F8FAFC',
          borderRadius: '10px',
          marginBottom: '16px',
        }}>
          <Link2 size={18} style={{ color: '#6366F1', flexShrink: 0 }} />
          <input
            readOnly
            value={shareUrl}
            style={{
              flex: 1,
              border: 'none',
              background: 'none',
              outline: 'none',
              fontSize: '13px',
              color: '#475569',
            }}
          />
          <button
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: copied ? '#22C55E' : '#6366F1',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              flexShrink: 0,
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? t.common.copied : t.common.copy}
          </button>
        </div>

        <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.5' }}>
          {t.shareModal.description}
        </div>
      </div>
    </div>
  );
}
