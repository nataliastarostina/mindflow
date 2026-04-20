'use client';
// ============================================================
// CollabEditorClient — Yjs/WebRTC-powered editor (prototype)
// ============================================================
//
// URL params:
//   ?room=ROOM_ID            joiner — waits for snapshot from peers
//   ?room=ROOM_ID&mapId=MAP  owner — publishes local map into the room
//
// Reuses the existing EditorShell. The main editor (/editor) is
// untouched.

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EditorShell from '@/components/editor/EditorShell';
import CollabIndicator from '@/components/editor/CollabIndicator';
import { getMap, createMap } from '@/lib/api';
import type { MapData } from '@/lib/types';
import { useMapStore } from '@/stores/useMapStore';
import {
  createCollabSession,
  publishSnapshot,
  readSnapshot,
  generateRoomId,
  type CollabSession,
} from '@/lib/collab';

type Status = 'connecting' | 'waiting-for-host' | 'live';

export default function CollabEditorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get('room');
  const mapId = searchParams.get('mapId');

  const [initialMap, setInitialMap] = useState<MapData | null>(null);
  const [status, setStatus] = useState<Status>('connecting');
  const [peers, setPeers] = useState(0);
  const sessionRef = useRef<CollabSession | null>(null);

  // Bootstrap: create session, decide owner vs joiner.
  useEffect(() => {
    if (!room) {
      // No room — generate one and become owner of a fresh demo map (or
      // the supplied mapId).
      const newRoom = generateRoomId();
      const params = new URLSearchParams();
      params.set('room', newRoom);
      if (mapId) params.set('mapId', mapId);
      router.replace(`/editor-collab/?${params.toString()}`);
      return;
    }

    const session = createCollabSession(room);
    sessionRef.current = session;

    const updatePeers = () => {
      // y-webrtc exposes connected peers via awareness states minus self.
      const states = session.provider.awareness.getStates();
      setPeers(Math.max(0, states.size - 1));
    };
    session.provider.awareness.on('change', updatePeers);
    updatePeers();

    // Owner path: push local map into the room.
    if (mapId) {
      const local = getMap(mapId);
      if (local) {
        setInitialMap(local);
        setStatus('live');
        // Publish after the doc has had a tick to settle.
        setTimeout(() => publishSnapshot(session, local), 0);
      } else {
        // Map not in localStorage; fall back to joiner behavior.
        setStatus('waiting-for-host');
      }
    } else {
      // Joiner path: try existing snapshot, otherwise wait for one.
      const existing = readSnapshot(session);
      if (existing) {
        setInitialMap(existing);
        setStatus('live');
      } else {
        setStatus('waiting-for-host');
      }
    }

    // Watch for incoming snapshot if we don't have one yet.
    const onSnapshot = () => {
      const snap = readSnapshot(session);
      if (snap && !initialMap) {
        setInitialMap(snap);
        setStatus('live');
      }
    };
    session.shared.observe(onSnapshot);

    return () => {
      session.provider.awareness.off('change', updatePeers);
      session.shared.unobserve(onSnapshot);
      session.destroy();
      sessionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, mapId]);

  // Sync bridge: only mounts once initialMap is loaded into the store.
  if (!room) return <FullscreenMessage text="Создание комнаты…" />;
  if (status === 'waiting-for-host' || !initialMap) {
    return (
      <FullscreenMessage
        text="Ожидаем хоста комнаты… Откройте эту страницу с компьютера, где есть исходная майндкарта."
        sub={`Комната: ${room}`}
      />
    );
  }

  return (
    <>
      <EditorShell initialMap={initialMap} />
      <CollabBridge session={sessionRef} room={room} />
      <CollabIndicator room={room} peers={peers} status={status} />
    </>
  );
}

// ------------------------------------------------------------
// CollabBridge: store <-> Yjs sync wiring
// ------------------------------------------------------------

function CollabBridge({
  session,
  room,
}: {
  session: React.MutableRefObject<CollabSession | null>;
  room: string;
}) {
  useEffect(() => {
    if (!session.current) return;
    const sess = session.current;
    let applyingRemote = false;

    // Local -> Remote: push store changes into Yjs (debounced).
    let pushTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubStore = useMapStore.subscribe((state) => {
      if (applyingRemote) return;
      const map = state.mapData;
      if (!map) return;
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(() => publishSnapshot(sess, map), 80);
    });

    // Remote -> Local: apply incoming snapshots into the store.
    const onRemote = (
      _events: unknown,
      transaction: { local: boolean }
    ) => {
      if (transaction.local) return;
      const snap = readSnapshot(sess);
      if (!snap) return;
      applyingRemote = true;
      try {
        useMapStore.getState().loadMap(snap);
      } finally {
        applyingRemote = false;
      }
    };
    sess.shared.observe(onRemote);

    return () => {
      unsubStore();
      sess.shared.unobserve(onRemote);
      if (pushTimer) clearTimeout(pushTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  return null;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function FullscreenMessage({ text, sub }: { text: string; sub?: string }) {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFBFC',
        color: '#475569',
        fontSize: '14px',
        padding: '24px',
        textAlign: 'center',
        fontFamily:
          '"Segoe UI", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: 480 }}>{text}</div>
      {sub && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#94A3B8' }}>{sub}</div>
      )}
    </div>
  );
}

// Avoid "createMap unused" lint
void createMap;
