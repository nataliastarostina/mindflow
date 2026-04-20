// ============================================================
// Collab — Yjs + y-webrtc P2P sync (prototype)
// ============================================================
//
// One Y.Map per room with a single key 'snapshot' holding
// JSON-serialized MapData. Last-write-wins per snapshot.
// Sufficient for a prototype; can be replaced with a granular
// CRDT model later.

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import type { MapData } from './types';

export interface CollabSession {
  doc: Y.Doc;
  provider: WebrtcProvider;
  shared: Y.Map<string>;
  destroy: () => void;
}

export function createCollabSession(roomId: string): CollabSession {
  const doc = new Y.Doc();
  const provider = new WebrtcProvider(`mindflow-${roomId}`, doc, {
    signaling: [
      'wss://signaling.yjs.dev',
      'wss://y-webrtc-signaling-eu.herokuapp.com',
      'wss://y-webrtc-signaling-us.herokuapp.com',
    ],
  });
  const shared = doc.getMap<string>('mindflow');

  return {
    doc,
    provider,
    shared,
    destroy: () => {
      try {
        provider.destroy();
      } catch {}
      try {
        doc.destroy();
      } catch {}
    },
  };
}

export function publishSnapshot(session: CollabSession, map: MapData) {
  const json = JSON.stringify(map);
  if (session.shared.get('snapshot') === json) return;
  session.shared.set('snapshot', json);
}

export function readSnapshot(session: CollabSession): MapData | null {
  const json = session.shared.get('snapshot');
  if (!json) return null;
  try {
    return JSON.parse(json) as MapData;
  } catch {
    return null;
  }
}

export function generateRoomId(): string {
  // Short, URL-safe id. Crypto if available.
  const bytes = new Uint8Array(9);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
