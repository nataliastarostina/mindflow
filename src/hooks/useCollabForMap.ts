// ============================================================
// useCollabForMap — runs the Yjs collab bridge on /editor
// ============================================================
//
// When a collab room is registered for the given map id, opens
// a Yjs session and wires local ↔ remote sync. No-op otherwise.
// This is what makes refreshing /editor pick up peer edits
// without the separate /editor-collab tab being open.

import { useEffect, useRef, useState } from 'react';
import {
  createCollabSession,
  publishSnapshot,
  readSnapshot,
  type CollabSession,
} from '@/lib/collab';
import { getCollabRoomForMap, subscribeCollabRoom } from '@/lib/collabRooms';
import { useMapStore } from '@/stores/useMapStore';

export type CollabStatus = 'idle' | 'connecting' | 'live';

export interface CollabInfo {
  room: string | null;
  peers: number;
  status: CollabStatus;
}

export function useCollabForMap(mapId: string | null | undefined): CollabInfo {
  const [room, setRoom] = useState<string | null>(null);
  const [peers, setPeers] = useState(0);
  const [status, setStatus] = useState<CollabStatus>('idle');
  const sessionRef = useRef<CollabSession | null>(null);

  // Watch the room registry for this map.
  useEffect(() => {
    if (!mapId) {
      setRoom(null);
      return;
    }
    setRoom(getCollabRoomForMap(mapId));
    return subscribeCollabRoom(mapId, (next) => setRoom(next));
  }, [mapId]);

  // Open/close the collab session whenever the room changes.
  useEffect(() => {
    if (!room || !mapId) {
      setStatus('idle');
      setPeers(0);
      return;
    }

    const session = createCollabSession(room);
    sessionRef.current = session;
    setStatus('connecting');

    const updatePeers = () => {
      const states = session.awareness.getStates();
      setPeers(Math.max(0, states.size - 1));
    };
    session.awareness.on('change', updatePeers);
    updatePeers();

    let applyingRemote = false;
    let pushTimer: ReturnType<typeof setTimeout> | null = null;

    // Local → remote (debounced).
    const unsubStore = useMapStore.subscribe((state) => {
      if (applyingRemote) return;
      const map = state.mapData;
      if (!map) return;
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(() => publishSnapshot(session, map), 80);
    });

    // Remote → local.
    const onRemote = (
      _events: unknown,
      transaction: { local: boolean }
    ) => {
      if (transaction.local) return;
      const snap = readSnapshot(session);
      if (!snap) return;
      applyingRemote = true;
      try {
        const store = useMapStore.getState();
        store.loadMap(snap);
        store.persist();
      } finally {
        applyingRemote = false;
      }
    };
    session.shared.observe(onRemote);

    // Initial merge: wait for the ws relay to hand us whatever the room
    // already has, then pick the newer of (remote snapshot, local map).
    // This stops a stale /editor tab from overwriting fresh peer edits.
    const initialMergeTimer = setTimeout(() => {
      const remote = readSnapshot(session);
      const local = useMapStore.getState().mapData;
      if (remote && local) {
        const rt = Date.parse(remote.updatedAt || '') || 0;
        const lt = Date.parse(local.updatedAt || '') || 0;
        if (rt > lt) {
          applyingRemote = true;
          try {
            useMapStore.getState().loadMap(remote);
            useMapStore.getState().persist();
          } finally {
            applyingRemote = false;
          }
        } else {
          publishSnapshot(session, local);
        }
      } else if (local) {
        publishSnapshot(session, local);
      }
      setStatus('live');
    }, 600);

    return () => {
      clearTimeout(initialMergeTimer);
      session.awareness.off('change', updatePeers);
      unsubStore();
      session.shared.unobserve(onRemote);
      if (pushTimer) clearTimeout(pushTimer);
      session.destroy();
      sessionRef.current = null;
    };
  }, [room, mapId]);

  return { room, peers, status };
}
