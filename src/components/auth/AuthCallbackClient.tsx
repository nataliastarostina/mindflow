'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

export default function AuthCallbackClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In the implicit flow Supabase puts tokens in the URL fragment (#…).
    // Errors may appear in either the search string or the hash.
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(
      url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
    );
    const errorParam =
      url.searchParams.get('error_description') ||
      url.searchParams.get('error') ||
      hashParams.get('error_description') ||
      hashParams.get('error');
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

    // detectSessionInUrl: true (see lib/supabase.ts) already parses the hash
    // and persists the session before our effect runs. We just observe.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goHome();
    });

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
