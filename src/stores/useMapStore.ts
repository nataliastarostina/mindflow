// ============================================================
// Map Store — Primary data store for mind map nodes
// ============================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { MindMapNode, MapData, LayoutMode, CommentData, LinkRef, CustomEdge, TextDocument } from '@/lib/types';
import { generateId, computeNodeDimensions } from '@/lib/utils';
import { NODE_DEFAULTS, BRANCH_COLORS } from '@/lib/constants';
import { getDocumentDefaultTitle, messages } from '@/lib/i18n';
import { saveMyMap, saveMapBySlug } from '@/lib/api';
import { useLanguageStore } from './useLanguageStore';

interface MapState {
  mapData: MapData | null;
  // When set, persist() writes via the public-slug RPC instead of the
  // owner-scoped table. Lets the editor work for both your own maps and
  // shared `?s=<slug>` links from a single store.
  shareSlug: string | null;
  // Actions
  loadMap: (map: MapData, options?: { shareSlug?: string | null }) => void;
  setTitle: (title: string) => void;
  setLayoutMode: (mode: LayoutMode) => void;

  // Node CRUD
  addChild: (parentId: string, text?: string) => string;
  addSibling: (siblingId: string, above?: boolean, text?: string) => string;
  updateNodeText: (nodeId: string, text: string) => void;
  updateNodeStyle: (nodeId: string, updates: Partial<MindMapNode>) => void;
  updateNodeStyles: (nodeIds: string[], updates: Partial<MindMapNode>) => void;
  updateNodeDimensions: (nodeId: string, width: number, height: number) => void;
  updateNodeWidthManually: (nodeId: string, width: number) => void;
  updateNodeWidthsManually: (updates: Array<{ nodeId: string; width: number }>) => void;
  deleteNode: (nodeId: string) => void;
  deleteNodes: (nodeIds: string[]) => void;
  toggleExpand: (nodeId: string) => void;

  // Structure
  reparentNode: (nodeId: string, newParentId: string) => void;
  reorderNode: (nodeId: string, newOrderIndex: number) => void;

  // Content
  setNodeLink: (nodeId: string, link: LinkRef | null) => void;
  setNodeImage: (nodeId: string, imageUrl: string | null, displayMode?: 'icon' | 'thumbnail' | 'inline') => void;
  createTextDocument: (nodeId: string, title?: string) => string | null;
  updateTextDocument: (nodeId: string, documentId: string, updates: Partial<Pick<TextDocument, 'title' | 'content'>>) => void;
  addComment: (nodeId: string, text: string) => void;
  updateComment: (nodeId: string, commentId: string, text: string) => void;
  deleteComment: (nodeId: string, commentId: string) => void;
  addFloatingNode: (position: { x: number; y: number }, text?: string) => string;
  addFloatingNodeFromSource: (sourceNodeId: string, position: { x: number; y: number }, text?: string) => string;
  updateFloatingNodePosition: (nodeId: string, position: { x: number; y: number }) => void;

  // Custom Connectors
  addCustomEdge: (edge: Omit<CustomEdge, 'id'>) => string;
  updateCustomEdge: (edgeId: string, updates: Partial<Omit<CustomEdge, 'id'>>) => void;
  removeCustomEdge: (edgeId: string) => void;

  // Helpers
  getChildren: (parentId: string) => MindMapNode[];
  getNode: (nodeId: string) => MindMapNode | undefined;
  getRootNode: () => MindMapNode | undefined;
  getParentChain: (nodeId: string) => string[];
  getBranchColor: (nodeId: string) => string;

  // Persistence
  persist: () => void;
}

export const useMapStore = create<MapState>()(
  immer((set, get) => ({
    mapData: null,
    shareSlug: null,

    loadMap: (map, options) =>
      set((state) => {
        state.shareSlug = options?.shareSlug ?? null;
        state.mapData = {
          ...map,
          comments: map.comments || {},
          nodes: Object.fromEntries(
            Object.entries(map.nodes).map(([nodeId, node]) => {
              const textDocuments = Array.isArray(node.textDocuments)
                ? node.textDocuments
                : typeof node.note === 'string' && node.note.trim()
                ? [{
                    id: generateId(),
                    title: getDocumentDefaultTitle(1, useLanguageStore.getState().language),
                    content: node.note,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }]
                : [];

              return [
                nodeId,
                {
                  ...node,
                  textDocuments,
                },
              ];
            })
          ),
        };
      }),

    setTitle: (title) =>
      set((state) => {
        if (state.mapData) state.mapData.title = title;
      }),

    setLayoutMode: (mode) =>
      set((state) => {
        if (state.mapData) state.mapData.layoutMode = mode;
      }),

    addChild: (parentId, text) => {
      const id = generateId();
      set((state) => {
        if (!state.mapData) return;
        const parent = state.mapData.nodes[parentId];
        if (!parent) return;

        const children = Object.values(state.mapData.nodes).filter(
          (n) => n.parentId === parentId
        );
        const orderIndex = children.length;

        // Determine type
        let type: MindMapNode['type'] = 'subtopic';
        if (parent.type === 'central') type = 'primary';

        // Determine branch color
        let lineColor: string | undefined;
        if (type === 'primary') {
          lineColor = BRANCH_COLORS[orderIndex % BRANCH_COLORS.length];
        } else {
          // Inherit from parent
          lineColor = parent.lineColor || undefined;
        }

        const defaults = NODE_DEFAULTS[type];
        const nodeText = text || 'New Topic';
        const dims = computeNodeDimensions(
          nodeText,
          defaults.fontSize,
          defaults.fontWeight,
          defaults.width
        );

        const newNode: MindMapNode = {
          id,
          mapId: state.mapData.id,
          parentId,
          orderIndex,
          type,
          text: nodeText,
          textDocuments: [],
          commentCount: 0,
          attachmentIds: [],
          shape: defaults.shape,
          fillColor: defaults.fillColor,
          textColor: defaults.textColor,
          fontSize: defaults.fontSize,
          fontWeight: defaults.fontWeight,
          lineColor: lineColor || null,
          expanded: true,
          width: dims.width,
          height: dims.height,
        };

        state.mapData.nodes[id] = newNode;
      });
      return id;
    },

    addSibling: (siblingId, above = false, text) => {
      const id = generateId();
      set((state) => {
        if (!state.mapData) return;
        const sibling = state.mapData.nodes[siblingId];
        if (!sibling || !sibling.parentId) return;

        const parent = state.mapData.nodes[sibling.parentId];
        if (!parent) return;

        const siblings = Object.values(state.mapData.nodes)
          .filter((n) => n.parentId === sibling.parentId)
          .sort((a, b) => a.orderIndex - b.orderIndex);

        const insertIndex = above ? sibling.orderIndex : sibling.orderIndex + 1;

        // Shift order indices
        siblings.forEach((s) => {
          if (s.orderIndex >= insertIndex) {
            state.mapData!.nodes[s.id].orderIndex++;
          }
        });

        const defaults = NODE_DEFAULTS[sibling.type];
        const nodeText = text || 'New Topic';
        const dims = computeNodeDimensions(
          nodeText,
          defaults.fontSize,
          defaults.fontWeight,
          defaults.width
        );

        // Determine line color:
        // For primary nodes, each gets a UNIQUE color from the palette
        // For subtopics, inherit from parent branch
        let lineColor: string | null = null;
        if (sibling.type === 'primary') {
          // Count existing primary siblings to pick next unique color
          const existingPrimaryCount = siblings.length; // includes current, before shift
          lineColor = BRANCH_COLORS[existingPrimaryCount % BRANCH_COLORS.length];
        } else {
          lineColor = sibling.lineColor || null;
        }

        const newNode: MindMapNode = {
          id,
          mapId: state.mapData.id,
          parentId: sibling.parentId,
          orderIndex: insertIndex,
          type: sibling.type,
          text: nodeText,
          textDocuments: [],
          commentCount: 0,
          attachmentIds: [],
          shape: defaults.shape,
          fillColor: defaults.fillColor,
          textColor: defaults.textColor,
          fontSize: defaults.fontSize,
          fontWeight: defaults.fontWeight,
          lineColor,
          expanded: true,
          width: dims.width,
          height: dims.height,
        };

        state.mapData.nodes[id] = newNode;
      });
      return id;
    },

    updateNodeText: (nodeId, text) =>
      set((state) => {
        if (!state.mapData) return;
        const node = state.mapData.nodes[nodeId];
        if (!node) return;
        node.text = text;
        const defaults = NODE_DEFAULTS[node.type];
        const dims = computeNodeDimensions(
          text,
          node.fontSize || defaults.fontSize,
          node.fontWeight || defaults.fontWeight,
          node.manualWidth || defaults.width
        );
        if (!node.manualWidth) {
          node.width = dims.width;
        }
        node.height = dims.height;
      }),

    updateNodeStyle: (nodeId, updates) =>
      set((state) => {
        if (!state.mapData) return;
        const node = state.mapData.nodes[nodeId];
        if (node) {
          Object.assign(node, updates);
          state.mapData.updatedAt = new Date().toISOString();
        }
      }),

    updateNodeStyles: (nodeIds, updates) =>
      set((state) => {
        if (!state.mapData || nodeIds.length === 0) return;

        let hasChanges = false;

        nodeIds.forEach((nodeId) => {
          const node = state.mapData?.nodes[nodeId];
          if (!node) return;
          Object.assign(node, updates);
          hasChanges = true;
        });

        if (hasChanges) {
          state.mapData.updatedAt = new Date().toISOString();
        }
      }),

    updateNodeDimensions: (nodeId, width, height) =>
      set((state) => {
        if (!state.mapData) return;
        const node = state.mapData.nodes[nodeId];
        const w = Math.round(width);
        const h = Math.round(height);
        if (node && (Math.round(node.width || 0) !== w || Math.round(node.height || 0) !== h)) {
          // If the width was physically resized, and there is no manualWidth, we update it.
          // But actually we shouldn't overwrite if manualWidth is set unless it matches. 
          // NodeResizer uses updateNodeWidthManually, so we just let this handle height height auto-measuring.
          if (!node.manualWidth) {
            node.width = w;
          }
          node.height = h;
          state.mapData.updatedAt = new Date().toISOString();
        }
      }),

    updateNodeWidthManually: (nodeId, width) =>
      set((state) => {
        if (!state.mapData) return;
        const node = state.mapData.nodes[nodeId];
        if (node) {
          const w = Math.round(width);
          node.manualWidth = w;
          node.width = w;
          state.mapData.updatedAt = new Date().toISOString();
        }
      }),

    updateNodeWidthsManually: (updates) =>
      set((state) => {
        if (!state.mapData || updates.length === 0) return;

        let hasChanges = false;

        updates.forEach(({ nodeId, width }) => {
          const node = state.mapData?.nodes[nodeId];
          if (!node) return;

          const w = Math.round(width);
          if (node.manualWidth === w && node.width === w) return;

          node.manualWidth = w;
          node.width = w;
          hasChanges = true;
        });

        if (hasChanges) {
          state.mapData.updatedAt = new Date().toISOString();
        }
      }),

    deleteNode: (nodeId) =>
      set((state) => {
        if (!state.mapData) return;
        const node = state.mapData.nodes[nodeId];
        if (!node || node.type === 'central') return;

        // Collect all descendants
        const toDelete = new Set<string>();
        const collectDescendants = (id: string) => {
          toDelete.add(id);
          Object.values(state.mapData!.nodes)
            .filter((n) => n.parentId === id)
            .forEach((child) => collectDescendants(child.id));
        };
        collectDescendants(nodeId);

        // Delete all
        toDelete.forEach((id) => {
          delete state.mapData!.nodes[id];
          delete state.mapData!.comments[id];
        });

        if (state.mapData.customEdges) {
          state.mapData.customEdges = state.mapData.customEdges.filter(
            (edge) => !toDelete.has(edge.source) && !toDelete.has(edge.target)
          );
        }

        // Reorder siblings
        if (node.parentId) {
          const siblings = Object.values(state.mapData.nodes)
            .filter((n) => n.parentId === node.parentId)
            .sort((a, b) => a.orderIndex - b.orderIndex);
          siblings.forEach((s, i) => {
            state.mapData!.nodes[s.id].orderIndex = i;
          });
        }

        state.mapData.updatedAt = new Date().toISOString();
      }),

    deleteNodes: (nodeIds) =>
      set((state) => {
        if (!state.mapData || nodeIds.length === 0) return;

        const uniqueNodeIds = Array.from(new Set(nodeIds));
        const toDelete = new Set<string>();
        const affectedParentIds = new Set<string>();

        const collectDescendants = (id: string) => {
          const currentNode = state.mapData?.nodes[id];
          if (!currentNode || currentNode.type === 'central' || toDelete.has(id)) return;

          toDelete.add(id);

          if (currentNode.parentId && !toDelete.has(currentNode.parentId)) {
            affectedParentIds.add(currentNode.parentId);
          }

          Object.values(state.mapData!.nodes)
            .filter((node) => node.parentId === id)
            .forEach((child) => collectDescendants(child.id));
        };

        uniqueNodeIds.forEach((id) => collectDescendants(id));
        if (toDelete.size === 0) return;

        toDelete.forEach((id) => {
          delete state.mapData!.nodes[id];
          delete state.mapData!.comments[id];
        });

        if (state.mapData.customEdges) {
          state.mapData.customEdges = state.mapData.customEdges.filter(
            (edge) => !toDelete.has(edge.source) && !toDelete.has(edge.target)
          );
        }

        affectedParentIds.forEach((parentId) => {
          const parent = state.mapData?.nodes[parentId];
          if (!parent) return;

          const siblings = Object.values(state.mapData!.nodes)
            .filter((node) => node.parentId === parentId)
            .sort((a, b) => a.orderIndex - b.orderIndex);

          siblings.forEach((sibling, index) => {
            state.mapData!.nodes[sibling.id].orderIndex = index;
          });
        });

        state.mapData.updatedAt = new Date().toISOString();
      }),

    toggleExpand: (nodeId) =>
      set((state) => {
        if (!state.mapData) return;
        const node = state.mapData.nodes[nodeId];
        if (node) node.expanded = !node.expanded;
      }),

    reparentNode: (nodeId, newParentId) =>
      set((state) => {
        if (!state.mapData) return;
        const node = state.mapData.nodes[nodeId];
        if (!node || node.type === 'central' || nodeId === newParentId) return;

        // Prevent moving parent into its own descendant
        const chain = get().getParentChain(newParentId);
        if (chain.includes(nodeId)) return;

        const oldParentId = node.parentId;
        if (oldParentId === newParentId) return;

        // Update parent
        node.parentId = newParentId;

        // New type based on new parent
        const newParent = state.mapData.nodes[newParentId];
        if (newParent?.type === 'central') {
          node.type = 'primary';
        } else {
          node.type = 'subtopic';
        }

        // Reorder at new location
        const newSiblings = Object.values(state.mapData.nodes)
          .filter((n) => n.parentId === newParentId && n.id !== nodeId)
          .sort((a, b) => a.orderIndex - b.orderIndex);
        node.orderIndex = newSiblings.length;

        // Reorder old location
        if (oldParentId) {
          const oldSiblings = Object.values(state.mapData.nodes)
            .filter((n) => n.parentId === oldParentId && n.id !== nodeId)
            .sort((a, b) => a.orderIndex - b.orderIndex);
          oldSiblings.forEach((s, i) => {
            state.mapData!.nodes[s.id].orderIndex = i;
          });
        }
        
        state.mapData.updatedAt = new Date().toISOString();
      }),

    reorderNode: (nodeId, newOrderIndex) =>
      set((state) => {
        if (!state.mapData) return;
        const node = state.mapData.nodes[nodeId];
        if (!node || !node.parentId) return;

        const siblings = Object.values(state.mapData.nodes)
          .filter((n) => n.parentId === node.parentId)
          .sort((a, b) => a.orderIndex - b.orderIndex);

        const oldIndex = node.orderIndex;
        if (oldIndex === newOrderIndex) return;

        siblings.forEach((s) => {
          if (s.id === nodeId) {
            state.mapData!.nodes[s.id].orderIndex = newOrderIndex;
          } else if (oldIndex < newOrderIndex) {
            if (s.orderIndex > oldIndex && s.orderIndex <= newOrderIndex) {
              state.mapData!.nodes[s.id].orderIndex--;
            }
          } else {
            if (s.orderIndex >= newOrderIndex && s.orderIndex < oldIndex) {
              state.mapData!.nodes[s.id].orderIndex++;
            }
          }
        });
      }),

    setNodeLink: (nodeId, link) =>
      set((state) => {
        if (!state.mapData) return;
        const node = state.mapData.nodes[nodeId];
        if (node) node.link = link;
      }),

    setNodeImage: (nodeId, imageUrl, displayMode = 'thumbnail') =>
      set((state) => {
        if (!state.mapData) return;
        const node = state.mapData.nodes[nodeId];
        if (node) {
          node.imageUrl = imageUrl;
          node.imageDisplayMode = displayMode;
        }
      }),

    createTextDocument: (nodeId, title) => {
      const documentId = generateId();
      set((state) => {
        if (!state.mapData) return;
        const node = state.mapData.nodes[nodeId];
        if (!node) return;
        const language = useLanguageStore.getState().language;

        if (!Array.isArray(node.textDocuments)) {
          node.textDocuments = [];
        }

        const now = new Date().toISOString();
        node.textDocuments.push({
          id: documentId,
          title: title?.trim() || getDocumentDefaultTitle(node.textDocuments.length + 1, language),
          content: '',
          createdAt: now,
          updatedAt: now,
        });
        state.mapData.updatedAt = now;
      });
      return get().mapData?.nodes[nodeId]?.textDocuments?.some((document) => document.id === documentId)
        ? documentId
        : null;
    },

    updateTextDocument: (nodeId, documentId, updates) =>
      set((state) => {
        if (!state.mapData) return;
        const node = state.mapData.nodes[nodeId];
        const document = node?.textDocuments?.find((item) => item.id === documentId);
        if (!document) return;
        const language = useLanguageStore.getState().language;

        if (typeof updates.title === 'string') {
          document.title = updates.title.trim() || messages[language].common.untitledDocument;
        }
        if (typeof updates.content === 'string') {
          document.content = updates.content;
        }
        document.updatedAt = new Date().toISOString();
        state.mapData.updatedAt = document.updatedAt;
      }),

    addComment: (nodeId, text) =>
      set((state) => {
        if (!state.mapData) return;
        const node = state.mapData.nodes[nodeId];
        if (!node) return;
        const language = useLanguageStore.getState().language;

        const comment: CommentData = {
          id: generateId(),
          nodeId,
          text,
          authorName: messages[language].common.you,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (!state.mapData.comments[nodeId]) {
          state.mapData.comments[nodeId] = [];
        }
        state.mapData.comments[nodeId].push(comment);
        node.commentCount++;
      }),

    updateComment: (nodeId, commentId, text) =>
      set((state) => {
        if (!state.mapData) return;

        const comment = (state.mapData.comments[nodeId] || []).find((entry) => entry.id === commentId);
        if (!comment) return;

        comment.text = text;
        comment.updatedAt = new Date().toISOString();
        state.mapData.updatedAt = comment.updatedAt;
      }),

    deleteComment: (nodeId, commentId) =>
      set((state) => {
        if (!state.mapData) return;
        state.mapData.comments[nodeId] = (state.mapData.comments[nodeId] || []).filter(c => c.id !== commentId);
        
        // Update count
        const node = state.mapData.nodes[nodeId];
        if (node) node.commentCount = state.mapData.comments[nodeId].length;
        
        state.mapData.updatedAt = new Date().toISOString();
      }),

    addFloatingNode: (position, text) => {
      const id = generateId();
      set((state) => {
        if (!state.mapData) return;
        const language = useLanguageStore.getState().language;
        const nextText = text ?? messages[language].common.defaultFloatingNote;

        const defaults = NODE_DEFAULTS.floating;
        const dims = computeNodeDimensions(
          nextText,
          defaults.fontSize,
          defaults.fontWeight,
          defaults.width
        );

        state.mapData.nodes[id] = {
          id,
          mapId: state.mapData.id,
          parentId: null,
          orderIndex: Object.values(state.mapData.nodes).filter((n) => n.type === 'floating').length,
          type: 'floating',
          text: nextText,
          textDocuments: [],
          commentCount: 0,
          attachmentIds: [],
          shape: defaults.shape,
          fillColor: defaults.fillColor,
          textColor: defaults.textColor,
          fontSize: defaults.fontSize,
          fontWeight: defaults.fontWeight,
          expanded: true,
          width: dims.width,
          height: dims.height,
          manualPosition: position,
        };

        state.mapData.updatedAt = new Date().toISOString();
      });
      return id;
    },

    addFloatingNodeFromSource: (sourceNodeId, position, text) => {
      const id = generateId();
      set((state) => {
        if (!state.mapData) return;
        const language = useLanguageStore.getState().language;
        const nextText = text ?? messages[language].common.defaultNewTopic;

        const sourceNode = state.mapData.nodes[sourceNodeId];
        if (!sourceNode) return;

        const defaults = NODE_DEFAULTS[
          sourceNode.type === 'floating'
            ? 'floating'
            : sourceNode.type === 'central'
            ? 'central'
            : sourceNode.type
        ];
        const widthBasis = sourceNode.manualWidth || sourceNode.width || defaults.width;
        const fontSize = sourceNode.fontSize || defaults.fontSize;
        const fontWeight = sourceNode.fontWeight || defaults.fontWeight;
        const dims = computeNodeDimensions(nextText, fontSize, fontWeight, widthBasis);

        state.mapData.nodes[id] = {
          id,
          mapId: state.mapData.id,
          parentId: null,
          orderIndex: Object.values(state.mapData.nodes).filter((n) => n.type === 'floating').length,
          type: 'floating',
          text: nextText,
          textDocuments: [],
          commentCount: 0,
          attachmentIds: [],
          shape: sourceNode.shape,
          fillColor: sourceNode.fillColor ?? defaults.fillColor,
          borderColor: sourceNode.borderColor ?? null,
          borderWidth: sourceNode.borderWidth,
          borderStyle: sourceNode.borderStyle,
          lineColor: sourceNode.lineColor ?? null,
          lineWidth: sourceNode.lineWidth,
          lineStyle: sourceNode.lineStyle,
          fontFamily: sourceNode.fontFamily ?? null,
          fontSize,
          fontWeight,
          fontStyle: sourceNode.fontStyle,
          textDecoration: sourceNode.textDecoration,
          textAlign: sourceNode.textAlign,
          textColor: sourceNode.textColor ?? defaults.textColor,
          expanded: true,
          width: sourceNode.manualWidth ? widthBasis : dims.width,
          height: dims.height,
          manualWidth: sourceNode.manualWidth,
          manualPosition: position,
        };

        state.mapData.updatedAt = new Date().toISOString();
      });
      return id;
    },

    // Custom Edges
    updateFloatingNodePosition: (nodeId, position) =>
      set((state) => {
        if (!state.mapData) return;
        const node = state.mapData.nodes[nodeId];
        if (!node) return;
        node.manualPosition = position;
        state.mapData.updatedAt = new Date().toISOString();
      }),

    addCustomEdge: (edge) => {
      const id = `custom-edge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      set((state) => {
        if (!state.mapData) return;
        if (!state.mapData.customEdges) state.mapData.customEdges = [];
        state.mapData.customEdges.push({ id, ...edge });
        state.mapData.updatedAt = new Date().toISOString();
      });
      return id;
    },

    updateCustomEdge: (edgeId, updates) =>
      set((state) => {
        if (!state.mapData?.customEdges) return;
        const edge = state.mapData.customEdges.find((item) => item.id === edgeId);
        if (!edge) return;
        Object.assign(edge, updates);
        state.mapData.updatedAt = new Date().toISOString();
      }),

    removeCustomEdge: (edgeId) =>
      set((state) => {
        if (!state.mapData || !state.mapData.customEdges) return;
        state.mapData.customEdges = state.mapData.customEdges.filter(e => e.id !== edgeId);
        state.mapData.updatedAt = new Date().toISOString();
      }),

    // ==========================================
    // Helpers
    getChildren: (parentId) => {
      const { mapData } = get();
      if (!mapData) return [];
      return Object.values(mapData.nodes)
        .filter((n) => n.parentId === parentId)
        .sort((a, b) => a.orderIndex - b.orderIndex);
    },

    getNode: (nodeId) => {
      const { mapData } = get();
      return mapData?.nodes[nodeId];
    },

    getRootNode: () => {
      const { mapData } = get();
      if (!mapData) return undefined;
      return mapData.nodes[mapData.rootNodeId];
    },

    getParentChain: (nodeId) => {
      const { mapData } = get();
      if (!mapData) return [];
      const chain: string[] = [];
      let current = mapData.nodes[nodeId];
      while (current) {
        chain.push(current.id);
        if (current.parentId) {
          current = mapData.nodes[current.parentId];
        } else {
          break;
        }
      }
      return chain;
    },

    getBranchColor: (nodeId) => {
      const { mapData } = get();
      if (!mapData) return BRANCH_COLORS[0];
      const node = mapData.nodes[nodeId];
      if (!node) return BRANCH_COLORS[0];

      if (node.lineColor) return node.lineColor;

      // Walk up to find branch color
      let current = node;
      while (current.parentId) {
        current = mapData.nodes[current.parentId];
        if (!current) break;
        if (current.lineColor) return current.lineColor;
      }

      return BRANCH_COLORS[0];
    },

    persist: () => {
      const { mapData, shareSlug } = get();
      if (!mapData) return;
      if (shareSlug) {
        // Public collaboration via short link — anyone with the slug can save.
        void saveMapBySlug(shareSlug, mapData);
      } else {
        // Owner-scoped save. RLS rejects this for unauthenticated callers,
        // which is fine — the editor never opens an owned map without a session.
        void saveMyMap(mapData);
      }
    },
  }))
);
