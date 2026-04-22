// ============================================================
// collabRooms — per-map collab room tracking in localStorage
// ============================================================
//
// When a user starts a collab session from the Share modal we
// record the room id against the map id so that any open tab
// of /editor?mapId=X can re-join that room on mount.

const KEY = 'mindflow_collab_rooms';
const EVENT = 'mindflow-collab-changed';

type RoomMap = Record<string, string>;

function read(): RoomMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as RoomMap;
  } catch {
    return {};
  }
}

function write(obj: RoomMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
  } catch {}
}

function emit(mapId: string, room: string | null) {
  try {
    window.dispatchEvent(
      new CustomEvent(EVENT, { detail: { mapId, room } })
    );
  } catch {}
}

export function getCollabRoomForMap(mapId: string): string | null {
  if (typeof window === 'undefined') return null;
  return read()[mapId] || null;
}

export function setCollabRoomForMap(mapId: string, room: string) {
  if (typeof window === 'undefined') return;
  const obj = read();
  obj[mapId] = room;
  write(obj);
  emit(mapId, room);
}

export function clearCollabRoomForMap(mapId: string) {
  if (typeof window === 'undefined') return;
  const obj = read();
  delete obj[mapId];
  write(obj);
  emit(mapId, null);
}

export function subscribeCollabRoom(
  mapId: string,
  cb: (room: string | null) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const ev = e as CustomEvent<{ mapId: string; room: string | null }>;
    if (ev.detail?.mapId === mapId) cb(ev.detail.room);
  };
  window.addEventListener(EVENT, handler);
  // Also listen to storage events so other tabs stay in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cb(getCollabRoomForMap(mapId));
  };
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('storage', onStorage);
  };
}
