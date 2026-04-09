'use client';
// ============================================================
// MoreActionsPopover — Additional node actions
// ============================================================

import React, { useMemo } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { useUIStore } from '@/stores/useUIStore';
import { useMapStore } from '@/stores/useMapStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { Copy, Trash2, FileText } from 'lucide-react';
import { useI18n } from '@/stores/useLanguageStore';

export default function MoreActionsPopover() {
  const { t } = useI18n();
  const { selectedNodeIds, activePopover, setActivePopover, deselectAll } = useUIStore();
  const { mapData, deleteNode, addChild, addSibling } = useMapStore();
  const { pushState } = useHistoryStore();
  const { getNodes } = useReactFlow();
  const viewport = useViewport();

  const nodeId = selectedNodeIds[0];

  const popoverPosition = useMemo(() => {
    if (!nodeId) return null;
    const rfNodes = getNodes();
    const rfNode = rfNodes.find((n) => n.id === nodeId);
    if (!rfNode) return null;

    const x = rfNode.position.x * viewport.zoom + viewport.x;
    const y = rfNode.position.y * viewport.zoom + viewport.y;
    const width = (rfNode.width || 140) * viewport.zoom;
    
    const isLeftSide = rfNode.position.x < 0;
    
    return {
      left: isLeftSide ? x + width + 16 : x - 240 - 16,
      top: y,
    };
  }, [nodeId, getNodes, viewport]);

  if (activePopover !== 'more-actions' || !nodeId || !popoverPosition) return null;
  const node = mapData?.nodes[nodeId];
  if (!node) return null;

  const handleAction = (action: string) => {
    if (!mapData) return;
    pushState(mapData);

    switch (action) {
      case 'duplicate':
        addSibling(nodeId, false, node.text);
        break;
      case 'delete':
        deselectAll();
        deleteNode(nodeId);
        break;
      case 'add-child':
        addChild(nodeId);
        break;
      case 'add-sibling':
        if (node.parentId) addSibling(nodeId);
        break;
    }
    setActivePopover(null);
  };

  const actions = [
    { id: 'add-child', label: t.moreActions.addChild, icon: FileText, disabled: false },
    { id: 'add-sibling', label: t.moreActions.addSibling, icon: FileText, disabled: !node.parentId },
    { id: 'duplicate', label: t.moreActions.duplicate, icon: Copy, disabled: node.type === 'central' },
    { id: 'delete', label: t.moreActions.delete, icon: Trash2, disabled: node.type === 'central', danger: true },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: popoverPosition.top,
        left: popoverPosition.left,
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        padding: '16px',
        width: '240px',
        zIndex: 2000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => !action.disabled && handleAction(action.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '9px 12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: action.disabled ? 'default' : 'pointer',
            fontSize: '13px',
            fontWeight: 400,
            color: action.disabled
              ? '#CBD5E1'
              : (action as { danger?: boolean }).danger
              ? '#F43F5E'
              : '#334155',
            textAlign: 'left',
            transition: 'background-color 0.1s',
            opacity: action.disabled ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!action.disabled) (e.currentTarget as HTMLElement).style.backgroundColor = '#F8FAFC';
          }}
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
          }
        >
          <action.icon size={15} />
          {action.label}
        </button>
      ))}
    </div>
  );
}
