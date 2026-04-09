'use client';
// ============================================================
// LinkPopover — Add/edit URL links
// ============================================================

import React, { useRef, useState, useMemo } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { useUIStore } from '@/stores/useUIStore';
import { useMapStore } from '@/stores/useMapStore';
import { isValidUrl } from '@/lib/utils';
import { X, ExternalLink, Trash2 } from 'lucide-react';
import { useI18n } from '@/stores/useLanguageStore';

export default function LinkPopover() {
  const { t } = useI18n();
  const { selectedNodeIds, activePopover, setActivePopover } = useUIStore();
  const { mapData, setNodeLink } = useMapStore();
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
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
      left: isLeftSide ? x + width + 16 : x - 320 - 16,
      top: y,
    };
  }, [nodeId, getNodes, viewport]);

  if (activePopover !== 'link' || !nodeId || !popoverPosition) return null;
  const node = mapData?.nodes[nodeId];
  if (!node) return null;

  const handleAdd = () => {
    const url = inputRef.current?.value?.trim() || '';
    if (!url.trim()) return;
    if (!isValidUrl(url)) {
      setError(t.linkPopover.invalidUrl);
      return;
    }
    setNodeLink(nodeId, { url });
    setActivePopover(null);
  };

  const handleRemove = () => {
    setNodeLink(nodeId, null);
    setActivePopover(null);
  };

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
        width: '320px',
        zIndex: 2000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{t.linkPopover.title}</span>
        <button onClick={() => setActivePopover(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}>
          <X size={16} />
        </button>
      </div>

      <input
        ref={inputRef}
        defaultValue={node.link?.url || ''}
        onChange={() => setError('')}
        placeholder="https://example.com"
        onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: '8px',
          border: error ? '1px solid #F43F5E' : '1px solid #E2E8F0',
          fontSize: '13px',
          color: '#334155',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
        autoFocus
      />
      {error && <span style={{ fontSize: '11px', color: '#F43F5E', marginTop: '4px', display: 'block' }}>{error}</span>}

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button
          onClick={handleAdd}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#6366F1',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <ExternalLink size={14} />
          {node.link ? t.common.update : t.linkPopover.addLink}
        </button>
        {node.link && (
          <button
            onClick={handleRemove}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#F43F5E',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
