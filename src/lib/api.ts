// ============================================================
// Mock API — localStorage persistence layer
// ============================================================

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

const STORAGE_KEY = 'mindflow_maps';

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

  return {
    ...node,
    textDocuments,
  };
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

function getStoredMaps(): Record<string, MapData> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, MapData>;
    return Object.fromEntries(
      Object.entries(parsed).map(([mapId, map]) => [mapId, normalizeMap(map)])
    );
  } catch {
    return {};
  }
}

function saveMaps(maps: Record<string, MapData>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
}

export function getAllMaps(): MapData[] {
  const maps = getStoredMaps();
  return Object.values(maps).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getMap(id: string): MapData | null {
  const maps = getStoredMaps();
  return maps[id] || null;
}

export function createMap(title?: string, language: Language = DEFAULT_LANGUAGE): MapData {
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

  const map: MapData = {
    id: mapId,
    title: title?.trim() || localized.common.defaultMapTitle,
    rootNodeId: rootId,
    layoutMode: 'radial',
    nodes: { [rootId]: rootNode },
    comments: {},
    createdAt: now,
    updatedAt: now,
  };

  const maps = getStoredMaps();
  maps[mapId] = map;
  saveMaps(maps);

  return map;
}

export function saveMap(map: MapData): void {
  const maps = getStoredMaps();
  maps[map.id] = { ...normalizeMap(map), updatedAt: new Date().toISOString() };
  saveMaps(maps);
}

export function deleteMap(id: string): void {
  const maps = getStoredMaps();
  delete maps[id];
  saveMaps(maps);
}

export function duplicateMap(id: string, language: Language = DEFAULT_LANGUAGE): MapData | null {
  const original = getMap(id);
  if (!original) return null;

  const newMapId = generateId();
  const idMapping: Record<string, string> = {};

  // Create new IDs for all nodes
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

  const maps = getStoredMaps();
  maps[newMapId] = newMap;
  saveMaps(maps);

  return newMap;
}

// Create a demo map with some content
export function createDemoMap(language: Language = DEFAULT_LANGUAGE): MapData {
  const mapId = generateId();
  const now = new Date().toISOString();
  const localized = messages[language];

  const centralId = generateId();
  const nodes: Record<string, MindMapNode> = {};

  // Central topic
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

  // Primary topics
  const primaryTexts = localized.demo.primaryTopics;
  const primaryIds: string[] = [];

  primaryTexts.forEach((text, i) => {
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

  // Some subtopics
  const subtopicData = localized.demo.subtopics.map((texts, parent) => ({ parent, texts }));

  subtopicData.forEach(({ parent, texts }) => {
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

  const map: MapData = {
    id: mapId,
    title: localized.demo.mapTitle,
    rootNodeId: centralId,
    layoutMode: 'radial',
    nodes,
    comments: {},
    createdAt: now,
    updatedAt: now,
  };

  const maps = getStoredMaps();
  maps[mapId] = map;
  saveMaps(maps);

  return map;
}
