'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EditorShell from '@/components/editor/EditorShell';
import { getMap } from '@/lib/api';
import type { MapData } from '@/lib/types';
import { useI18n } from '@/stores/useLanguageStore';

export default function EditorPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [map, setMap] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const mapId = searchParams.get('mapId');

  useEffect(() => {
    if (!mapId) {
      router.push('/');
      return;
    }

    const loaded = getMap(mapId);
    if (!loaded) {
      router.push('/');
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMap(loaded);
      setLoading(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [mapId, router]);

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

  return <EditorShell initialMap={map} />;
}
