// ============================================================
// UI Store — Transient interface state
// ============================================================

import { create } from 'zustand';
import type { ActivePopover, ActiveModal } from '@/lib/types';

interface DragPreviewState {
  nodeId: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

// Visual drop feedback during drag
export interface DropHintState {
  type: 'reparent' | 'reorder';
  targetNodeId: string;
  // For reorder: where the insertion line should appear (screen coords)
  insertLineRect?: { x: number; y: number; width: number } | null;
}

interface ConnectorDraftState {
  sourceNodeId: string;
  sourceHandleId: 'source-top' | 'source-right' | 'source-bottom' | 'source-left';
  startClientX: number;
  startClientY: number;
  currentClientX: number;
  currentClientY: number;
}

// Click-mode: handle selected, waiting for destination click
interface ConnectorPendingState {
  sourceNodeId: string;
  sourceHandleId: 'source-top' | 'source-right' | 'source-bottom' | 'source-left';
  startClientX: number;
  startClientY: number;
  currentClientX: number;
  currentClientY: number;
}

interface UIState {
  selectedNodeIds: string[];
  editingNodeId: string | null;
  activePopover: ActivePopover;
  activeModal: ActiveModal;
  activeTextDocumentId: string | null;
  isDragging: boolean;
  isConnectingMode: boolean;
  connectingNodeId: string | null;
  connectorDraft: ConnectorDraftState | null;
  connectorPending: ConnectorPendingState | null;
  searchQuery: string;
  searchOpen: boolean;
  dragPreview: DragPreviewState | null;
  dropHint: DropHintState | null;

  // Actions
  selectNode: (nodeId: string, multi?: boolean) => void;
  setSelectedNodes: (nodeIds: string[]) => void;
  addSelectedNodes: (nodeIds: string[]) => void;
  deselectAll: () => void;
  setEditingNode: (nodeId: string | null) => void;
  setActivePopover: (popover: ActivePopover) => void;
  setActiveModal: (modal: ActiveModal) => void;
  setActiveTextDocumentId: (documentId: string | null) => void;
  setDragging: (dragging: boolean) => void;
  setConnectingMode: (connecting: boolean, nodeId?: string | null) => void;
  startConnectorDrag: (
    sourceHandleId: ConnectorDraftState['sourceHandleId'],
    clientX: number,
    clientY: number
  ) => void;
  updateConnectorDrag: (clientX: number, clientY: number) => void;
  clearConnectorDrag: () => void;
  // Click-mode actions
  startConnectorClick: (
    sourceHandleId: ConnectorPendingState['sourceHandleId'],
    clientX: number,
    clientY: number
  ) => void;
  updateConnectorPending: (clientX: number, clientY: number) => void;
  clearConnectorPending: () => void;
  setSearchQuery: (query: string) => void;
  toggleSearch: () => void;
  setDropHint: (hint: DropHintState | null) => void;
  startNodeDragPreview: (preview: {
    nodeId: string;
    label: string;
    clientX: number;
    clientY: number;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  }) => void;
  updateNodeDragPreview: (clientX: number, clientY: number) => void;
  clearNodeDragPreview: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  selectedNodeIds: [],
  editingNodeId: null,
  activePopover: null,
  activeModal: null,
  activeTextDocumentId: null,
  isDragging: false,
  isConnectingMode: false,
  connectingNodeId: null,
  connectorDraft: null,
  connectorPending: null,
  searchQuery: '',
  searchOpen: false,
  dragPreview: null,
  dropHint: null,

  selectNode: (nodeId, multi = false) =>
    set((state) => {
      if (multi) {
        const exists = state.selectedNodeIds.includes(nodeId);
        return {
          selectedNodeIds: exists
            ? state.selectedNodeIds.filter((id) => id !== nodeId)
            : [...state.selectedNodeIds, nodeId],
          activePopover: null,
          activeTextDocumentId: null,
          isConnectingMode: false,
          connectingNodeId: null,
          connectorDraft: null,
          connectorPending: null,
        };
      }
      return {
        selectedNodeIds: [nodeId],
        editingNodeId: null,
        activePopover: null,
        activeTextDocumentId: null,
        isConnectingMode: false,
        connectingNodeId: null,
        connectorDraft: null,
        connectorPending: null,
      };
    }),

  setSelectedNodes: (nodeIds) =>
    set({
      selectedNodeIds: Array.from(new Set(nodeIds)),
      editingNodeId: null,
      activePopover: null,
      activeTextDocumentId: null,
      isConnectingMode: false,
      connectingNodeId: null,
      connectorDraft: null,
      connectorPending: null,
    }),

  addSelectedNodes: (nodeIds) =>
    set((state) => ({
      selectedNodeIds: Array.from(new Set([...state.selectedNodeIds, ...nodeIds])),
      editingNodeId: null,
      activePopover: null,
      activeTextDocumentId: null,
      isConnectingMode: false,
      connectingNodeId: null,
      connectorDraft: null,
      connectorPending: null,
    })),

  deselectAll: () =>
    set({
      selectedNodeIds: [],
      editingNodeId: null,
      activePopover: null,
      activeTextDocumentId: null,
      isConnectingMode: false,
      connectingNodeId: null,
      connectorDraft: null,
      connectorPending: null,
    }),

  setEditingNode: (nodeId) =>
    set({
      editingNodeId: nodeId,
      activePopover: null,
      activeTextDocumentId: null,
      isConnectingMode: false,
      connectingNodeId: null,
      connectorDraft: null,
      connectorPending: null,
    }),

  setActivePopover: (popover) =>
    set((state) => ({
      activePopover: popover,
      activeTextDocumentId: popover === 'note' ? state.activeTextDocumentId : null,
    })),

  setActiveModal: (modal) =>
    set({ activeModal: modal }),

  setActiveTextDocumentId: (documentId) =>
    set({ activeTextDocumentId: documentId }),

  setDragging: (dragging) =>
    set({ isDragging: dragging }),

  setConnectingMode: (connecting, nodeId = null) =>
    set({
      isConnectingMode: connecting,
      connectingNodeId: connecting ? nodeId : null,
      connectorDraft: null,
      connectorPending: null,
      activePopover: null,
      activeTextDocumentId: null,
    }),

  startConnectorDrag: (sourceHandleId, clientX, clientY) =>
    set((state) => {
      if (!state.isConnectingMode || !state.connectingNodeId) return state;

      return {
        connectorDraft: {
          sourceNodeId: state.connectingNodeId,
          sourceHandleId,
          startClientX: clientX,
          startClientY: clientY,
          currentClientX: clientX,
          currentClientY: clientY,
        },
      };
    }),

  updateConnectorDrag: (clientX, clientY) =>
    set((state) => {
      if (!state.connectorDraft) return state;

      return {
        connectorDraft: {
          ...state.connectorDraft,
          currentClientX: clientX,
          currentClientY: clientY,
        },
      };
    }),

  clearConnectorDrag: () =>
    set({
      connectorDraft: null,
    }),

  // Click-mode: user clicked a handle dot, arrow follows cursor until next click
  startConnectorClick: (sourceHandleId, clientX, clientY) =>
    set((state) => {
      if (!state.isConnectingMode || !state.connectingNodeId) return state;
      return {
        connectorPending: {
          sourceNodeId: state.connectingNodeId,
          sourceHandleId,
          startClientX: clientX,
          startClientY: clientY,
          currentClientX: clientX,
          currentClientY: clientY,
        },
      };
    }),

  updateConnectorPending: (clientX, clientY) =>
    set((state) => {
      if (!state.connectorPending) return state;
      return {
        connectorPending: {
          ...state.connectorPending,
          currentClientX: clientX,
          currentClientY: clientY,
        },
      };
    }),

  clearConnectorPending: () =>
    set({
      connectorPending: null,
    }),

  setSearchQuery: (query) =>
    set({ searchQuery: query }),

  toggleSearch: () =>
    set((state) => ({ searchOpen: !state.searchOpen, searchQuery: '' })),

  startNodeDragPreview: (preview) =>
    set({
      dragPreview: {
        nodeId: preview.nodeId,
        label: preview.label,
        x: preview.clientX - preview.offsetX,
        y: preview.clientY - preview.offsetY,
        width: preview.width,
        height: preview.height,
        offsetX: preview.offsetX,
        offsetY: preview.offsetY,
      },
      isDragging: true,
    }),

  updateNodeDragPreview: (clientX, clientY) =>
    set((state) => {
      if (!state.dragPreview) return state;
      return {
        dragPreview: {
          ...state.dragPreview,
          x: clientX - state.dragPreview.offsetX,
          y: clientY - state.dragPreview.offsetY,
        },
      };
    }),

  clearNodeDragPreview: () =>
    set({
      dragPreview: null,
      isDragging: false,
      dropHint: null,
    }),

  setDropHint: (hint) =>
    set({ dropHint: hint }),
}));
