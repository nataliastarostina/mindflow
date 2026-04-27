'use client';
// ============================================================
// MindMapNode — Custom node with multi-handle support
// ============================================================

import React, { useCallback, useRef, useEffect, useState, memo } from 'react';
import { Handle, Position, NodeResizeControl, useReactFlow } from '@xyflow/react';
import { useUIStore } from '@/stores/useUIStore';
import { useMapStore } from '@/stores/useMapStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import type { CommentData, LinkRef, TextDocument, LayoutMode, MindMapNode } from '@/lib/types';
import { Link2, MessageSquare, Image as ImageIcon, FileText, ChevronRight, ChevronDown, ExternalLink } from 'lucide-react';
import { useI18n } from '@/stores/useLanguageStore';

interface MindMapNodeData {
  label: string;
  nodeType: 'central' | 'primary' | 'subtopic' | 'floating';
  shape: string;
  fillColor?: string | null;
  borderColor?: string | null;
  borderWidth?: number;
  borderStyle?: string;
  textColor?: string | null;
  fontSize?: number | null;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: string;
  lineColor?: string | null;
  hasLink?: boolean;
  link?: LinkRef | null;
  hasImage?: boolean;
  commentCount?: number;
  comments?: CommentData[];
  hasNote?: boolean;
  textDocuments?: TextDocument[];
  hasChildren?: boolean;
  expanded?: boolean;
  mindmapNodeId: string;
  layoutMode?: LayoutMode;
  isLeftSide?: boolean;
  [key: string]: unknown;
}

const REORDER_DROP_PADDING = 72;

function getDragAxis(layoutMode?: LayoutMode): 'x' | 'y' {
  return layoutMode === 'top-down' ? 'x' : 'y';
}

function getRectStart(rect: DOMRect, axis: 'x' | 'y'): number {
  return axis === 'x' ? rect.left : rect.top;
}

function getRectEnd(rect: DOMRect, axis: 'x' | 'y'): number {
  return axis === 'x' ? rect.right : rect.bottom;
}

function getRectCenter(rect: DOMRect, axis: 'x' | 'y'): number {
  return axis === 'x' ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
}

function getPointerCoord(clientX: number, clientY: number, axis: 'x' | 'y'): number {
  return axis === 'x' ? clientX : clientY;
}

function getSiblingReorderIndex({
  draggedNodeId,
  parentId,
  clientX,
  clientY,
  layoutMode,
  nodes,
}: {
  draggedNodeId: string;
  parentId: string;
  clientX: number;
  clientY: number;
  layoutMode?: LayoutMode;
  nodes: Record<string, MindMapNode>;
}): number | null {
  const siblingNodes = Object.values(nodes)
    .filter((node) => node.parentId === parentId && node.id !== draggedNodeId)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  if (siblingNodes.length === 0) {
    return 0;
  }

  const siblingRects = siblingNodes
    .map((node) => {
      const element = document.querySelector(`.react-flow__node[data-id="${node.id}"]`);
      if (!(element instanceof HTMLElement)) return null;
      return { node, rect: element.getBoundingClientRect() };
    })
    .filter((entry): entry is { node: MindMapNode; rect: DOMRect } => entry !== null);

  if (siblingRects.length !== siblingNodes.length) {
    return null;
  }

  const axis = getDragAxis(layoutMode);
  const crossAxis = axis === 'x' ? 'y' : 'x';
  const pointerAxis = getPointerCoord(clientX, clientY, axis);
  const pointerCrossAxis = getPointerCoord(clientX, clientY, crossAxis);

  const axisStart = Math.min(...siblingRects.map(({ rect }) => getRectStart(rect, axis)));
  const axisEnd = Math.max(...siblingRects.map(({ rect }) => getRectEnd(rect, axis)));
  const crossAxisStart = Math.min(...siblingRects.map(({ rect }) => getRectStart(rect, crossAxis)));
  const crossAxisEnd = Math.max(...siblingRects.map(({ rect }) => getRectEnd(rect, crossAxis)));

  const withinLane =
    pointerAxis >= axisStart - REORDER_DROP_PADDING &&
    pointerAxis <= axisEnd + REORDER_DROP_PADDING &&
    pointerCrossAxis >= crossAxisStart - REORDER_DROP_PADDING &&
    pointerCrossAxis <= crossAxisEnd + REORDER_DROP_PADDING;

  if (!withinLane) {
    return null;
  }

  const insertionIndex = siblingRects.findIndex(({ rect }) => pointerAxis < getRectCenter(rect, axis));
  return insertionIndex === -1 ? siblingRects.length : insertionIndex;
}

function canReparentNode(
  nodes: Record<string, MindMapNode>,
  nodeId: string,
  targetId: string,
  currentParentId: string | null
): boolean {
  if (targetId === nodeId || targetId === currentParentId) {
    return false;
  }

  let currentId: string | null = targetId;
  while (currentId) {
    if (currentId === nodeId) {
      return false;
    }
    currentId = nodes[currentId]?.parentId ?? null;
  }

  return true;
}

// Computes live drop hint during drag — returns hint or null
function computeDropHint(
  draggedNodeId: string,
  clientX: number,
  clientY: number,
  layoutMode: LayoutMode | undefined,
  nodes: Record<string, MindMapNode>
): import('@/stores/useUIStore').DropHintState | null {
  const draggedNode = nodes[draggedNodeId];
  if (!draggedNode) return null;

  const elements = document.elementsFromPoint(clientX, clientY);
  const targetNodeEl = elements.find(
    (el) =>
      el.classList.contains('react-flow__node') &&
      el.getAttribute('data-id') !== draggedNodeId
  );
  const targetId = targetNodeEl?.getAttribute('data-id') ?? null;
  const targetNode = targetId ? nodes[targetId] : undefined;

  // Check reorder first (same parent siblings)
  if (draggedNode.parentId) {
    const siblingNodes = Object.values(nodes)
      .filter((n) => n.parentId === draggedNode.parentId && n.id !== draggedNodeId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    const siblingRects = siblingNodes
      .map((n) => {
        const el = document.querySelector(`.react-flow__node[data-id="${n.id}"]`);
        if (!(el instanceof HTMLElement)) return null;
        return { node: n, rect: el.getBoundingClientRect() };
      })
      .filter((e): e is { node: MindMapNode; rect: DOMRect } => e !== null);

    if (siblingRects.length === siblingNodes.length && siblingRects.length > 0) {
      const axis = getDragAxis(layoutMode);
      const crossAxis = axis === 'x' ? 'y' : 'x';
      const pointerAxis = getPointerCoord(clientX, clientY, axis);
      const pointerCrossAxis = getPointerCoord(clientX, clientY, crossAxis);
      const axisStart = Math.min(...siblingRects.map(({ rect }) => getRectStart(rect, axis)));
      const axisEnd = Math.max(...siblingRects.map(({ rect }) => getRectEnd(rect, axis)));
      const crossAxisStart = Math.min(...siblingRects.map(({ rect }) => getRectStart(rect, crossAxis)));
      const crossAxisEnd = Math.max(...siblingRects.map(({ rect }) => getRectEnd(rect, crossAxis)));
      const withinLane =
        pointerAxis >= axisStart - REORDER_DROP_PADDING &&
        pointerAxis <= axisEnd + REORDER_DROP_PADDING &&
        pointerCrossAxis >= crossAxisStart - REORDER_DROP_PADDING &&
        pointerCrossAxis <= crossAxisEnd + REORDER_DROP_PADDING;

      if (withinLane && targetNode && targetNode.parentId === draggedNode.parentId) {
        const entry = targetNodeEl instanceof HTMLElement ? targetNodeEl.getBoundingClientRect() : null;
        const insertLineRect = entry
          ? {
              x: axis === 'y' ? entry.left : entry.left + entry.width / 2 - 1,
              y: axis === 'y' ? entry.top - 2 : entry.top,
              width: axis === 'y' ? entry.width : 2,
            }
          : null;
        return { type: 'reorder', targetNodeId: targetId!, insertLineRect };
      }
    }
  }

  // Reparent hint
  if (targetId && targetNode && canReparentNode(nodes, draggedNodeId, targetId, draggedNode.parentId)) {
    return { type: 'reparent', targetNodeId: targetId };
  }

  return null;
}

const getHandleStyle = (
  isVisible: boolean
): React.CSSProperties => {
  return {
    background: 'transparent',
    border: 'none',
    width: 12,
    height: 12,
    opacity: 0,
    boxShadow: 'none',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: isVisible ? 20 : -1,
    pointerEvents: 'none',
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MindMapNodeComponent(props: any) {
  const { t } = useI18n();
  const data = props.data as MindMapNodeData;
  const selected = props.selected as boolean | undefined;
  const {
    editingNodeId,
    setEditingNode,
    selectedNodeIds,
    isConnectingMode,
    connectingNodeId,
    startConnectorClick,
    dragPreview,
    startNodeDragPreview,
    updateNodeDragPreview,
    clearNodeDragPreview,
    selectNode,
    setActivePopover,
    setActiveTextDocumentId,
    setDropHint,
  } = useUIStore();
  const {
    mapData,
    updateNodeText,
    toggleExpand,
    reparentNode,
    reorderNode,
    updateNodeWidthsManually,
    updateFloatingNodePosition,
  } = useMapStore();
  const { pushState } = useHistoryStore();
  const { screenToFlowPosition } = useReactFlow();
  const inputRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragActiveRef = useRef(false);
  const resizeSelectionBaseRef = useRef<Record<string, number> | null>(null);
  const pointerMoveHandlerRef = useRef<(event: PointerEvent) => void>(() => {});
  const pointerUpHandlerRef = useRef<(event: PointerEvent) => void>(() => {});
  const isEditing = editingNodeId === data.mindmapNodeId;
  const isSelected = selected || selectedNodeIds.includes(data.mindmapNodeId);
  const [showLinkPreview, setShowLinkPreview] = useState(false);
  const linkPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isVertical = data.layoutMode === 'top-down' || data.layoutMode === 'list';
  const isLeftSide = data.isLeftSide === true;
  const isCentral = data.nodeType === 'central';
  const textDocuments = data.textDocuments || [];
  const isDragGhostSource = dragPreview?.nodeId === data.mindmapNodeId;
  const showConnectorHandles = isConnectingMode && connectingNodeId === data.mindmapNodeId;

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const finishCustomDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragActiveRef.current) return;
    dragActiveRef.current = false;

    const draggedNode = mapData?.nodes[data.mindmapNodeId];
    if (!mapData || !draggedNode) {
      clearNodeDragPreview();
      setDropHint(null);
      return;
    }

    // Floating node: just move it to new canvas position
    if (draggedNode.type === 'floating') {
      const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
      pushState(mapData);
      updateFloatingNodePosition(data.mindmapNodeId, flowPos);
      clearNodeDragPreview();
      setDropHint(null);
      return;
    }

    const elements = document.elementsFromPoint(clientX, clientY);
    const targetNodeEl = elements.find((el) =>
      el.classList.contains('react-flow__node') &&
      el.getAttribute('data-id') !== data.mindmapNodeId
    );

    const targetId = targetNodeEl?.getAttribute('data-id');
    const targetNode = targetId ? mapData.nodes[targetId] : undefined;

    const reorderIndex = draggedNode.parentId
      ? getSiblingReorderIndex({
          draggedNodeId: data.mindmapNodeId,
          parentId: draggedNode.parentId,
          clientX,
          clientY,
          layoutMode: data.layoutMode,
          nodes: mapData.nodes,
        })
      : null;

    if (targetNode && targetNode.parentId === draggedNode.parentId && reorderIndex !== null) {
      if (reorderIndex !== draggedNode.orderIndex) {
        pushState(mapData);
        reorderNode(data.mindmapNodeId, reorderIndex);
      }
    } else if (targetId && canReparentNode(mapData.nodes, data.mindmapNodeId, targetId, draggedNode.parentId)) {
      pushState(mapData);
      reparentNode(data.mindmapNodeId, targetId);
    } else if (reorderIndex !== null && reorderIndex !== draggedNode.orderIndex) {
      pushState(mapData);
      reorderNode(data.mindmapNodeId, reorderIndex);
    }

    clearNodeDragPreview();
    setDropHint(null);
  }, [clearNodeDragPreview, data.layoutMode, data.mindmapNodeId, mapData, pushState, reorderNode, reparentNode, screenToFlowPosition, setDropHint, updateFloatingNodePosition]);

  const targetRef = useRef<HTMLDivElement | null>(null);

  const handleWindowPointerMove = useCallback((event: PointerEvent) => {
    if (!pointerStartRef.current) return;

    const deltaX = event.clientX - pointerStartRef.current.x;
    const deltaY = event.clientY - pointerStartRef.current.y;
    const movedTooFar = Math.hypot(deltaX, deltaY) > 6;

    if (!dragActiveRef.current && movedTooFar && targetRef.current) {
      clearLongPressTimer();
      dragActiveRef.current = true;
      const rect = targetRef.current.getBoundingClientRect();
      startNodeDragPreview({
        nodeId: data.mindmapNodeId,
        label: data.label,
        clientX: event.clientX,
        clientY: event.clientY,
        offsetX: rect.width / 2,
        offsetY: rect.height / 2,
        width: rect.width,
        height: rect.height,
      });
    }

    if (dragActiveRef.current) {
      updateNodeDragPreview(event.clientX, event.clientY);

      // Live drop-hint: only for tree nodes (not floating), compute hint on every move
      const draggedNode = mapData?.nodes[data.mindmapNodeId];
      if (mapData && draggedNode && draggedNode.type !== 'floating') {
        const hint = computeDropHint(
          data.mindmapNodeId,
          event.clientX,
          event.clientY,
          data.layoutMode,
          mapData.nodes
        );
        setDropHint(hint);
      }
    }
  }, [clearLongPressTimer, data.label, data.layoutMode, data.mindmapNodeId, mapData, setDropHint, startNodeDragPreview, updateNodeDragPreview]);

  const handleWindowPointerUp = useCallback((event: PointerEvent) => {
    clearLongPressTimer();
    pointerStartRef.current = null;
    targetRef.current = null;

    if (dragActiveRef.current) {
      finishCustomDrag(event.clientX, event.clientY);
    }

    window.removeEventListener('pointermove', pointerMoveHandlerRef.current);
    window.removeEventListener('pointerup', pointerUpHandlerRef.current);
    window.removeEventListener('pointercancel', pointerUpHandlerRef.current);
  }, [clearLongPressTimer, finishCustomDrag]);

  useEffect(() => {
    pointerMoveHandlerRef.current = handleWindowPointerMove;
    pointerUpHandlerRef.current = handleWindowPointerUp;
  }, [handleWindowPointerMove, handleWindowPointerUp]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(inputRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]);

  useEffect(() => {
    return () => {
      clearLongPressTimer();
      window.removeEventListener('pointermove', pointerMoveHandlerRef.current);
      window.removeEventListener('pointerup', pointerUpHandlerRef.current);
      window.removeEventListener('pointercancel', pointerUpHandlerRef.current);
    };
  }, [clearLongPressTimer, handleWindowPointerMove, handleWindowPointerUp]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNode(data.mindmapNodeId);
  }, [data.mindmapNodeId, setEditingNode]);

  const commitEdit = useCallback(() => {
    const text = inputRef.current?.textContent?.trim() || data.label;
    if (text !== data.label && mapData) {
      pushState(mapData);
    }
    updateNodeText(data.mindmapNodeId, text);
    setEditingNode(null);
  }, [data.mindmapNodeId, data.label, mapData, pushState, updateNodeText, setEditingNode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setEditingNode(null);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        commitEdit();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit();
      }
      e.stopPropagation();
    },
    [commitEdit, setEditingNode]
  );

  const handleBlur = useCallback(() => {
    if (isEditing) commitEdit();
  }, [isEditing, commitEdit]);

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleExpand(data.mindmapNodeId);
  }, [data.mindmapNodeId, toggleExpand]);

  const openTextDocument = (documentId?: string) => {
    selectNode(data.mindmapNodeId);
    setActiveTextDocumentId(documentId || textDocuments[0]?.id || null);
    setActivePopover('note');
    setShowDocumentPreview(false);
  };

  const openComments = () => {
    selectNode(data.mindmapNodeId);
    setActivePopover('comment');
  };

  const effectiveBorderColor = (() => {
    if (data.borderColor) return data.borderColor;
    if (data.nodeType === 'primary' || data.nodeType === 'subtopic') {
      return data.lineColor || '#E2E8F0';
    }
    return null;
  })();

  const getShapeStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      fontSize: data.fontSize || 14,
      fontWeight: data.fontWeight === 'bold' ? 700 : data.fontWeight === 'semibold' ? 600 : data.fontWeight === 'medium' ? 500 : 400,
      fontStyle: data.fontStyle === 'italic' ? 'italic' : 'normal',
      textDecoration: data.textDecoration === 'underline' ? 'underline' : 'none',
      textAlign: (data.textAlign as React.CSSProperties['textAlign']) || (isCentral ? 'center' : 'left'),
      color: data.textColor || '#1E293B',
      transition: 'all 0.15s ease',
    };

    switch (data.shape) {
      case 'pill':
        return {
          ...base,
          backgroundColor: data.fillColor || '#1E293B',
          borderRadius: '999px',
          padding: '10px 28px',
          border: effectiveBorderColor ? `${data.borderWidth || 2}px ${data.borderStyle || 'solid'} ${effectiveBorderColor}` : 'none',
        };
      case 'rounded-rectangle':
        return {
          ...base,
          backgroundColor: data.fillColor || '#FFFFFF',
          borderRadius: '10px',
          padding: '8px 18px',
          border: `1.5px solid ${effectiveBorderColor || '#E2E8F0'}`,
        };
      case 'soft-rectangle':
        return {
          ...base,
          backgroundColor: data.fillColor || '#F8FAFC',
          borderRadius: '6px',
          padding: '8px 16px',
          border: `1px solid ${effectiveBorderColor || '#E2E8F0'}`,
        };
      case 'plain-text':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderRadius: '4px',
          padding: '6px 12px',
          border: 'none',
        };
      case 'underline':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderRadius: '0',
          padding: '6px 12px',
          borderBottom: `2px solid ${data.lineColor || '#94A3B8'}`,
        };
      default:
        return {
          ...base,
          backgroundColor: data.fillColor || '#FFFFFF',
          borderRadius: '10px',
          padding: '8px 18px',
          border: `1.5px solid ${effectiveBorderColor || '#E2E8F0'}`,
        };
    }
  };

  const nodeStyle = getShapeStyles();

  const getCollapseToggleStyle = (): React.CSSProperties => {
    const baseToggle: React.CSSProperties = {
      position: 'absolute',
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      border: `1.5px solid ${data.lineColor || '#E2E8F0'}`,
      backgroundColor: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      zIndex: 10,
      padding: 0,
    };

    if (isVertical) {
      return { ...baseToggle, bottom: '-22px', left: '50%', transform: 'translateX(-50%)' };
    }
    if (isLeftSide) {
      return { ...baseToggle, left: '-22px', top: '50%', transform: 'translateY(-50%)' };
    }
    return { ...baseToggle, right: '-22px', top: '50%', transform: 'translateY(-50%)' };
  };

  const renderHandlePair = (position: Position, suffix: 'top' | 'right' | 'bottom' | 'left') => {
    const offsetStyle =
      position === Position.Top
        ? { top: showConnectorHandles ? -6 : 0 }
        : position === Position.Bottom
        ? { bottom: showConnectorHandles ? -6 : 0 }
        : position === Position.Left
        ? { left: showConnectorHandles ? -6 : 0 }
        : { right: showConnectorHandles ? -6 : 0 };

    return (
      <React.Fragment key={suffix}>
        <Handle
          type="target"
          position={position}
          id={`target-${suffix}`}
          style={{ ...getHandleStyle(showConnectorHandles), ...offsetStyle }}
        />
        <Handle
          type="source"
          position={position}
          id={`source-${suffix}`}
          style={{ ...getHandleStyle(showConnectorHandles), ...offsetStyle }}
        />
      </React.Fragment>
    );
  };

  const connectorDotBaseStyle: React.CSSProperties = {
    position: 'absolute',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '2px solid #FFFFFF',
    backgroundColor: '#2563EB',
    boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.18), 0 4px 14px rgba(15, 23, 42, 0.14)',
    cursor: 'crosshair',
    zIndex: 40,
    padding: 0,
    touchAction: 'none',
  };

  const connectorDotPositions: Array<{
    handleId: 'source-top' | 'source-right' | 'source-bottom' | 'source-left';
    style: React.CSSProperties;
  }> = [
    {
      handleId: 'source-top',
      style: { top: -10, left: '50%', transform: 'translateX(-50%)' },
    },
    {
      handleId: 'source-right',
      style: { right: -10, top: '50%', transform: 'translateY(-50%)' },
    },
    {
      handleId: 'source-bottom',
      style: { bottom: -10, left: '50%', transform: 'translateX(-50%)' },
    },
    {
      handleId: 'source-left',
      style: { left: -10, top: '50%', transform: 'translateY(-50%)' },
    },
  ];

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || isEditing || (event.target as HTMLElement).closest('.collapse-toggle')) return;

    targetRef.current = event.currentTarget;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };

    window.addEventListener('pointermove', pointerMoveHandlerRef.current);
    window.addEventListener('pointerup', pointerUpHandlerRef.current);
    window.addEventListener('pointercancel', pointerUpHandlerRef.current);

    // Initial timeout logic fallback if they just hold
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      const rect = targetRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragActiveRef.current = true;
      startNodeDragPreview({
        nodeId: data.mindmapNodeId,
        label: data.label,
        clientX: event.clientX,
        clientY: event.clientY,
        offsetX: rect.width / 2,
        offsetY: rect.height / 2,
        width: rect.width,
        height: rect.height,
      });
    }, 240);
  }, [
    clearLongPressTimer,
    data.label,
    data.mindmapNodeId,
    isEditing,
    startNodeDragPreview,
  ]);

  const handleResizeStart = useCallback(() => {
    const currentMap = useMapStore.getState().mapData;
    if (!currentMap) return;

    const currentSelection = useUIStore.getState().selectedNodeIds;
    const activeSelection = currentSelection.includes(data.mindmapNodeId)
      ? currentSelection
      : [data.mindmapNodeId];

    resizeSelectionBaseRef.current = activeSelection.reduce<Record<string, number>>((acc, nodeId) => {
      const node = currentMap.nodes[nodeId];
      if (!node) return acc;

      acc[nodeId] = node.manualWidth || node.width || 60;
      return acc;
    }, {});
  }, [data.mindmapNodeId]);

  const handleResize = useCallback((_: unknown, { width }: { width: number }) => {
    const baseWidths = resizeSelectionBaseRef.current;
    if (!baseWidths || Object.keys(baseWidths).length === 0) return;

    const sourceWidth = baseWidths[data.mindmapNodeId] ?? width;
    const widthDelta = width - sourceWidth;
    const nextWidths = Object.entries(baseWidths).map(([nodeId, baseWidth]) => ({
      nodeId,
      width: Math.max(60, Math.min(800, baseWidth + widthDelta)),
    }));

    updateNodeWidthsManually(nextWidths);
  }, [data.mindmapNodeId, updateNodeWidthsManually]);

  const handleResizeEnd = useCallback((_: unknown, { width }: { width: number }) => {
    if (!mapData) return;

    const baseWidths = resizeSelectionBaseRef.current;
    resizeSelectionBaseRef.current = null;

    if (!baseWidths || Object.keys(baseWidths).length === 0) return;

    const sourceWidth = baseWidths[data.mindmapNodeId] ?? width;
    const widthDelta = width - sourceWidth;
    const nextWidths = Object.entries(baseWidths).map(([nodeId, baseWidth]) => ({
      nodeId,
      width: Math.max(60, Math.min(800, baseWidth + widthDelta)),
    }));

    pushState(mapData);
    updateNodeWidthsManually(nextWidths);
  }, [data.mindmapNodeId, mapData, pushState, updateNodeWidthsManually]);

  return (
    <div 
      className="mindmap-node-wrapper" 
      style={{ position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {renderHandlePair(Position.Top, 'top')}
      {renderHandlePair(Position.Right, 'right')}
      {renderHandlePair(Position.Bottom, 'bottom')}
      {renderHandlePair(Position.Left, 'left')}
      {showConnectorHandles && connectorDotPositions.map(({ handleId, style }) => (
        <button
          key={handleId}
          type="button"
          className="nodrag nopan"
          aria-label={`Start connector from ${handleId.replace('source-', '')}`}
          style={{ ...connectorDotBaseStyle, ...style }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const rect = event.currentTarget.getBoundingClientRect();
            startConnectorClick(handleId, rect.left + rect.width / 2, rect.top + rect.height / 2);
          }}
        />
      ))}

      <div
        className={`mindmap-node ${isSelected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
        style={{
          ...nodeStyle,
          boxShadow: isSelected
            ? `0 0 0 2px ${data.lineColor || '#6366F1'}40, 0 1px 3px rgba(0,0,0,0.06)`
            : isCentral
            ? '0 2px 8px rgba(0,0,0,0.12)'
            : '0 1px 3px rgba(0,0,0,0.04)',
          cursor: isEditing ? 'text' : 'grab',
          opacity: isDragGhostSource ? 0.38 : 1,
          minWidth: isCentral ? '120px' : '60px',
          maxWidth: '320px',
          userSelect: isEditing ? 'text' : 'none',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
      >
        {/* Content */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
          {isEditing ? (
            <div
              ref={inputRef}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              style={{
                outline: 'none',
                minWidth: '40px',
                width: '100%',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              }}
            >
              {data.label}
            </div>
          ) : (
            <span
              onClick={(e) => {
                if (!dragActiveRef.current) {
                  e.stopPropagation();
                  setEditingNode(data.mindmapNodeId);
                }
              }}
              style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', cursor: 'text' }}
            >
              {data.label}
            </span>
          )}
        </div>

        {/* Status badges */}
        {!isEditing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
            {data.hasLink && data.link && (
              <div
                style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                onMouseEnter={() => {
                  if (linkPreviewTimerRef.current) {
                    clearTimeout(linkPreviewTimerRef.current);
                    linkPreviewTimerRef.current = null;
                  }
                  setShowLinkPreview(true);
                }}
                onMouseLeave={() => {
                  linkPreviewTimerRef.current = setTimeout(() => {
                    setShowLinkPreview(false);
                  }, 300);
                }}
              >
                <Link2 size={12} style={{ opacity: 0.6, cursor: 'pointer' }} />
                {showLinkPreview && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      paddingTop: '8px',
                    }}
                    onMouseEnter={() => {
                      if (linkPreviewTimerRef.current) {
                        clearTimeout(linkPreviewTimerRef.current);
                        linkPreviewTimerRef.current = null;
                      }
                    }}
                    onMouseLeave={() => {
                      linkPreviewTimerRef.current = setTimeout(() => {
                        setShowLinkPreview(false);
                      }, 300);
                    }}
                  >
                  <div
                    style={{
                      width: '260px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      boxShadow: '0 12px 28px rgba(15, 23, 42, 0.16)',
                      padding: '12px',
                      zIndex: 120,
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                      {t.node.link}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        lineHeight: 1.5,
                        color: '#0F172A',
                        wordBreak: 'break-word',
                        marginBottom: '10px',
                      }}
                    >
                      {data.link.url}
                    </div>
                    <a
                      href={data.link.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <ExternalLink size={12} />
                      {t.node.openLink}
                    </a>
                  </div>
                  </div>
                )}
              </div>
            )}
            {data.hasImage && <ImageIcon size={12} style={{ opacity: 0.5 }} />}
            {data.hasNote && (
              <div
                style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                onMouseEnter={() => setShowDocumentPreview(true)}
                onMouseLeave={() => setShowDocumentPreview(false)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openTextDocument();
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    margin: 0,
                    cursor: 'pointer',
                    color: 'inherit',
                    opacity: 0.6,
                  }}
                  title={t.notePopover.openTextDocuments}
                >
                  <FileText size={12} />
                  {textDocuments.length > 1 && <span style={{ fontSize: '10px', fontWeight: 600 }}>{textDocuments.length}</span>}
                </button>
                {showDocumentPreview && textDocuments.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: '280px',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      boxShadow: '0 12px 28px rgba(15, 23, 42, 0.16)',
                      padding: '12px',
                      zIndex: 120,
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>
                      {t.node.textDocuments}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {textDocuments.map((document) => (
                        <button
                          key={document.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTextDocument(document.id);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            padding: '9px 10px',
                            borderRadius: '10px',
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#FFFFFF',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <FileText size={13} style={{ color: '#64748B', flexShrink: 0 }} />
                          <span
                            style={{
                              fontSize: '12px',
                              color: '#0F172A',
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {document.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {(data.commentCount || 0) > 0 && (
              <button
                type="button"
                className="nodrag nopan"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openComments();
                }}
                title={t.node.openComments}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: '10px',
                  opacity: 0.72,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'transparent',
                  color: 'inherit',
                  padding: 0,
                  margin: 0,
                }}
              >
                <MessageSquare size={10} />
                {data.commentCount}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Collapse/expand toggle */}
      {data.hasChildren && !isEditing && (
        <button
          onClick={handleToggleExpand}
          className="collapse-toggle"
          style={getCollapseToggleStyle()}
        >
          {isVertical ? (
            <ChevronDown size={10} style={{ color: data.lineColor || '#94A3B8', transform: data.expanded === false ? 'rotate(-90deg)' : 'none' }} />
          ) : isLeftSide ? (
            <ChevronRight size={10} style={{ color: data.lineColor || '#94A3B8', transform: 'rotate(180deg)' }} />
          ) : (
            <ChevronRight size={10} style={{ color: data.lineColor || '#94A3B8' }} />
          )}
        </button>
      )}

      {/* Resize Controls */}
      {isSelected && !isEditing && (
        <>
          <NodeResizeControl
            minWidth={60}
            maxWidth={800}
            position="right"
            onResizeStart={handleResizeStart}
            onResize={handleResize}
            onResizeEnd={handleResizeEnd}
            style={{ background: 'transparent', border: 'none' }}
          >
            <div 
              style={{
                position: 'absolute',
                right: -6,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 8,
                height: 24,
                backgroundColor: isHovered ? '#CBD5E1' : 'transparent',
                borderRadius: 4,
                cursor: 'col-resize',
                zIndex: 100,
              }} 
            />
          </NodeResizeControl>
          <NodeResizeControl
            minWidth={60}
            maxWidth={800}
            position="left"
            onResizeStart={handleResizeStart}
            onResize={handleResize}
            onResizeEnd={handleResizeEnd}
            style={{ background: 'transparent', border: 'none' }}
          >
            <div 
              style={{
                position: 'absolute',
                left: -6,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 8,
                height: 24,
                backgroundColor: isHovered ? '#CBD5E1' : 'transparent',
                borderRadius: 4,
                cursor: 'col-resize',
                zIndex: 100,
              }} 
            />
          </NodeResizeControl>
        </>
      )}
    </div>
  );
}

export default memo(MindMapNodeComponent);
