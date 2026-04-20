'use client';
// ============================================================
// CollabEditorClient — Yjs/WebRTC-powered editor (prototype)
// ============================================================
//
// URL params:
//   ?room=ROOM_ID            joiner — reads map from URL hash or waits for P2P
//   ?room=ROOM_ID&mapId=MAP  owner — publishes local map into the room
//
// The invite link encodes the full map snapshot in the URL hash so the
// joiner can open the card immediately without the host being online.
// P2P sync (Yjs/WebRTC) still runs on top for live changes.

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
import LZString from 'lz-string';

type Status = 'connecting' | 'waiting-for-host' | 'live';

// Encode map into URL hash so joiners can load it without host online.
// lz-string → URL-safe chars only (no +/=), and ~3x smaller than base64.
export function encodeMapToHash(map: MapData): string {
  try {
    return LZString.compressToEncodedURIComponent(JSON.stringify(map));
  } catch {
    return '';
  }
}

function decodeMapFromHash(hash: string): MapData | null {
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!raw) return null;
    const json = LZString.decompressFromEncodedURIComponent(raw);
    return json ? (JSON.parse(json) as MapData) : null;
  } catch {
    return null;
  }
}

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
      const states = session.provider.awareness.getStates();
      setPeers(Math.max(0, states.size - 1));
    };
    session.provider.awareness.on('change', updatePeers);
    updatePeers();

    if (mapId) {
      // Owner: load from localStorage and publish to Yjs.
      const local = getMap(mapId);
      if (local) {
        setInitialMap(local);
        setStatus('live');
        setTimeout(() => publishSnapshot(session, local), 0);
      } else {
        setStatus('waiting-for-host');
      }
    } else {
      // Joiner: 1) try Yjs doc, 2) try URL hash, 3) wait for P2P.
      const existing = readSnapshot(session);
      if (existing) {
        setInitialMap(existing);
        setStatus('live');
      } else {
        const fromHash = decodeMapFromHash(window.location.hash);
        if (fromHash) {
          setInitialMap(fromHash);
          setStatus('live');
          // Also publish so P2P peers get it.
          setTimeout(() => publishSnapshot(session, fromHash), 0);
        } else {
          setStatus('waiting-for-host');
        }
      }
    }

    // Watch for incoming P2P snapshot.
    const onSnapshot = () => {
      const snap = readSnapshot(session);
      if (snap) {
        setInitialMap((prev) => prev ?? snap);
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

  if (!room) return <FullscreenMessage text="Создание комнаты…" />;
  if (status === 'waiting-for-host' || !initialMap) {
    return (
      <FullscreenMessage
        text="Загружаем карту… Если экран не меняется — попросите отправителя снова скопировать и прислать ссылку."
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
