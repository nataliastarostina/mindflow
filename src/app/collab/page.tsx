'use client';
// ============================================================
// /collab — entry page for collaborative editing (prototype)
// ============================================================
//
// Lists local maps so the owner can start a collab session, and
// lets joiners paste a room link / id. Does not touch the main
// /editor flow.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAllMaps } from '@/lib/api';
import { generateRoomId } from '@/lib/collab';
import type { MapData } from '@/lib/types';

export default function CollabHomePage() {
  const router = useRouter();
  const [maps, setMaps] = useState<MapData[]>([]);
  const [joinValue, setJoinValue] = useState('');

  useEffect(() => {
    setMaps(getAllMaps());
  }, []);

  const startCollab = (mapId: string) => {
    const room = generateRoomId();
    const params = new URLSearchParams({ room, mapId });
    router.push(`/editor-collab/?${params.toString()}`);
  };

  const onJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinValue.trim();
    if (!trimmed) return;

    let room = trimmed;
    try {
      const url = new URL(trimmed);
      room = url.searchParams.get('room') || trimmed;
    } catch {
      // not a URL — assume it's already a room id
    }
    router.push(`/editor-collab/?room=${encodeURIComponent(room)}`);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAFBFC',
        padding: '40px 24px',
        fontFamily:
          '"Inter", "Segoe UI", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
        color: '#0F172A',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Совместное редактирование (beta)</h1>
          <Link href="/" style={{ fontSize: 13, color: '#6366F1', textDecoration: 'none' }}>
            ← К моим картам
          </Link>
        </div>

        <p style={{ fontSize: 13, color: '#64748B', marginTop: 0, marginBottom: 32, lineHeight: 1.5 }}>
          Прототип на Yjs + WebRTC. Работает, когда оба собеседника одновременно онлайн.
          Все ваши локальные майндкарты остаются на месте — этот режим использует отдельный маршрут{' '}
          <code>/editor-collab/</code>.
        </p>

        {/* Owner: start session from local map */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#475569', margin: '0 0 12px' }}>
            Поделиться моей картой
          </h2>
          {maps.length === 0 ? (
            <div
              style={{
                padding: 16,
                backgroundColor: '#FFFFFF',
                border: '1px dashed #CBD5E1',
                borderRadius: 12,
                fontSize: 13,
                color: '#94A3B8',
              }}
            >
              Сначала создайте карту в обычном редакторе, потом возвращайтесь сюда.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {maps.map((m) => (
                <li
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{m.title}</span>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>
                      Обновлено {new Date(m.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => startCollab(m.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: '#6366F1',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      flexShrink: 0,
                      marginLeft: 12,
                    }}
                  >
                    Открыть в Collab
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Joiner: paste invite link */}
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#475569', margin: '0 0 12px' }}>
            Подключиться по ссылке
          </h2>
          <form
            onSubmit={onJoin}
            style={{
              display: 'flex',
              gap: 8,
              padding: 12,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)',
            }}
          >
            <input
              value={joinValue}
              onChange={(e) => setJoinValue(e.target.value)}
              placeholder="Вставьте ссылку или ID комнаты"
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Подключиться
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
