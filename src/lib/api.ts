// ============================================================
// API — Supabase persistence (with local-only fallback for guests)
// ============================================================

import { customAlphabet } from 'nanoid';
import { MapData, MindMapNode, TextDocument } from './types';
import { generateId } from './utils';
import { NODE_DEFAULTS, BRANCH_COLORS } from './constants';
import {
  DEFAULT_LANGUAGE,
  getCopyTitle,
  getDocumentDefaultTitle,
  messages,
  type Language,
} from './i18n';
import { getSupabase } from './supabase';

const LEGACY_LOCAL_KEY = 'mindflow_maps';
const MIGRATION_FLAG_KEY = 'mindflow_local_migrated';

// URL-safe slug alphabet (no ambiguous chars), 16 chars ≈ 95 bits entropy.
const slugAlphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const makeSlug = customAlphabet(slugAlphabet, 16);

// ============================================================
// Local-storage helpers (legacy + guest fallback)
// ============================================================

function createLegacyNoteDocument(note: string): TextDocument {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: getDocumentDefaultTitle(1, DEFAULT_LANGUAGE),
    content: note,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeNode(node: MindMapNode): MindMapNode {
  const textDocuments = Array.isArray(node.textDocuments)
    ? node.textDocuments.map((document, index) => {
        const now = new Date().toISOString();
        return {
          id: document.id || generateId(),
          title: document.title?.trim() || getDocumentDefaultTitle(index + 1, DEFAULT_LANGUAGE),
          content: document.content ?? '',
          createdAt: document.createdAt || now,
          updatedAt: document.updatedAt || document.createdAt || now,
        };
      })
    : [];

  if (textDocuments.length === 0 && typeof node.note === 'string' && node.note.trim()) {
    textDocuments.push(createLegacyNoteDocument(node.note));
  }

  return { ...node, textDocuments };
}

function normalizeMap(map: MapData): MapData {
  return {
    ...map,
    nodes: Object.fromEntries(
      Object.entries(map.nodes).map(([nodeId, node]) => [nodeId, normalizeNode(node)])
    ),
    comments: map.comments || {},
  };
}

function readLocalMaps(): Record<string, MapData> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LEGACY_LOCAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, MapData>;
    return Object.fromEntries(
      Object.entries(parsed).map(([mapId, map]) => [mapId, normalizeMap(map)])
    );
  } catch {
    return {};
  }
}

function writeLocalMaps(maps: Record<string, MapData>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LEGACY_LOCAL_KEY, JSON.stringify(maps));
}

// ============================================================
// Map factories (pure — no persistence)
// ============================================================

export function buildBlankMap(title: string | undefined, language: Language): MapData {
  const mapId = generateId();
  const rootId = generateId();
  const now = new Date().toISOString();
  const localized = messages[language];

  const rootNode: MindMapNode = {
    id: rootId,
    mapId,
    parentId: null,
    orderIndex: 0,
    type: 'central',
    text: localized.common.defaultCentralTopic,
    textDocuments: [],
    commentCount: 0,
    attachmentIds: [],
    shape: NODE_DEFAULTS.central.shape,
    fillColor: NODE_DEFAULTS.central.fillColor,
    textColor: NODE_DEFAULTS.central.textColor,
    fontSize: NODE_DEFAULTS.central.fontSize,
    fontWeight: NODE_DEFAULTS.central.fontWeight,
    expanded: true,
    width: NODE_DEFAULTS.central.width,
    height: NODE_DEFAULTS.central.height,
  };

  return {
    id: mapId,
    title: title?.trim() || localized.common.defaultMapTitle,
    rootNodeId: rootId,
    layoutMode: 'radial',
    nodes: { [rootId]: rootNode },
    comments: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function buildDemoMap(language: Language): MapData {
  const mapId = generateId();
  const now = new Date().toISOString();
  const localized = messages[language];

  const centralId = generateId();
  const nodes: Record<string, MindMapNode> = {};

  nodes[centralId] = {
    id: centralId,
    mapId,
    parentId: null,
    orderIndex: 0,
    type: 'central',
    text: localized.demo.centralTopic,
    textDocuments: [],
    commentCount: 0,
    attachmentIds: [],
    shape: 'pill',
    fillColor: NODE_DEFAULTS.central.fillColor,
    textColor: NODE_DEFAULTS.central.textColor,
    fontSize: NODE_DEFAULTS.central.fontSize,
    fontWeight: NODE_DEFAULTS.central.fontWeight,
    expanded: true,
    width: 180,
    height: 56,
  };

  const primaryIds: string[] = [];
  localized.demo.primaryTopics.forEach((text, i) => {
    const id = generateId();
    primaryIds.push(id);
    nodes[id] = {
      id,
      mapId,
      parentId: centralId,
      orderIndex: i,
      type: 'primary',
      text,
      textDocuments: [],
      commentCount: 0,
      attachmentIds: [],
      shape: 'rounded-rectangle',
      lineColor: BRANCH_COLORS[i],
      fontSize: NODE_DEFAULTS.primary.fontSize,
      fontWeight: NODE_DEFAULTS.primary.fontWeight,
      textColor: NODE_DEFAULTS.primary.textColor,
      expanded: true,
      width: 130,
      height: 42,
    };
  });

  localized.demo.subtopics.forEach((texts, parent) => {
    texts.forEach((text, i) => {
      const id = generateId();
      nodes[id] = {
        id,
        mapId,
        parentId: primaryIds[parent],
        orderIndex: i,
        type: 'subtopic',
        text,
        textDocuments: [],
        commentCount: 0,
        attachmentIds: [],
        shape: 'rounded-rectangle',
        lineColor: BRANCH_COLORS[parent],
        fontSize: NODE_DEFAULTS.subtopic.fontSize,
        fontWeight: NODE_DEFAULTS.subtopic.fontWeight,
        textColor: NODE_DEFAULTS.subtopic.textColor,
        expanded: true,
        width: 110,
        height: 36,
      };
    });
  });

  return {
    id: mapId,
    title: localized.demo.mapTitle,
    rootNodeId: centralId,
    layoutMode: 'radial',
    nodes,
    comments: {},
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================
// Supabase row mapping
// ============================================================

type MapRow = {
  id: string;
  owner_id: string | null;
  title: string;
  data: MapData;
  share_slug: string | null;
  created_at: string;
  updated_at: string;
};

function rowToMap(row: MapRow): MapData {
  // `data` carries the canonical map; we trust it but keep id/title in sync
  // with the row in case they were edited elsewhere.
  const data = normalizeMap(row.data);
  return {
    ...data,
    id: row.id,
    title: row.title || data.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================
// Owner-side CRUD (requires auth)
// ============================================================

export async function listMyMaps(): Promise<MapData[]> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('maps')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[mindflow] listMyMaps:', error.message);
    return [];
  }
  return (data as MapRow[]).map(rowToMap);
}

export async function getMyMap(id: string): Promise<MapData | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('maps')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[mindflow] getMyMap:', error.message);
    return null;
  }
  return data ? rowToMap(data as MapRow) : null;
}

export async function createMyMap(map: MapData): Promise<MapData | null> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const normalized = normalizeMap(map);
  const { data, error } = await supabase
    .from('maps')
    .insert({
      id: normalized.id,
      owner_id: user.id,
      title: normalized.title,
      data: normalized,
    })
    .select()
    .single();

  if (error) {
    console.error('[mindflow] createMyMap:', error.message);
    return null;
  }
  return rowToMap(data as MapRow);
}

export async function saveMyMap(map: MapData): Promise<void> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const normalized = normalizeMap(map);
  const { error } = await supabase
    .from('maps')
    .upsert({
      id: normalized.id,
      owner_id: user.id,
      title: normalized.title,
      data: normalized,
    });

  if (error) console.error('[mindflow] saveMyMap:', error.message);
}

export async function deleteMyMap(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('maps').delete().eq('id', id);
  if (error) console.error('[mindflow] deleteMyMap:', error.message);
}

export async function duplicateMyMap(
  id: string,
  language: Language = DEFAULT_LANGUAGE
): Promise<MapData | null> {
  const original = await getMyMap(id);
  if (!original) return null;

  const newMapId = generateId();
  const idMapping: Record<string, string> = {};
  Object.keys(original.nodes).forEach((oldId) => {
    idMapping[oldId] = generateId();
  });

  const newNodes: Record<string, MindMapNode> = {};
  Object.values(original.nodes).forEach((node) => {
    const newNode = {
      ...node,
      id: idMapping[node.id],
      mapId: newMapId,
      parentId: node.parentId ? idMapping[node.parentId] : null,
    };
    newNodes[newNode.id] = newNode;
  });

  const now = new Date().toISOString();
  const newMap: MapData = {
    ...original,
    id: newMapId,
    title: getCopyTitle(original.title, language),
    rootNodeId: idMapping[original.rootNodeId],
    nodes: newNodes,
    comments: {},
    createdAt: now,
    updatedAt: now,
  };

  return await createMyMap(newMap);
}

// ============================================================
// Sharing via slug
// ============================================================

export async function ensureShareSlug(mapId: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data: existing, error: readErr } = await supabase
    .from('maps')
    .select('share_slug')
    .eq('id', mapId)
    .maybeSingle();
  if (readErr) {
    console.error('[mindflow] ensureShareSlug read:', readErr.message);
    return null;
  }
  if (existing?.share_slug) return existing.share_slug;

  const slug = makeSlug();
  const { error } = await supabase
    .from('maps')
    .update({ share_slug: slug })
    .eq('id', mapId);
  if (error) {
    console.error('[mindflow] ensureShareSlug write:', error.message);
    return null;
  }
  return slug;
}

export async function getMapBySlug(slug: string): Promise<MapData | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_map_by_slug', { p_slug: slug });
  if (error) {
    console.error('[mindflow] getMapBySlug:', error.message);
    return null;
  }
  return data ? rowToMap(data as MapRow) : null;
}

export async function saveMapBySlug(slug: string, map: MapData): Promise<void> {
  const supabase = getSupabase();
  const normalized = normalizeMap(map);
  const { error } = await supabase.rpc('update_map_by_slug', {
    p_slug: slug,
    p_title: normalized.title,
    p_data: normalized,
  });
  if (error) console.error('[mindflow] saveMapBySlug:', error.message);
}

// ============================================================
// One-time migration of legacy localStorage maps
// ============================================================

export async function migrateLocalMapsToAccount(): Promise<number> {
  if (typeof window === 'undefined') return 0;
  if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'done') return 0;

  const local = readLocalMaps();
  const entries = Object.values(local);
  if (entries.length === 0) {
    localStorage.setItem(MIGRATION_FLAG_KEY, 'done');
    return 0;
  }

  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  let uploaded = 0;
  for (const map of entries) {
    const normalized = normalizeMap(map);
    const { error } = await supabase.from('maps').upsert(
      {
        id: normalized.id,
        owner_id: user.id,
        title: normalized.title,
        data: normalized,
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.error('[mindflow] migrate map:', map.id, error.message);
      continue;
    }
    uploaded += 1;
  }

  if (uploaded === entries.length) {
    // Keep the legacy data around in case migration was incomplete; just flag done.
    localStorage.setItem(MIGRATION_FLAG_KEY, 'done');
  }
  return uploaded;
}

// ============================================================
// Legacy named exports (kept for callers we haven't refactored yet)
// ============================================================
export { writeLocalMaps as _internalWriteLocalMaps };
