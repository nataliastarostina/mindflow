'use client';
// ============================================================
// Canvas — React Flow wrapper with mind map configuration
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnReconnect,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import MindMapNodeComponent from '@/components/nodes/MindMapNode';
import BranchEdge from '@/components/edges/BranchEdge';
import CustomConnectorEdge from '@/components/edges/CustomConnectorEdge';
import { useMapStore } from '@/stores/useMapStore';
import { useUIStore } from '@/stores/useUIStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { computeLayout } from '@/engine/layoutEngine';
import { VIEWPORT_DEFAULTS } from '@/lib/constants';
import type { CommentData, TextDocument } from '@/lib/types';
import ContextualToolbar from './ContextualToolbar';
import EdgeToolbar from './EdgeToolbar';
import { useI18n } from '@/stores/useLanguageStore';

interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScreenRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

type DropHintOverlay =
  | {
      type: 'reparent';
      left: number;
      top: number;
      width: number;
      height: number;
    }
  | {
      type: 'reorder';
      left: number;
      top: number;
      width: number;
    };

const nodeTypes = {
  mindmap: MindMapNodeComponent,
};

const edgeTypes = {
  branch: BranchEdge,
  'custom-connector': CustomConnectorEdge,
};

function getOppositeTargetHandle(handleId?: string | null): string | null {
  switch (handleId) {
    case 'source-top':
      return 'target-bottom';
    case 'source-bottom':
      return 'target-top';
    case 'source-left':
      return 'target-right';
    case 'source-right':
      return 'target-left';
    default:
      return 'target-left';
  }
}

function createScreenRect(startX: number, startY: number, endX: number, endY: number): ScreenRect {
  return {
    left: Math.min(startX, endX),
    top: Math.min(startY, endY),
    right: Math.max(startX, endX),
    bottom: Math.max(startY, endY),
  };
}

function toMarqueeRect(containerRect: DOMRect, screenRect: ScreenRect): MarqueeRect {
  return {
    x: screenRect.left - containerRect.left,
    y: screenRect.top - containerRect.top,
    width: screenRect.right - screenRect.left,
    height: screenRect.bottom - containerRect.top,
  };
}

function intersectsScreenRect(a: ScreenRect, b: ScreenRect): boolean {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

function getTargetHandleFromPoint(nodeElement: HTMLElement, clientX: number, clientY: number): string {
  const rect = nodeElement.getBoundingClientRect();
  const distances = [
    { handleId: 'target-top', distance: Math.abs(clientY - rect.top) },
    { handleId: 'target-right', distance: Math.abs(clientX - rect.right) },
    { handleId: 'target-bottom', distance: Math.abs(clientY - rect.bottom) },
    { handleId: 'target-left', distance: Math.abs(clientX - rect.left) },
  ];

  distances.sort((a, b) => a.distance - b.distance);
  return distances[0]?.handleId || 'target-left';
}

export default function Canvas() {
  const { t } = useI18n();
  const {
    mapData,
    getBranchColor,
    addChild,
    addSibling,
    deleteNode,
    deleteNodes,
    toggleExpand,
    updateNodeDimensions,
    addCustomEdge,
    updateCustomEdge,
    removeCustomEdge,
    addFloatingNodeFromSource,
  } = useMapStore();
  const {
    selectedNodeIds,
    selectNode,
    setSelectedNodes,
    deselectAll,
    editingNodeId,
    setEditingNode,
    isConnectingMode,
    connectorDraft,
    connectorPending,
    setConnectingMode,
    updateConnectorDrag,
    clearConnectorDrag,
    updateConnectorPending,
    clearConnectorPending,
    dragPreview,
    dropHint,
  } = useUIStore();
  const { pushState } = useHistoryStore();
  const { fitView, screenToFlowPosition } = useReactFlow();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autoFitMapIdRef = useRef<string | null>(null);
  const marqueeTimerRef = useRef<number | null>(null);
  const marqueePointerStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    additive: boolean;
    baseSelectedIds: string[];
  } | null>(null);
  const marqueeActiveRef = useRef(false);
  const suppressNextPaneClickRef = useRef(false);
  const marqueeMoveHandlerRef = useRef<(event: PointerEvent) => void>(() => {});
  const marqueeUpHandlerRef = useRef<(event: PointerEvent) => void>(() => {});
  const [selectedCustomEdgeId, setSelectedCustomEdgeId] = useState<string | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const [dropHintOverlay, setDropHintOverlay] = useState<DropHintOverlay | null>(null);

  const clearMarqueeTimer = useCallback(() => {
    if (marqueeTimerRef.current) {
      window.clearTimeout(marqueeTimerRef.current);
      marqueeTimerRef.current = null;
    }
  }, []);

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!mapData) return { flowNodes: [], flowEdges: [] };

    const layout = computeLayout(mapData.nodes, mapData.rootNodeId, mapData.layoutMode);
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    Object.values(mapData.nodes).forEach((node) => {
      const pos = layout.positions[node.id] || (node.manualPosition
        ? {
            id: node.id,
            x: node.manualPosition.x,
            y: node.manualPosition.y,
            width: node.width || 140,
            height: node.height || 42,
          }
        : null);
      if (!pos) return;

      const children = Object.values(mapData.nodes).filter((n) => n.parentId === node.id);
      const hasChildren = children.length > 0;
      const isLeftSide = mapData.layoutMode === 'radial' && pos.x < 0;

      nodes.push({
        id: node.id,
        type: 'mindmap',
        position: { x: pos.x, y: pos.y },
        data: {
          label: node.text,
          nodeType: node.type,
          shape: node.shape,
          fillColor: node.fillColor,
          borderColor: node.borderColor,
          borderWidth: node.borderWidth,
          borderStyle: node.borderStyle,
          textColor: node.textColor,
          fontSize: node.fontSize,
          fontWeight: node.fontWeight,
          fontStyle: node.fontStyle,
          textDecoration: node.textDecoration,
          textAlign: node.textAlign,
          lineColor: node.lineColor,
          hasLink: !!node.link,
          link: node.link ?? null,
          hasImage: !!node.imageUrl,
          hasNote: (node.textDocuments?.length || 0) > 0 || !!node.note,
          textDocuments: (node.textDocuments || []) as TextDocument[],
          commentCount: node.commentCount,
          comments: (mapData.comments[node.id] || []) as CommentData[],
          hasChildren,
          expanded: node.expanded,
          mindmapNodeId: node.id,
          layoutMode: mapData.layoutMode,
          isLeftSide,
        },
        selected: selectedNodeIds.includes(node.id),
        draggable: false,
        width: node.manualWidth ? node.manualWidth : (editingNodeId === node.id ? undefined : pos.width),
        height: editingNodeId === node.id ? undefined : pos.height,
      });

      if (node.parentId && mapData.nodes[node.parentId]) {
        const branchColor = getBranchColor(node.id);
        let depth = 0;
        let current = node;

        while (current.parentId) {
          depth++;
          current = mapData.nodes[current.parentId] || current;
          if (!current.parentId) break;
        }

        let sourceHandle: string | null = null;
        let targetHandle: string | null = null;

        if (mapData.layoutMode === 'top-down') {
          sourceHandle = 'source-bottom';
          targetHandle = 'target-top';
        } else if (mapData.layoutMode === 'radial') {
          const parentNode = mapData.nodes[node.parentId];
          if (parentNode?.type === 'central') {
            sourceHandle = isLeftSide ? 'source-left' : 'source-right';
          } else {
            const parentPos = layout.positions[node.parentId];
            const parentIsLeft = parentPos ? parentPos.x < 0 : false;
            sourceHandle = parentIsLeft ? 'source-left' : 'source-right';
          }
          targetHandle = isLeftSide ? 'target-right' : 'target-left';
        } else {
          sourceHandle = 'source-right';
          targetHandle = 'target-left';
        }

        edges.push({
          id: `e-${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          type: 'branch',
          sourceHandle,
          targetHandle,
          selectable: false,
          data: {
            color: branchColor,
            depth,
            lineStyle: node.lineStyle || 'solid',
            lineWidth: node.lineWidth,
            layoutMode: mapData.layoutMode,
          },
        });
      }
    });

    mapData.customEdges?.forEach((edge) => {
      const strokeColor = edge.strokeColor || '#0F172A';
      const markerSize = { width: 18, height: 18 };

      const markerEnd = (() => {
        if (!edge.endMarker || edge.endMarker === 'arrow') {
          return { type: MarkerType.ArrowClosed, color: strokeColor, ...markerSize };
        }
        if (edge.endMarker === 'open-arrow') {
          return { type: MarkerType.Arrow, color: strokeColor, ...markerSize };
        }
        return undefined;
      })();

      const markerStart = (() => {
        if (edge.startMarker === 'arrow') {
          return { type: MarkerType.ArrowClosed, color: strokeColor, ...markerSize };
        }
        if (edge.startMarker === 'open-arrow') {
          return { type: MarkerType.Arrow, color: strokeColor, ...markerSize };
        }
        return undefined;
      })();

      edges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
        type: 'custom-connector',
        selected: selectedCustomEdgeId === edge.id,
        reconnectable: true,
        markerEnd,
        markerStart,
        data: {
          edgeKind: 'custom',
          strokeColor: edge.strokeColor,
          strokeWidth: edge.strokeWidth,
          strokeStyle: edge.strokeStyle,
          endMarker: edge.endMarker,
          startMarker: edge.startMarker,
          pathType: edge.pathType,
        },
      });
    });

    return { flowNodes: nodes, flowEdges: edges };
  }, [editingNodeId, mapData, selectedNodeIds, selectedCustomEdgeId, getBranchColor]);

  useEffect(() => {
    const mapId = mapData?.id;
    if (!mapId || flowNodes.length === 0) return;
    if (autoFitMapIdRef.current === mapId) return;

    autoFitMapIdRef.current = mapId;
    const timeoutId = window.setTimeout(() => {
      fitView({ padding: 0.3, duration: 300 });
    }, 100);
    return () => window.clearTimeout(timeoutId);
  }, [fitView, flowNodes.length, mapData?.id]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      let didSelectionChange = false;
      const nextSelectedIds = new Set(selectedNodeIds);

      changes.forEach((change) => {
        if (change.type === 'select') {
          didSelectionChange = true;

          if (change.selected) {
            nextSelectedIds.add(change.id);
            setSelectedCustomEdgeId(null);
          } else {
            nextSelectedIds.delete(change.id);
          }
        } else if (change.type === 'dimensions' && change.dimensions) {
          updateNodeDimensions(change.id, change.dimensions.width, change.dimensions.height);
        }
      });

      if (didSelectionChange) {
        setSelectedNodes([...nextSelectedIds]);
      }
    },
    [selectedNodeIds, setSelectedNodes, updateNodeDimensions]
  );

  const onEdgesChange: OnEdgesChange = useCallback(() => {}, []);

  const finishConnectorDrag = useCallback((clientX: number, clientY: number) => {
    if (!mapData || !connectorDraft) {
      clearConnectorDrag();
      setConnectingMode(false);
      return;
    }

    const targetNodeElement = document
      .elementsFromPoint(clientX, clientY)
      .find((element) => {
        if (!(element instanceof HTMLElement)) return false;
        if (!element.classList.contains('react-flow__node')) return false;
        return element.dataset.id !== connectorDraft.sourceNodeId;
      });

    if (!(targetNodeElement instanceof HTMLElement)) {
      pushState(mapData);
      const newNodeId = addFloatingNodeFromSource(
        connectorDraft.sourceNodeId,
        screenToFlowPosition({ x: clientX, y: clientY }),
        t.common.defaultNewTopic
      );
      const edgeId = addCustomEdge({
        source: connectorDraft.sourceNodeId,
        target: newNodeId,
        sourceHandle: connectorDraft.sourceHandleId,
        targetHandle: getOppositeTargetHandle(connectorDraft.sourceHandleId),
      });

      setSelectedCustomEdgeId(edgeId);
      clearConnectorDrag();
      setConnectingMode(false);
      selectNode(newNodeId);
      window.setTimeout(() => setEditingNode(newNodeId), 0);
      return;
    }

    const targetNodeId = targetNodeElement.dataset.id;
    if (!targetNodeId || targetNodeId === connectorDraft.sourceNodeId) {
      clearConnectorDrag();
      setConnectingMode(false);
      return;
    }

    pushState(mapData);
    const edgeId = addCustomEdge({
      source: connectorDraft.sourceNodeId,
      target: targetNodeId,
      sourceHandle: connectorDraft.sourceHandleId,
      targetHandle: getTargetHandleFromPoint(targetNodeElement, clientX, clientY),
    });

    setSelectedCustomEdgeId(edgeId);
    clearConnectorDrag();
    setConnectingMode(false);
  }, [
    addCustomEdge,
    addFloatingNodeFromSource,
    clearConnectorDrag,
    connectorDraft,
    mapData,
    pushState,
    screenToFlowPosition,
    selectNode,
    setConnectingMode,
    setEditingNode,
    t.common.defaultNewTopic,
  ]);

  // Click-mode finish: called when user clicks destination (pane or existing node)
  const finishConnectorPending = useCallback((clientX: number, clientY: number) => {
    if (!mapData || !connectorPending) {
      clearConnectorPending();
      setConnectingMode(false);
      return;
    }

    const targetNodeElement = document
      .elementsFromPoint(clientX, clientY)
      .find((element) => {
        if (!(element instanceof HTMLElement)) return false;
        if (!element.classList.contains('react-flow__node')) return false;
        return element.dataset.id !== connectorPending.sourceNodeId;
      });

    if (!(targetNodeElement instanceof HTMLElement)) {
      // Clicked on empty canvas — create new floating node, NO auto-edit
      pushState(mapData);
      const newNodeId = addFloatingNodeFromSource(
        connectorPending.sourceNodeId,
        screenToFlowPosition({ x: clientX, y: clientY }),
        t.common.defaultNewTopic
      );
      const edgeId = addCustomEdge({
        source: connectorPending.sourceNodeId,
        target: newNodeId,
        sourceHandle: connectorPending.sourceHandleId,
        targetHandle: getOppositeTargetHandle(connectorPending.sourceHandleId),
      });

      setSelectedCustomEdgeId(edgeId);
      clearConnectorPending();
      setConnectingMode(false);
      selectNode(newNodeId);
      // No setEditingNode call — user can double-click to edit later
      return;
    }

    const targetNodeId = targetNodeElement.dataset.id;
    if (!targetNodeId || targetNodeId === connectorPending.sourceNodeId) {
      clearConnectorPending();
      setConnectingMode(false);
      return;
    }

    // Clicked on existing node — just connect, no edit
    pushState(mapData);
    const edgeId = addCustomEdge({
      source: connectorPending.sourceNodeId,
      target: targetNodeId,
      sourceHandle: connectorPending.sourceHandleId,
      targetHandle: getTargetHandleFromPoint(targetNodeElement, clientX, clientY),
    });

    setSelectedCustomEdgeId(edgeId);
    clearConnectorPending();
    setConnectingMode(false);
  }, [
    addCustomEdge,
    addFloatingNodeFromSource,
    clearConnectorPending,
    connectorPending,
    mapData,
    pushState,
    screenToFlowPosition,
    selectNode,
    setConnectingMode,
    t.common.defaultNewTopic,
  ]);

  const onReconnect: OnReconnect = useCallback(
    (oldEdge, newConnection) => {
      if (!oldEdge.id.startsWith('custom-edge-')) return;
      if (!newConnection.source || !newConnection.target) return;

      updateCustomEdge(oldEdge.id, {
        source: newConnection.source,
        target: newConnection.target,
        sourceHandle: newConnection.sourceHandle ?? null,
        targetHandle: newConnection.targetHandle ?? null,
      });
      setSelectedCustomEdgeId(oldEdge.id);
    },
    [updateCustomEdge]
  );

  const updateMarqueeSelection = useCallback(
    (screenRect: ScreenRect, baseSelectedIds: string[], additive: boolean) => {
      const container = containerRef.current;
      if (!container) return;

      const hitNodeIds = Array.from(container.querySelectorAll<HTMLElement>('.react-flow__node[data-id]'))
        .filter((nodeElement) => {
          const rect = nodeElement.getBoundingClientRect();
          return intersectsScreenRect(screenRect, {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
          });
        })
        .map((nodeElement) => nodeElement.dataset.id)
        .filter((nodeId): nodeId is string => Boolean(nodeId));

      const nextSelectedIds = additive
        ? Array.from(new Set([...baseSelectedIds, ...hitNodeIds]))
        : hitNodeIds;

      setSelectedCustomEdgeId(null);
      setSelectedNodes(nextSelectedIds);
    },
    [setSelectedNodes]
  );

  const handleMarqueePointerMove = useCallback((event: PointerEvent) => {
    const pointerState = marqueePointerStateRef.current;
    const container = containerRef.current;
    if (!pointerState || !container) return;

    if (!marqueeActiveRef.current) {
      const movedBeforeActivation = Math.hypot(event.clientX - pointerState.startX, event.clientY - pointerState.startY) > 6;
      if (movedBeforeActivation) {
        clearMarqueeTimer();
        marqueePointerStateRef.current = null;
        window.removeEventListener('pointermove', marqueeMoveHandlerRef.current);
        window.removeEventListener('pointerup', marqueeUpHandlerRef.current);
        window.removeEventListener('pointercancel', marqueeUpHandlerRef.current);
      }
      return;
    }

    event.preventDefault();

    const screenRect = createScreenRect(pointerState.startX, pointerState.startY, event.clientX, event.clientY);
    setMarqueeRect(toMarqueeRect(container.getBoundingClientRect(), screenRect));
    updateMarqueeSelection(screenRect, pointerState.baseSelectedIds, pointerState.additive);
  }, [clearMarqueeTimer, updateMarqueeSelection]);

  const handleMarqueePointerUp = useCallback((event: PointerEvent) => {
    const pointerState = marqueePointerStateRef.current;
    if (!pointerState || event.pointerId !== pointerState.pointerId) return;

    clearMarqueeTimer();

    if (marqueeActiveRef.current) {
      suppressNextPaneClickRef.current = true;
    }

    marqueeActiveRef.current = false;
    marqueePointerStateRef.current = null;
    setMarqueeRect(null);

    window.removeEventListener('pointermove', marqueeMoveHandlerRef.current);
    window.removeEventListener('pointerup', marqueeUpHandlerRef.current);
    window.removeEventListener('pointercancel', marqueeUpHandlerRef.current);
  }, [clearMarqueeTimer]);

  const handlePanePointerDown = useCallback((event: PointerEvent) => {
    if (event.button !== 0 || isConnectingMode || editingNodeId) return;

    marqueePointerStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      additive: event.metaKey || event.ctrlKey || event.shiftKey,
      baseSelectedIds: selectedNodeIds,
    };

    clearMarqueeTimer();
    marqueeTimerRef.current = window.setTimeout(() => {
      const pointerState = marqueePointerStateRef.current;
      const container = containerRef.current;
      if (!pointerState || !container) return;

      marqueeActiveRef.current = true;
      const screenRect = createScreenRect(pointerState.startX, pointerState.startY, pointerState.startX, pointerState.startY);
      setMarqueeRect(toMarqueeRect(container.getBoundingClientRect(), screenRect));
      updateMarqueeSelection(screenRect, pointerState.baseSelectedIds, pointerState.additive);
    }, 180);

    window.addEventListener('pointermove', marqueeMoveHandlerRef.current);
    window.addEventListener('pointerup', marqueeUpHandlerRef.current);
    window.addEventListener('pointercancel', marqueeUpHandlerRef.current);
  }, [
    clearMarqueeTimer,
    editingNodeId,
    isConnectingMode,
    selectedNodeIds,
    updateMarqueeSelection,
  ]);

  useEffect(() => {
    marqueeMoveHandlerRef.current = handleMarqueePointerMove;
    marqueeUpHandlerRef.current = handleMarqueePointerUp;
  }, [handleMarqueePointerMove, handleMarqueePointerUp]);

  useEffect(() => {
    const paneElement = containerRef.current?.querySelector('.react-flow__pane');
    if (!(paneElement instanceof HTMLElement)) return;

    paneElement.addEventListener('pointerdown', handlePanePointerDown);
    return () => paneElement.removeEventListener('pointerdown', handlePanePointerDown);
  }, [handlePanePointerDown, flowNodes.length, flowEdges.length]);

  useEffect(() => () => {
    clearMarqueeTimer();
    window.removeEventListener('pointermove', marqueeMoveHandlerRef.current);
    window.removeEventListener('pointerup', marqueeUpHandlerRef.current);
    window.removeEventListener('pointercancel', marqueeUpHandlerRef.current);
  }, [clearMarqueeTimer]);

  useEffect(() => {
    const container = containerRef.current;
    let nextOverlay: DropHintOverlay | null = null;

    if (!dropHint || !container) {
      nextOverlay = null;
    } else if (dropHint.type === 'reparent') {
      const targetEl = container.querySelector(
        `.react-flow__node[data-id="${dropHint.targetNodeId}"]`
      );

      if (targetEl instanceof HTMLElement) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        nextOverlay = {
          type: 'reparent',
          left: targetRect.left - containerRect.left - 4,
          top: targetRect.top - containerRect.top - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
        };
      }
    } else if (dropHint.insertLineRect) {
      const containerRect = container.getBoundingClientRect();
      const { x, y, width } = dropHint.insertLineRect;

      nextOverlay = {
        type: 'reorder',
        left: x - containerRect.left,
        top: y - containerRect.top,
        width,
      };
    }

    const frameId = window.requestAnimationFrame(() => {
      setDropHintOverlay(nextOverlay);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [dropHint]);

  const onPaneClick = useCallback(() => {
    if (suppressNextPaneClickRef.current) {
      suppressNextPaneClickRef.current = false;
      return;
    }
    
    setSelectedCustomEdgeId(null);
    deselectAll();
  }, [deselectAll]);

  const onNodeClick = useCallback(() => {
    setSelectedCustomEdgeId(null);
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    if (edge.id.startsWith('custom-edge-')) {
      setSelectedCustomEdgeId(edge.id);
    }
  }, []);

  useEffect(() => {
    if (!connectorDraft) return;

    const handlePointerMove = (event: PointerEvent) => {
      updateConnectorDrag(event.clientX, event.clientY);
    };

    const handlePointerUp = (event: PointerEvent) => {
      finishConnectorDrag(event.clientX, event.clientY);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [connectorDraft, finishConnectorDrag, updateConnectorDrag]);

  // Click-mode: arrow follows cursor, waiting for destination click
  useEffect(() => {
    if (!connectorPending) return;

    const handleMouseMove = (event: MouseEvent) => {
      updateConnectorPending(event.clientX, event.clientY);
    };

    const handleClick = (event: MouseEvent) => {
      // Ignore clicks on the connector dot buttons themselves
      if ((event.target as HTMLElement).closest('button[aria-label^="Start connector"]')) return;
      finishConnectorPending(event.clientX, event.clientY);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearConnectorPending();
        setConnectingMode(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick, { capture: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [connectorPending, finishConnectorPending, updateConnectorPending, clearConnectorPending, setConnectingMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable);

      if (editingNodeId) {
        if (e.metaKey || e.ctrlKey) {
          const node = mapData?.nodes[editingNodeId];
          if (!node) return;

          if (e.key === 'b') {
            e.preventDefault();
            useMapStore.getState().updateNodeStyle(editingNodeId, {
              fontWeight: node.fontWeight === 'bold' ? 'regular' : 'bold',
            });
            return;
          }
          if (e.key === 'i') {
            e.preventDefault();
            useMapStore.getState().updateNodeStyle(editingNodeId, {
              fontStyle: node.fontStyle === 'italic' ? 'normal' : 'italic',
            });
            return;
          }
          if (e.key === 'u') {
            e.preventDefault();
            useMapStore.getState().updateNodeStyle(editingNodeId, {
              textDecoration: node.textDecoration === 'underline' ? 'none' : 'underline',
            });
            return;
          }
        }
        return; // Ignore general map shortcuts while editing node text
      }

      // Ignore general map shortcuts if typing in a note or other input field
      if (isInputFocused) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        if (!mapData) return;
        e.preventDefault();
        setSelectedCustomEdgeId(null);
        setSelectedNodes(Object.keys(mapData.nodes));
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        const { undo, redo } = useHistoryStore.getState();
        if (e.shiftKey) {
          const redoData = redo();
          if (redoData) useMapStore.getState().loadMap(redoData);
        } else {
          const undoData = undo();
          if (undoData) useMapStore.getState().loadMap(undoData);
        }
        return;
      }

      if (e.key === 'Escape') {
        setSelectedCustomEdgeId(null);
        deselectAll();
        return;
      }

      if (selectedCustomEdgeId && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        removeCustomEdge(selectedCustomEdgeId);
        setSelectedCustomEdgeId(null);
        return;
      }

      if (!mapData || selectedNodeIds.length === 0) return;

      if (selectedNodeIds.length > 1) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          const deletableIds = selectedNodeIds.filter((nodeId) => mapData.nodes[nodeId]?.type !== 'central');
          if (deletableIds.length === 0) return;

          e.preventDefault();
          pushState(mapData);
          deselectAll();
          deleteNodes(deletableIds);
        }
        return;
      }

      const selectedId = selectedNodeIds[0];
      if (!selectedId) return;

      const node = mapData.nodes[selectedId];
      if (!node) return;

      switch (e.key) {
        case 'Tab': {
          e.preventDefault();
          pushState(mapData);
          const childId = addChild(selectedId, '');
          window.setTimeout(() => {
            selectNode(childId);
            setEditingNode(childId);
          }, 50);
          break;
        }
        case 'Enter': {
          e.preventDefault();
          pushState(mapData);
          if (node.type === 'central') {
            const childId = addChild(selectedId, '');
            window.setTimeout(() => {
              selectNode(childId);
              setEditingNode(childId);
            }, 50);
          } else {
            const siblingId = addSibling(selectedId, e.shiftKey, '');
            window.setTimeout(() => {
              selectNode(siblingId);
              setEditingNode(siblingId);
            }, 50);
          }
          break;
        }
        case 'Delete':
        case 'Backspace': {
          if (node.type === 'central') break;
          e.preventDefault();
          pushState(mapData);
          if (node.parentId) selectNode(node.parentId);
          deleteNode(selectedId);
          break;
        }
        case ' ': {
          e.preventDefault();
          toggleExpand(selectedId);
          break;
        }
        case 'F2': {
          e.preventDefault();
          setEditingNode(selectedId);
          break;
        }
        case 'ArrowUp':
        case 'ArrowDown': {
          if (!node.parentId) break;
          e.preventDefault();
          const siblings = Object.values(mapData.nodes)
            .filter((item) => item.parentId === node.parentId)
            .sort((a, b) => a.orderIndex - b.orderIndex);
          const currentIdx = siblings.findIndex((item) => item.id === selectedId);
          const nextIdx = e.key === 'ArrowUp' ? currentIdx - 1 : currentIdx + 1;
          if (nextIdx >= 0 && nextIdx < siblings.length) selectNode(siblings[nextIdx].id);
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          if (node.parentId) selectNode(node.parentId);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          const children = Object.values(mapData.nodes)
            .filter((item) => item.parentId === selectedId)
            .sort((a, b) => a.orderIndex - b.orderIndex);
          if (children.length > 0) selectNode(children[0].id);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodeIds,
    selectedCustomEdgeId,
    editingNodeId,
    mapData,
    addChild,
    addSibling,
    deleteNode,
    deleteNodes,
    removeCustomEdge,
    toggleExpand,
    selectNode,
    setSelectedNodes,
    deselectAll,
    setEditingNode,
    pushState,
  ]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onReconnect={onReconnect}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        minZoom={VIEWPORT_DEFAULTS.minZoom}
        maxZoom={VIEWPORT_DEFAULTS.maxZoom}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={Boolean(selectedCustomEdgeId)}
        edgesReconnectable
        elementsSelectable
        panOnDrag={!dragPreview && !connectorPending ? [1, 2] : false}
        autoPanOnConnect
        zoomOnScroll={false}
        zoomOnPinch
        panOnScroll={!connectorPending}
        selectNodesOnDrag={false}
        reconnectRadius={18}
        style={{ background: '#FAFBFC', cursor: connectorPending ? 'crosshair' : undefined }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#E2E8F0"
          style={{ opacity: 0.5 }}
        />
      </ReactFlow>

      <ContextualToolbar />
      <EdgeToolbar
        edgeId={selectedCustomEdgeId}
        onClose={() => setSelectedCustomEdgeId(null)}
      />

      {(connectorDraft || connectorPending) && (() => {
        const draft = connectorDraft || connectorPending!;
        const startX = draft.startClientX;
        const startY = draft.startClientY;
        const endX = draft.currentClientX;
        const endY = draft.currentClientY;
        const controlOffset = Math.max(32, Math.abs(endX - startX) * 0.2);
        const path = `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`;

        return (
          <svg
            style={{
              position: 'fixed',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 1300,
              overflow: 'visible',
            }}
          >
            <defs>
              <marker
                id="connector-preview-arrow"
                markerWidth="10"
                markerHeight="10"
                refX="8"
                refY="5"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563EB" />
              </marker>
            </defs>
            <path
              d={path}
              fill="none"
              stroke="#2563EB"
              strokeWidth="2.5"
              strokeLinecap="round"
              markerEnd="url(#connector-preview-arrow)"
              style={{
                filter: 'drop-shadow(0 4px 10px rgba(37, 99, 235, 0.22))',
              }}
            />
          </svg>
        );
      })()}

      {marqueeRect && (
        <div
          style={{
            position: 'absolute',
            left: marqueeRect.x,
            top: marqueeRect.y,
            width: marqueeRect.width,
            height: marqueeRect.height,
            border: '1px solid rgba(59, 130, 246, 0.9)',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.45) inset',
            borderRadius: '10px',
            pointerEvents: 'none',
            zIndex: 1200,
          }}
        />
      )}

      {dropHintOverlay?.type === 'reparent' && (
        <div
          style={{
            position: 'absolute',
            left: dropHintOverlay.left,
            top: dropHintOverlay.top,
            width: dropHintOverlay.width,
            height: dropHintOverlay.height,
            border: '2px solid #2563EB',
            borderRadius: '10px',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.12)',
            pointerEvents: 'none',
            zIndex: 1250,
            transition: 'all 0.1s ease',
          }}
        />
      )}

      {dropHintOverlay?.type === 'reorder' && (
        <div
          style={{
            position: 'absolute',
            left: dropHintOverlay.left,
            top: dropHintOverlay.top,
            width: dropHintOverlay.width,
            height: 3,
            backgroundColor: '#2563EB',
            borderRadius: '2px',
            boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.22)',
            pointerEvents: 'none',
            zIndex: 1250,
          }}
        />
      )}

      {dragPreview && (() => {
        const dragNode = mapData?.nodes[dragPreview.nodeId];
        if (dragNode) {
          return (
            <div
              style={{
                position: 'fixed',
                left: dragPreview.x,
                top: dragPreview.y,
                width: dragPreview.width,
                minHeight: dragPreview.height,
                transform: 'translateZ(0)',
                pointerEvents: 'none',
                zIndex: 1600,
                display: 'flex',
                alignItems: 'center',
                padding: dragNode.shape === 'pill' ? '10px 28px' : dragNode.shape === 'rounded-rectangle' ? '8px 18px' : '6px 12px',
                borderRadius: dragNode.shape === 'pill' ? '999px' : dragNode.shape === 'rounded-rectangle' ? '10px' : '6px',
                backgroundColor: dragNode.fillColor || '#FFFFFF',
                border: `1.5px solid ${dragNode.borderColor || dragNode.lineColor || '#E2E8F0'}`,
                boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)',
                color: dragNode.textColor || '#0F172A',
                fontSize: dragNode.fontSize || 14,
                fontWeight: dragNode.fontWeight === 'bold' ? 700 : dragNode.fontWeight === 'semibold' ? 600 : dragNode.fontWeight === 'medium' ? 500 : 400,
                fontStyle: dragNode.fontStyle === 'italic' ? 'italic' : 'normal',
                textDecoration: dragNode.textDecoration === 'underline' ? 'underline' : 'none',
                textAlign: dragNode.textAlign as React.CSSProperties['textAlign'] || 'left',
              }}
            >
              <span style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{dragPreview.label || dragNode.text}</span>
            </div>
          );
        }
        return (
          <div
            style={{
              position: 'fixed',
              left: dragPreview.x,
              top: dragPreview.y,
              width: dragPreview.width,
              minHeight: dragPreview.height,
              transform: 'translateZ(0)',
              pointerEvents: 'none',
              zIndex: 1600,
              padding: '10px 16px',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)',
              color: '#0F172A',
              fontSize: '14px',
              fontWeight: 600,
              opacity: 0.88,
            }}
          >
            <div style={{ wordBreak: 'break-word' }}>{dragPreview.label || t.common.defaultNewTopic}</div>
          </div>
        );
      })()}
    </div>
  );
}
