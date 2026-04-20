'use client';
// ============================================================
// ShareModal — Link sharing
// ============================================================

import React, { useState } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { useMapStore } from '@/stores/useMapStore';
import { getEditorHref } from '@/lib/routes';
import { X, Copy, Check, Link2, Users } from 'lucide-react';
import { useI18n } from '@/stores/useLanguageStore';
import { generateRoomId } from '@/lib/collab';
import { encodeMapToHash } from '@/components/editor/CollabEditorClient';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';

export default function ShareModal() {
  const { t } = useI18n();
  const { activeModal, setActiveModal } = useUIStore();
  const mapData = useMapStore((s) => s.mapData);
  const persist = useMapStore((s) => s.persist);
  const [copied, setCopied] = useState(false);
  const [collabCopied, setCollabCopied] = useState(false);
  const [collabUrl, setCollabUrl] = useState('');

  if (activeModal !== 'share') return null;

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${basePath}${getEditorHref(mapData?.id || '')}`
      : '';

  const buildCollabUrl = () => {
    if (!mapData || typeof window === 'undefined') return '';
    persist();
    const room = generateRoomId();
    const encoded = encodeMapToHash(mapData);
    const url = `${window.location.origin}${basePath}/editor-collab/?room=${room}${encoded ? `#${encoded}` : ''}`;
    return url;
  };

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

  const handleCollab = async () => {
    const url = buildCollabUrl();
    if (!url) return;
    setCollabUrl(url);
    await copyToClipboard(url);
    setCollabCopied(true);
    setTimeout(() => setCollabCopied(false), 2000);
    const ownerUrl = url.split('#')[0] + (mapData ? `&mapId=${encodeURIComponent(mapData.id)}` : '');
    window.open(ownerUrl, '_blank', 'noopener');
  };

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

        <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.5', marginBottom: 20 }}>
          {t.shareModal.description}
        </div>

        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Users size={16} style={{ color: '#10B981' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>
              Совместное редактирование
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#10B981',
              backgroundColor: '#D1FAE5',
              padding: '2px 6px',
              borderRadius: 4,
              textTransform: 'uppercase',
            }}>
              Beta
            </span>
          </div>

          {!collabUrl ? (
            <button
              onClick={handleCollab}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 10,
                border: 'none',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Users size={14} />
              Создать ссылку для коллабы
            </button>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 12,
              backgroundColor: '#F0FDF4',
              borderRadius: 10,
            }}>
              <Link2 size={18} style={{ color: '#10B981', flexShrink: 0 }} />
              <input
                readOnly
                value={collabUrl}
                onFocus={(e) => e.currentTarget.select()}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'none',
                  outline: 'none',
                  fontSize: 13,
                  color: '#475569',
                  minWidth: 0,
                }}
              />
              <button
                onClick={async () => {
                  await copyToClipboard(collabUrl);
                  setCollabCopied(true);
                  setTimeout(() => setCollabCopied(false), 2000);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: collabCopied ? '#22C55E' : '#10B981',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {collabCopied ? <Check size={14} /> : <Copy size={14} />}
                {collabCopied ? t.common.copied : t.common.copy}
              </button>
            </div>
          )}

          <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.5, marginTop: 8 }}>
            Ссылка откроет карту у получателя, и вы будете редактировать её вместе в реальном времени. Ваша сессия откроется в новой вкладке.
          </div>
        </div>
      </div>
    </div>
  );
}
