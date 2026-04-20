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
import { WebsocketProvider } from 'y-websocket';
import type { MapData } from './types';

export interface CollabSession {
  doc: Y.Doc;
  provider: WebrtcProvider;
  wsProvider: WebsocketProvider;
  shared: Y.Map<string>;
  awareness: WebrtcProvider['awareness'];
  destroy: () => void;
}

// Public Yjs websocket relay — works across any network (no NAT issues).
// WebRTC runs alongside for lower-latency P2P when it can connect.
const WS_RELAY = 'wss://demos.yjs.dev/ws';

export function createCollabSession(roomId: string): CollabSession {
  const doc = new Y.Doc();
  const room = `mindflow-${roomId}`;

  const wsProvider = new WebsocketProvider(WS_RELAY, room, doc);
  const provider = new WebrtcProvider(room, doc, {
    signaling: [
      'wss://signaling.yjs.dev',
      'wss://y-webrtc-signaling-eu.herokuapp.com',
      'wss://y-webrtc-signaling-us.herokuapp.com',
    ],
    awareness: wsProvider.awareness,
  });
  const shared = doc.getMap<string>('mindflow');

  return {
    doc,
    provider,
    wsProvider,
    shared,
    awareness: wsProvider.awareness,
    destroy: () => {
      try { provider.destroy(); } catch {}
      try { wsProvider.destroy(); } catch {}
      try { doc.destroy(); } catch {}
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
