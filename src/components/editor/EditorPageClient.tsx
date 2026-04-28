'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EditorShell from '@/components/editor/EditorShell';
import { getMyMap, getMapBySlug } from '@/lib/api';
import type { MapData } from '@/lib/types';
import { useI18n } from '@/stores/useLanguageStore';
import { useAuth } from '@/components/auth/AuthProvider';

export default function EditorPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const [map, setMap] = useState<MapData | null>(null);
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const mapId = searchParams.get('mapId');
  const slug = searchParams.get('s');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Shared map via slug — works for any visitor, no auth needed.
      if (slug) {
        const loaded = await getMapBySlug(slug);
        if (cancelled) return;
        if (!loaded) {
          router.replace('/');
          return;
        }
        setMap(loaded);
        setShareSlug(slug);
        setLoading(false);
        return;
      }

      // Owner-scoped map — needs a session.
      if (!mapId) {
        router.replace('/');
        return;
      }
      if (authLoading) return;
      if (!user) {
        router.replace('/login');
        return;
      }

      const loaded = await getMyMap(mapId);
      if (cancelled) return;
      if (!loaded) {
        router.replace('/');
        return;
      }
      setMap(loaded);
      setShareSlug(null);
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [mapId, slug, router, user, authLoading]);

  if (loading || !map) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAFBFC',
          fontFamily: '"Segoe UI", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              fontSize: '18px',
              fontWeight: 700,
              margin: '0 auto 16px',
              animation: 'pulse 1.5s infinite',
            }}
          >
            M
          </div>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>{t.editor.loadingYourMap}</p>
        </div>
      </div>
    );
  }

  return <EditorShell initialMap={map} shareSlug={shareSlug} />;
}
