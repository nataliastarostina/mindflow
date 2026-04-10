'use client';

import type { CommentData, MapData, MindMapNode } from './types';

const DOCS_API_BASE = 'https://docs.googleapis.com/v1/documents';
const REQUEST_CHUNK_SIZE = 80;

type GoogleDocsColor = {
  color: {
    rgbColor: {
      red: number;
      green: number;
      blue: number;
    };
  };
};

type GoogleDocsTextStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  foregroundColor?: GoogleDocsColor;
  backgroundColor?: GoogleDocsColor;
  weightedFontFamily?: { fontFamily: string };
  link?: { url: string } | { tabId: string };
};

type GoogleDocsParagraphStyle = {
  namedStyleType?: 'NORMAL_TEXT' | 'TITLE' | 'HEADING_1' | 'HEADING_2' | 'HEADING_3';
  alignment?: 'START' | 'CENTER' | 'END';
  indentStart?: { magnitude: number; unit: 'PT' };
};

type GoogleDocsRange = {
  tabId: string;
  startIndex: number;
  endIndex: number;
};

type GoogleDocsRequest = {
  insertText?: {
    text: string;
    endOfSegmentLocation: {
      tabId: string;
    };
  };
  updateTextStyle?: {
    range: GoogleDocsRange;
    textStyle: GoogleDocsTextStyle;
    fields: string;
  };
  updateParagraphStyle?: {
    range: GoogleDocsRange;
    paragraphStyle: GoogleDocsParagraphStyle;
    fields: string;
  };
  createParagraphBullets?: {
    range: GoogleDocsRange;
    bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE' | 'NUMBERED_DECIMAL_ALPHA_ROMAN';
  };
  updateDocumentTabProperties?: {
    tabProperties: {
      tabId: string;
      title?: string;
    };
    fields: string;
  };
  addDocumentTab?: {
    tabProperties: {
      title: string;
      parentTabId?: string;
    };
  };
};

type GoogleDocsBatchUpdateResponse = {
  replies?: Array<{
    addDocumentTab?: {
      tabProperties?: {
        tabId?: string;
      };
    };
  }>;
};

type GoogleDocsDocument = {
  documentId: string;
  title?: string;
  tabs?: GoogleDocsTab[];
};

type GoogleDocsTab = {
  tabProperties?: {
    tabId?: string;
    title?: string;
    parentTabId?: string;
  };
  childTabs?: GoogleDocsTab[];
};

export type GoogleDocsExportBlock = {
  text: string;
  runs: Array<{
    start: number;
    end: number;
    style: GoogleDocsTextStyle;
  }>;
  paragraphStyle?: GoogleDocsParagraphStyle;
  listKind?: 'bullet' | 'numbered';
  listLevel?: number;
};

export type GoogleDocsExportLabels = {
  structureTabTitle: string;
  hierarchyTitle: string;
  documentsTitle: string;
  commentsTitle: string;
  linkTitle: string;
  untitledNode: string;
  untitledDocument: string;
};

export type GoogleDocsExportOptions = {
  mapData: MapData;
  selectedNodeIds: string[];
  locale: string;
  accessToken: string;
  labels: GoogleDocsExportLabels;
};

export type GoogleDocsExportResult = {
  documentId: string;
  documentUrl: string;
  tabByNodeId: Record<string, string>;
};

type ChildrenByParent = Record<string, MindMapNode[]>;

type TextRunAccumulator = {
  text: string;
  runs: GoogleDocsExportBlock['runs'];
};

function cleanTitle(value: string | undefined, fallback: string): string {
  const title = (value || '').replace(/\s+/g, ' ').trim();
  return (title || fallback).slice(0, 100);
}

function compareNodes(a: MindMapNode, b: MindMapNode): number {
  if (a.type === 'central' && b.type !== 'central') return -1;
  if (b.type === 'central' && a.type !== 'central') return 1;
  return a.orderIndex - b.orderIndex || a.text.localeCompare(b.text);
}

function buildChildrenByParent(mapData: MapData): ChildrenByParent {
  const childrenByParent: ChildrenByParent = {};

  Object.values(mapData.nodes).forEach((node) => {
    const parentKey = node.parentId || '__root__';
    childrenByParent[parentKey] ||= [];
    childrenByParent[parentKey].push(node);
  });

  Object.values(childrenByParent).forEach((children) => children.sort(compareNodes));
  return childrenByParent;
}

function getRootOrderedNodes(mapData: MapData, childrenByParent: ChildrenByParent): MindMapNode[] {
  const roots = childrenByParent.__root__ || [];
  const rootNode = mapData.nodes[mapData.rootNodeId];
  if (!rootNode) return roots;

  return [
    rootNode,
    ...roots.filter((node) => node.id !== rootNode.id),
  ];
}

function getPreorderNodes(mapData: MapData, childrenByParent: ChildrenByParent): MindMapNode[] {
  const result: MindMapNode[] = [];
  const visit = (node: MindMapNode) => {
    result.push(node);
    (childrenByParent[node.id] || []).forEach(visit);
  };

  getRootOrderedNodes(mapData, childrenByParent).forEach(visit);
  return result;
}

function getAssignedContentNodes(
  rootNodeId: string,
  childrenByParent: ChildrenByParent,
  selectedNodeIds: Set<string>
): MindMapNode[] {
  const result: MindMapNode[] = [];

  const visit = (node: MindMapNode, belongsToRoot: boolean) => {
    const isRootNode = node.id === rootNodeId;
    const isSelectedBoundary = selectedNodeIds.has(node.id) && !isRootNode;

    if (isRootNode || (belongsToRoot && !isSelectedBoundary)) {
      result.push(node);
    }

    if (isSelectedBoundary) {
      return;
    }

    const nextBelongsToRoot = belongsToRoot || isRootNode;
    (childrenByParent[node.id] || []).forEach((child) => visit(child, nextBelongsToRoot));
  };

  const root = (childrenByParent.__all__ || []).find((node) => node.id === rootNodeId);
  if (!root) return result;
  visit(root, false);
  return result;
}

function hasNodeContent(node: MindMapNode, comments: CommentData[] | undefined): boolean {
  return Boolean(
    node.link ||
      (node.textDocuments || []).some((document) => document.title.trim() || document.content.trim()) ||
      (comments && comments.length > 0)
  );
}

function styleFields(style: GoogleDocsTextStyle): string {
  return Object.keys(style).join(',');
}

function paragraphStyleFields(style: GoogleDocsParagraphStyle): string {
  return Object.keys(style).join(',');
}

function colorFromCss(value: string | null | undefined): GoogleDocsColor | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'transparent' || normalized === 'currentcolor') return undefined;

  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1);
    const expanded = hex.length === 3
      ? hex.split('').map((part) => `${part}${part}`).join('')
      : hex;

    if (!/^[0-9a-f]{6}$/.test(expanded)) return undefined;

    return {
      color: {
        rgbColor: {
          red: parseInt(expanded.slice(0, 2), 16) / 255,
          green: parseInt(expanded.slice(2, 4), 16) / 255,
          blue: parseInt(expanded.slice(4, 6), 16) / 255,
        },
      },
    };
  }

  const rgbMatch = normalized.match(/^rgba?\(([^)]+)\)$/);
  if (!rgbMatch) return undefined;

  const [red, green, blue] = rgbMatch[1]
    .split(',')
    .slice(0, 3)
    .map((part) => Number.parseFloat(part.trim()));

  if ([red, green, blue].some((part) => typeof part !== 'number' || Number.isNaN(part))) return undefined;

  return {
    color: {
      rgbColor: {
        red: Math.max(0, Math.min(255, red)) / 255,
        green: Math.max(0, Math.min(255, green)) / 255,
        blue: Math.max(0, Math.min(255, blue)) / 255,
      },
    },
  };
}

function mergeTextStyle(
  base: GoogleDocsTextStyle,
  next: GoogleDocsTextStyle
): GoogleDocsTextStyle {
  return {
    ...base,
    ...next,
  };
}

function getElementTextStyle(element: HTMLElement, parentStyle: GoogleDocsTextStyle): GoogleDocsTextStyle {
  const tagName = element.tagName.toLowerCase();
  const nextStyle: GoogleDocsTextStyle = {};

  if (tagName === 'b' || tagName === 'strong') nextStyle.bold = true;
  if (tagName === 'i' || tagName === 'em') nextStyle.italic = true;
  if (tagName === 'u') nextStyle.underline = true;
  if (tagName === 'code') nextStyle.weightedFontFamily = { fontFamily: 'Courier New' };
  if (tagName === 'a') {
    const href = element.getAttribute('href');
    if (href) nextStyle.link = { url: href };
  }

  const inlineStyle = element.style;
  if (inlineStyle.fontWeight === 'bold' || Number.parseInt(inlineStyle.fontWeight, 10) >= 600) {
    nextStyle.bold = true;
  }
  if (inlineStyle.fontStyle === 'italic') nextStyle.italic = true;
  if (inlineStyle.textDecoration.includes('underline')) nextStyle.underline = true;

  const foregroundColor = colorFromCss(inlineStyle.color);
  const backgroundColor = colorFromCss(inlineStyle.backgroundColor);
  if (foregroundColor) nextStyle.foregroundColor = foregroundColor;
  if (backgroundColor) nextStyle.backgroundColor = backgroundColor;

  return mergeTextStyle(parentStyle, nextStyle);
}

function getElementParagraphStyle(element: HTMLElement): GoogleDocsParagraphStyle | undefined {
  const alignmentMap: Record<string, GoogleDocsParagraphStyle['alignment']> = {
    left: 'START',
    start: 'START',
    center: 'CENTER',
    right: 'END',
    end: 'END',
  };
  const alignment = alignmentMap[element.style.textAlign];
  return alignment ? { alignment } : undefined;
}

function appendTextRun(accumulator: TextRunAccumulator, text: string, style: GoogleDocsTextStyle) {
  if (!text) return;

  const start = accumulator.text.length;
  accumulator.text += text;
  const end = accumulator.text.length;

  if (styleFields(style)) {
    accumulator.runs.push({ start, end, style });
  }
}

function collectInlineContent(
  node: Node,
  inheritedStyle: GoogleDocsTextStyle,
  accumulator: TextRunAccumulator
) {
  if (node.nodeType === Node.TEXT_NODE) {
    appendTextRun(accumulator, node.textContent || '', inheritedStyle);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'br') {
    appendTextRun(accumulator, '\n', inheritedStyle);
    return;
  }

  if (tagName === 'ul' || tagName === 'ol') {
    return;
  }

  const nextStyle = getElementTextStyle(element, inheritedStyle);
  element.childNodes.forEach((child) => collectInlineContent(child, nextStyle, accumulator));
}

function inlineBlockFromElement(
  element: HTMLElement,
  paragraphStyle?: GoogleDocsParagraphStyle
): GoogleDocsExportBlock | null {
  const accumulator: TextRunAccumulator = { text: '', runs: [] };
  element.childNodes.forEach((child) => collectInlineContent(child, {}, accumulator));
  const text = accumulator.text.replace(/\n{3,}/g, '\n\n').trimEnd();
  if (!text.trim()) return null;

  return {
    text,
    runs: accumulator.runs.filter((run) => run.start < text.length),
    paragraphStyle: {
      ...paragraphStyle,
      ...getElementParagraphStyle(element),
    },
  };
}

function convertListElementToBlocks(
  element: HTMLElement,
  level: number,
  listKind: 'bullet' | 'numbered'
): GoogleDocsExportBlock[] {
  const blocks: GoogleDocsExportBlock[] = [];

  Array.from(element.children).forEach((child) => {
    if (!(child instanceof HTMLElement) || child.tagName.toLowerCase() !== 'li') return;

    const accumulator: TextRunAccumulator = { text: '', runs: [] };
    child.childNodes.forEach((itemChild) => collectInlineContent(itemChild, {}, accumulator));
    const text = accumulator.text.replace(/\n{3,}/g, '\n\n').trimEnd();

    if (text.trim()) {
      blocks.push({
        text,
        runs: accumulator.runs.filter((run) => run.start < text.length),
        listKind,
        listLevel: level,
      });
    }

    Array.from(child.children).forEach((nestedChild) => {
      if (!(nestedChild instanceof HTMLElement)) return;
      const nestedTag = nestedChild.tagName.toLowerCase();
      if (nestedTag === 'ul' || nestedTag === 'ol') {
        blocks.push(...convertListElementToBlocks(nestedChild, level + 1, nestedTag === 'ol' ? 'numbered' : 'bullet'));
      }
    });
  });

  return blocks;
}

function convertElementToBlocks(element: HTMLElement): GoogleDocsExportBlock[] {
  const tagName = element.tagName.toLowerCase();

  if (tagName === 'ul' || tagName === 'ol') {
    return convertListElementToBlocks(element, 0, tagName === 'ol' ? 'numbered' : 'bullet');
  }

  if (tagName === 'h1') {
    const block = inlineBlockFromElement(element, { namedStyleType: 'HEADING_1' });
    return block ? [block] : [];
  }

  if (tagName === 'h2') {
    const block = inlineBlockFromElement(element, { namedStyleType: 'HEADING_2' });
    return block ? [block] : [];
  }

  if (tagName === 'h3') {
    const block = inlineBlockFromElement(element, { namedStyleType: 'HEADING_3' });
    return block ? [block] : [];
  }

  if (tagName === 'blockquote') {
    const block = inlineBlockFromElement(element, {
      namedStyleType: 'NORMAL_TEXT',
      indentStart: { magnitude: 18, unit: 'PT' },
    });
    return block
      ? [{
          ...block,
          runs: block.runs.length > 0
            ? block.runs
            : [{ start: 0, end: block.text.length, style: { italic: true } }],
        }]
      : [];
  }

  if (tagName === 'pre') {
    const text = element.textContent?.trimEnd() || '';
    return text.trim()
      ? [{
          text,
          runs: [{ start: 0, end: text.length, style: { weightedFontFamily: { fontFamily: 'Courier New' } } }],
          paragraphStyle: {
            namedStyleType: 'NORMAL_TEXT',
            indentStart: { magnitude: 18, unit: 'PT' },
          },
        }]
      : [];
  }

  const block = inlineBlockFromElement(element, { namedStyleType: 'NORMAL_TEXT' });
  return block ? [block] : [];
}

function htmlToBlocks(html: string): GoogleDocsExportBlock[] {
  const trimmed = html.trim();
  if (!trimmed) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, 'text/html');
  const blocks: GoogleDocsExportBlock[] = [];

  Array.from(doc.body.children).forEach((child) => {
    if (child instanceof HTMLElement) {
      blocks.push(...convertElementToBlocks(child));
    }
  });

  if (blocks.length > 0) return blocks;

  const fallbackText = doc.body.textContent?.trim() || '';
  return fallbackText ? [{ text: fallbackText, runs: [] }] : [];
}

class GoogleDocsTabWriter {
  private index = 1;

  constructor(
    private readonly tabId: string,
    private readonly requests: GoogleDocsRequest[]
  ) {}

  addBlock(block: GoogleDocsExportBlock) {
    if (!block.text.trim()) return;

    const leadingTabs = '\t'.repeat(block.listLevel || 0);
    const text = `${leadingTabs}${block.text}\n`;
    const startIndex = this.index;
    const endIndex = startIndex + text.length;

    this.requests.push({
      insertText: {
        text,
        endOfSegmentLocation: {
          tabId: this.tabId,
        },
      },
    });

    this.index = endIndex;

    if (block.listKind) {
      this.requests.push({
        createParagraphBullets: {
          range: {
            tabId: this.tabId,
            startIndex,
            endIndex,
          },
          bulletPreset: block.listKind === 'numbered'
            ? 'NUMBERED_DECIMAL_ALPHA_ROMAN'
            : 'BULLET_DISC_CIRCLE_SQUARE',
        },
      });
      this.index -= leadingTabs.length;
    }

    const adjustedTextStart = startIndex;
    const adjustedTextEnd = adjustedTextStart + block.text.length;
    const paragraphEnd = adjustedTextEnd + 1;

    if (block.paragraphStyle && paragraphStyleFields(block.paragraphStyle)) {
      this.requests.push({
        updateParagraphStyle: {
          range: {
            tabId: this.tabId,
            startIndex: adjustedTextStart,
            endIndex: paragraphEnd,
          },
          paragraphStyle: block.paragraphStyle,
          fields: paragraphStyleFields(block.paragraphStyle),
        },
      });
    }

    block.runs.forEach((run) => {
      const fields = styleFields(run.style);
      if (!fields || run.start >= run.end) return;

      this.requests.push({
        updateTextStyle: {
          range: {
            tabId: this.tabId,
            startIndex: adjustedTextStart + run.start,
            endIndex: adjustedTextStart + run.end,
          },
          textStyle: run.style,
          fields,
        },
      });
    });
  }

  addHeading(text: string, level: 1 | 2 | 3 = 2) {
    const styleByLevel = {
      1: 'HEADING_1',
      2: 'HEADING_2',
      3: 'HEADING_3',
    } as const;

    this.addBlock({
      text,
      runs: [],
      paragraphStyle: {
        namedStyleType: styleByLevel[level],
      },
    });
  }

  addParagraph(text: string, style?: GoogleDocsTextStyle) {
    this.addBlock({
      text,
      runs: style && styleFields(style) ? [{ start: 0, end: text.length, style }] : [],
      paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
    });
  }

  addListItem(text: string, level: number, listKind: 'bullet' | 'numbered' = 'bullet', style?: GoogleDocsTextStyle) {
    this.addBlock({
      text,
      runs: style && styleFields(style) ? [{ start: 0, end: text.length, style }] : [],
      listKind,
      listLevel: level,
    });
  }

  addSpacer() {
    this.addBlock({ text: ' ', runs: [] });
  }
}

async function docsApiFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${DOCS_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const error = await response.json();
      detail = error?.error?.message || detail;
    } catch {
      detail = await response.text();
    }
    throw new Error(detail || `Google Docs API request failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

async function createGoogleDocument(title: string, accessToken: string): Promise<GoogleDocsDocument> {
  return docsApiFetch<GoogleDocsDocument>('', accessToken, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

async function getGoogleDocument(documentId: string, accessToken: string): Promise<GoogleDocsDocument> {
  return docsApiFetch<GoogleDocsDocument>(`/${documentId}?includeTabsContent=true`, accessToken);
}

async function batchUpdateGoogleDocument(
  documentId: string,
  accessToken: string,
  requests: GoogleDocsRequest[]
): Promise<GoogleDocsBatchUpdateResponse> {
  if (requests.length === 0) return {};

  return docsApiFetch<GoogleDocsBatchUpdateResponse>(`/${documentId}:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  });
}

async function batchUpdateGoogleDocumentInChunks(
  documentId: string,
  accessToken: string,
  requests: GoogleDocsRequest[]
) {
  for (let index = 0; index < requests.length; index += REQUEST_CHUNK_SIZE) {
    await batchUpdateGoogleDocument(documentId, accessToken, requests.slice(index, index + REQUEST_CHUNK_SIZE));
  }
}

function findFirstTabId(tabs: GoogleDocsTab[] | undefined): string | null {
  if (!tabs || tabs.length === 0) return null;
  const first = tabs[0];
  return first.tabProperties?.tabId || findFirstTabId(first.childTabs);
}

function addHierarchyList(
  writer: GoogleDocsTabWriter,
  nodeId: string,
  childrenByParent: ChildrenByParent,
  labels: GoogleDocsExportLabels,
  tabByNodeId?: Record<string, string>,
  selectedNodeIds?: Set<string>,
  level = 0,
  includeSelf = true
) {
  const node = (childrenByParent.__all__ || []).find((entry) => entry.id === nodeId);
  if (!node) return;

  if (includeSelf) {
    const text = node.text.trim() || labels.untitledNode;
    const tabId = tabByNodeId && selectedNodeIds?.has(node.id) ? tabByNodeId[node.id] : undefined;
    writer.addListItem(text, level, 'bullet', tabId ? { link: { tabId } } : undefined);
  }

  (childrenByParent[node.id] || []).forEach((child) => {
    addHierarchyList(
      writer,
      child.id,
      childrenByParent,
      labels,
      tabByNodeId,
      selectedNodeIds,
      includeSelf ? level + 1 : level,
      true
    );
  });
}

function addNodeContent(
  writer: GoogleDocsTabWriter,
  node: MindMapNode,
  mapData: MapData,
  labels: GoogleDocsExportLabels,
  isPrimaryTabNode: boolean
) {
  const comments = mapData.comments[node.id] || [];
  if (!isPrimaryTabNode) {
    writer.addHeading(node.text.trim() || labels.untitledNode, 2);
  }

  if (node.link?.url) {
    writer.addParagraph(`${labels.linkTitle}: ${node.link.url}`, { link: { url: node.link.url } });
  }

  const documents = node.textDocuments || [];
  const nonEmptyDocuments = documents.filter((document) => document.title.trim() || document.content.trim());
  if (nonEmptyDocuments.length > 0) {
    writer.addHeading(labels.documentsTitle, 2);
    nonEmptyDocuments.forEach((document, index) => {
      writer.addHeading(cleanTitle(document.title, `${labels.untitledDocument} ${index + 1}`), 3);
      htmlToBlocks(document.content).forEach((block) => writer.addBlock(block));
    });
  }

  if (comments.length > 0) {
    writer.addHeading(labels.commentsTitle, 2);
    comments.forEach((comment) => {
      const author = comment.authorName ? `${comment.authorName}: ` : '';
      writer.addListItem(`${author}${comment.text}`, 0);
    });
  }

  if (hasNodeContent(node, comments)) {
    writer.addSpacer();
  }
}

function createTabContentRequests(
  mapData: MapData,
  selectedNodeIds: Set<string>,
  childrenByParent: ChildrenByParent,
  tabByNodeId: Record<string, string>,
  labels: GoogleDocsExportLabels,
  firstTabId: string
): GoogleDocsRequest[] {
  const requests: GoogleDocsRequest[] = [];
  const structureWriter = new GoogleDocsTabWriter(firstTabId, requests);

  structureWriter.addHeading(mapData.title || labels.structureTabTitle, 1);
  getRootOrderedNodes(mapData, childrenByParent).forEach((node) => {
    addHierarchyList(structureWriter, node.id, childrenByParent, labels, tabByNodeId, selectedNodeIds, 0, true);
  });

  Object.entries(tabByNodeId).forEach(([nodeId, tabId]) => {
    const node = mapData.nodes[nodeId];
    if (!node) return;

    const writer = new GoogleDocsTabWriter(tabId, requests);
    writer.addHeading(node.text.trim() || labels.untitledNode, 1);

    if ((childrenByParent[node.id] || []).length > 0) {
      writer.addHeading(labels.hierarchyTitle, 2);
      addHierarchyList(writer, node.id, childrenByParent, labels, undefined, undefined, 0, false);
      writer.addSpacer();
    }

    getAssignedContentNodes(node.id, childrenByParent, selectedNodeIds).forEach((contentNode, index) => {
      addNodeContent(writer, contentNode, mapData, labels, index === 0);
    });
  });

  return requests;
}

async function addSelectedNodeTabs(
  documentId: string,
  accessToken: string,
  mapData: MapData,
  selectedNodes: MindMapNode[],
  selectedNodeIds: Set<string>,
  tabByNodeId: Record<string, string>,
  labels: GoogleDocsExportLabels
) {
  for (const node of selectedNodes) {
    let parentTabId: string | undefined;
    let parentId = node.parentId;
    while (parentId) {
      if (selectedNodeIds.has(parentId) && tabByNodeId[parentId]) {
        parentTabId = tabByNodeId[parentId];
        break;
      }
      parentId = mapData.nodes[parentId]?.parentId ?? null;
    }

    const response = await batchUpdateGoogleDocument(documentId, accessToken, [{
      addDocumentTab: {
        tabProperties: {
          title: cleanTitle(node.text, labels.untitledNode),
          ...(parentTabId ? { parentTabId } : {}),
        },
      },
    }]);

    const reply = response.replies?.[0]?.addDocumentTab;
    const tabId = reply?.tabProperties?.tabId;
    if (!tabId) {
      throw new Error('Google Docs did not return a tab id.');
    }
    tabByNodeId[node.id] = tabId;
  }
}

export async function exportMindMapToGoogleDocs({
  mapData,
  selectedNodeIds,
  accessToken,
  labels,
}: GoogleDocsExportOptions): Promise<GoogleDocsExportResult> {
  const childrenByParent = buildChildrenByParent(mapData);
  childrenByParent.__all__ = Object.values(mapData.nodes);

  const selectedNodeIdSet = new Set(selectedNodeIds.filter((nodeId) => Boolean(mapData.nodes[nodeId])));
  const preorderNodes = getPreorderNodes(mapData, childrenByParent);
  const selectedNodes = preorderNodes.filter((node) => selectedNodeIdSet.has(node.id));

  const document = await createGoogleDocument(mapData.title || labels.structureTabTitle, accessToken);
  const documentId = document.documentId;
  let firstTabId = findFirstTabId(document.tabs);

  if (!firstTabId) {
    const hydratedDocument = await getGoogleDocument(documentId, accessToken);
    firstTabId = findFirstTabId(hydratedDocument.tabs);
  }

  if (!firstTabId) {
    throw new Error('Google Docs did not return the first tab id.');
  }

  await batchUpdateGoogleDocument(documentId, accessToken, [{
    updateDocumentTabProperties: {
      tabProperties: {
        tabId: firstTabId,
        title: labels.structureTabTitle,
      },
      fields: 'title',
    },
  }]);

  const tabByNodeId: Record<string, string> = {};
  await addSelectedNodeTabs(documentId, accessToken, mapData, selectedNodes, selectedNodeIdSet, tabByNodeId, labels);

  const contentRequests = createTabContentRequests(
    mapData,
    selectedNodeIdSet,
    childrenByParent,
    tabByNodeId,
    labels,
    firstTabId
  );
  await batchUpdateGoogleDocumentInChunks(documentId, accessToken, contentRequests);

  return {
    documentId,
    documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
    tabByNodeId,
  };
}
