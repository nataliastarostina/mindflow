'use client';
// ============================================================
// CollabIndicator — floating panel showing room + invite link
// ============================================================

import { useState } from 'react';
import { Link2, Users, Check } from 'lucide-react';

interface Props {
  room: string;
  peers: number;
  status: string;
}

export default function CollabIndicator({ room, peers, status }: Props) {
  const [copied, setCopied] = useState(false);

  const inviteUrl = (() => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('room', room);
    return url.toString();
  })();

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('Скопируйте ссылку:', inviteUrl);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 72,
        right: 16,
        zIndex: 90,
        backgroundColor: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: 12,
        boxShadow: '0 1px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: "'Inter', sans-serif",
        fontSize: 12,
        color: '#475569',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: status === 'live' ? '#10B981' : '#F59E0B',
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            display: 'inline-block',
          }}
        />
        Collab (beta)
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B' }}>
        <Users size={13} />
        <span>{peers}</span>
      </div>
      <button
        onClick={onCopy}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: 8,
          border: 'none',
          backgroundColor: copied ? '#10B981' : '#6366F1',
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {copied ? <Check size={13} /> : <Link2 size={13} />}
        <span>{copied ? 'Скопировано' : 'Скопировать ссылку'}</span>
      </button>
    </div>
  );
}
