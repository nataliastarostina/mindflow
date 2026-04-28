'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { useI18n } from '@/stores/useLanguageStore';
import { Mail, Check } from 'lucide-react';

export default function LoginPageClient() {
  const router = useRouter();
  const { user, loading, signInWithEmail } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    const result = await signInWithEmail(trimmed);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFBFC',
        fontFamily: "'Inter', sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            fontSize: 24,
            fontWeight: 700,
            margin: '0 auto 20px',
          }}
        >
          M
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', margin: '0 0 8px' }}>
          {t.auth.welcomeTitle}
        </h1>
        <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 24px', lineHeight: 1.5 }}>
          {t.auth.welcomeSubtitle}
        </p>

        {sent ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              padding: '20px 16px',
              backgroundColor: '#F0FDF4',
              borderRadius: 10,
              color: '#15803D',
            }}
          >
            <Check size={32} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>{t.auth.checkEmailTitle}</div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              {t.auth.checkEmailSubtitle.replace('{email}', email)}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
              }}
            >
              <Mail size={16} style={{ color: '#94A3B8' }} />
              <input
                type="email"
                required
                autoFocus
                placeholder={t.auth.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'none',
                  fontSize: 14,
                  color: '#1E293B',
                  minWidth: 0,
                }}
              />
            </label>

            {error && (
              <div style={{ fontSize: 12, color: '#DC2626', textAlign: 'left' }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={busy}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 10,
                border: 'none',
                backgroundColor: '#6366F1',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 600,
                cursor: busy ? 'wait' : 'pointer',
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? t.common.loading : t.auth.sendMagicLink}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
