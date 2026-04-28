'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

export default function AuthCallbackClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const errorParam = url.searchParams.get('error_description') || url.searchParams.get('error');
    if (errorParam) {
      setError(errorParam);
      return;
    }

    const supabase = getSupabase();
    let cancelled = false;

    const goHome = () => {
      if (cancelled) return;
      router.replace('/');
    };

    const code = url.searchParams.get('code');

    const run = async () => {
      // First check if a session is already present (detectSessionInUrl may
      // have already exchanged the code on client init).
      const existing = await supabase.auth.getSession();
      if (existing.data.session) {
        goHome();
        return;
      }

      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
        if (data.session) {
          goHome();
          return;
        }
      }
    };

    run();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) goHome();
    });

    const timeout = setTimeout(() => {
      if (!cancelled) setError('Sign-in is taking too long. Please try again.');
    }, 10000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFBFC',
        color: error ? '#DC2626' : '#94A3B8',
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        padding: 24,
        textAlign: 'center',
      }}
    >
      {error ? `Authentication failed: ${error}` : 'Signing you in…'}
    </div>
  );
}
