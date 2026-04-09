'use client';
// ============================================================
// ContextualToolbar — Floating toolbar near selected node
// ============================================================

import React, { useMemo } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { useUIStore } from '@/stores/useUIStore';
import { useMapStore } from '@/stores/useMapStore';
import {
  Palette,
  Type,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  FileText,
  Cable,
} from 'lucide-react';
import { useI18n } from '@/stores/useLanguageStore';

export default function ContextualToolbar() {
  const { t } = useI18n();
  const {
    selectedNodeIds,
    editingNodeId,
    activePopover,
    isConnectingMode,
    connectingNodeId,
    setActivePopover,
    setConnectingMode,
  } = useUIStore();
  const { mapData, addChild } = useMapStore();
  const { getNodes } = useReactFlow();
  const viewport = useViewport();

  const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;

  // Calculate toolbar position
  const toolbarPosition = useMemo(() => {
    if (!selectedNodeId || editingNodeId) return null;

    const rfNodes = getNodes();
    const rfNode = rfNodes.find((n) => n.id === selectedNodeId);
    if (!rfNode) return null;

    // Transform node position to screen coordinates
    const x = rfNode.position.x * viewport.zoom + viewport.x;
    const y = rfNode.position.y * viewport.zoom + viewport.y;
    const width = (rfNode.width || 140) * viewport.zoom;
    // Position above the node
    return {
      left: x + width / 2,
      top: y - 12,
    };
  }, [selectedNodeId, editingNodeId, getNodes, viewport]);

  if (!toolbarPosition || !selectedNodeId || editingNodeId) return null;

  const node = mapData?.nodes[selectedNodeId];
  if (!node) return null;

  const handleAction = (action: string) => {
    switch (action) {
      case 'style':
        setActivePopover(activePopover === 'shape' ? null : 'shape');
        break;
      case 'text':
        setActivePopover(activePopover === 'text-style' ? null : 'text-style');
        break;
      case 'link':
        setActivePopover(activePopover === 'link' ? null : 'link');
        break;
      case 'comment':
        setActivePopover(activePopover === 'comment' ? null : 'comment');
        break;
      case 'note':
        setActivePopover(activePopover === 'note' ? null : 'note');
        break;
      case 'connector': {
        const shouldEnable = !(isConnectingMode && connectingNodeId === selectedNodeId);
        setConnectingMode(shouldEnable, shouldEnable ? selectedNodeId : null);
        break;
      }
      case 'more':
        setActivePopover(activePopover === 'more-actions' ? null : 'more-actions');
        break;
      case 'add-child':
        addChild(selectedNodeId);
        break;
    }
  };

  const tools = [
    { id: 'style', icon: Palette, label: t.editor.contextualToolbar.style },
    { id: 'text', icon: Type, label: t.editor.contextualToolbar.text },
    { id: 'link', icon: Link2, label: t.editor.contextualToolbar.link },
    { id: 'comment', icon: MessageSquare, label: t.editor.contextualToolbar.comment },
    { id: 'note', icon: FileText, label: t.editor.contextualToolbar.richText },
    { id: 'connector', icon: Cable, label: t.editor.contextualToolbar.connector },
    { id: 'add-child', icon: Plus, label: t.editor.contextualToolbar.addChild },
    { id: 'more', icon: MoreHorizontal, label: t.editor.contextualToolbar.more },
  ];

  return (
    <div
      className="contextual-toolbar"
      style={{
        position: 'absolute',
        left: toolbarPosition.left,
        top: toolbarPosition.top,
        transform: 'translate(-50%, -100%)',
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        padding: '4px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)',
        zIndex: 1000,
        pointerEvents: 'all',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => handleAction(tool.id)}
          title={tool.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '7px',
            border: 'none',
            backgroundColor:
              (tool.id === 'style' && activePopover === 'shape') ||
              (tool.id === 'text' && activePopover === 'text-style') ||
              (tool.id === 'link' && activePopover === 'link') ||
              (tool.id === 'comment' && activePopover === 'comment') ||
              (tool.id === 'note' && activePopover === 'note') ||
              (tool.id === 'connector' && isConnectingMode && connectingNodeId === selectedNodeId) ||
              (tool.id === 'more' && activePopover === 'more-actions')
                ? '#F1F5F9'
                : 'transparent',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
            color: '#475569',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.backgroundColor = '#F1F5F9';
          }}
          onMouseLeave={(e) => {
            const isActive =
              (tool.id === 'style' && activePopover === 'shape') ||
              (tool.id === 'text' && activePopover === 'text-style') ||
              (tool.id === 'connector' && isConnectingMode && connectingNodeId === selectedNodeId) ||
              (tool.id === 'more' && activePopover === 'more-actions') ||
              (tool.id === 'link' && activePopover === 'link') ||
              (tool.id === 'comment' && activePopover === 'comment') ||
              (tool.id === 'note' && activePopover === 'note');
            if (!isActive) {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
            }
          }}
        >
          <tool.icon size={16} />
        </button>
      ))}
    </div>
  );
}
