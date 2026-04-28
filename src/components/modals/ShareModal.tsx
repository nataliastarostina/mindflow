'use client';
// ============================================================
// ShareModal — Short shareable link via Supabase slug
// ============================================================

import React, { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { useMapStore } from '@/stores/useMapStore';
import { ensureShareSlug } from '@/lib/api';
import { buildShareUrl } from '@/lib/routes';
import { X, Copy, Check, Link2 } from 'lucide-react';
import { useI18n } from '@/stores/useLanguageStore';

export default function ShareModal() {
  const { t } = useI18n();
  const { activeModal, setActiveModal } = useUIStore();
  const mapData = useMapStore((s) => s.mapData);
  const persist = useMapStore((s) => s.persist);
  const shareSlugInStore = useMapStore((s) => s.shareSlug);
  const [shareUrl, setShareUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = activeModal === 'share';

  useEffect(() => {
    if (!open || !mapData) return;
    let cancelled = false;
    setBusy(true);
    setError(null);

    (async () => {
      // Make sure the latest in-memory edits hit the database before we mint
      // a slug — otherwise the recipient could open an out-of-date snapshot.
      persist();

      // If the editor is already in shared-mode, reuse that slug; otherwise
      // ask the API to ensure (or create) one for this owner-scoped map.
      let slug = shareSlugInStore;
      if (!slug) {
        slug = await ensureShareSlug(mapData.id);
      }

      if (cancelled) return;
      if (!slug) {
        setError(t.shareModal.errorCouldNotShare);
        setBusy(false);
        return;
      }
      setShareUrl(buildShareUrl(slug));
      setBusy(false);
    })();

    return () => { cancelled = true; };
  }, [open, mapData, persist, shareSlugInStore, t]);

  if (!open) return null;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await copyToClipboard(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <button
            onClick={() => setActiveModal(null)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px',
            backgroundColor: '#F8FAFC',
            borderRadius: '10px',
            marginBottom: '12px',
          }}
        >
          <Link2 size={18} style={{ color: '#6366F1', flexShrink: 0 }} />
          <input
            readOnly
            value={busy ? t.common.loading : shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              flex: 1,
              border: 'none',
              background: 'none',
              outline: 'none',
              fontSize: '13px',
              color: '#475569',
              minWidth: 0,
            }}
          />
          <button
            onClick={handleCopy}
            disabled={busy || !shareUrl}
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
              cursor: busy ? 'wait' : 'pointer',
              flexShrink: 0,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? t.common.copied : t.common.copy}
          </button>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 12 }}>{error}</div>
        )}

        <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.5' }}>
          {t.shareModal.description}
        </div>
      </div>
    </div>
  );
}
