'use client';
// ============================================================
// TextStylePopover — Typography controls
// ============================================================

import React, { useMemo } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { useUIStore } from '@/stores/useUIStore';
import { useMapStore } from '@/stores/useMapStore';
import { FONT_PRESETS, THEME_COLORS } from '@/lib/constants';
import { Bold, Italic, Underline, X, Minus, Plus } from 'lucide-react';
import { getFontPresetLabel } from '@/lib/i18n';
import { useI18n } from '@/stores/useLanguageStore';

export default function TextStylePopover() {
  const { language, t } = useI18n();
  const { selectedNodeIds, activePopover, setActivePopover } = useUIStore();
  const { mapData, updateNodeStyle } = useMapStore();
  const { getNodes } = useReactFlow();
  const viewport = useViewport();

  const nodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;

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
      left: isLeftSide ? x + width + 16 : x - 280 - 16,
      top: y,
    };
  }, [nodeId, getNodes, viewport]);

  if (activePopover !== 'text-style' || !nodeId || !popoverPosition) return null;
  const node = mapData?.nodes[nodeId];
  if (!node) return null;

  const handleClose = () => setActivePopover(null);
  const currentSize = node.fontSize || 14;

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
        width: '280px',
        zIndex: 2000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{t.textStylePopover.title}</span>
        <button onClick={handleClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px', color: '#94A3B8' }}>
          <X size={16} />
        </button>
      </div>

      {/* Presets */}
      <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>{t.textStylePopover.presets}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '14px' }}>
        {FONT_PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => updateNodeStyle(nodeId, { fontSize: preset.fontSize, fontWeight: preset.fontWeight })}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: node.fontSize === preset.fontSize && node.fontWeight === preset.fontWeight ? '#F1F5F9' : 'transparent',
              cursor: 'pointer',
              fontSize: `${preset.fontSize}px`,
              fontWeight: preset.fontWeight === 'bold' ? 700 : preset.fontWeight === 'semibold' ? 600 : preset.fontWeight === 'medium' ? 500 : 400,
              color: '#334155',
              textAlign: 'left',
              transition: 'background-color 0.1s',
            }}
          >
            {getFontPresetLabel(preset.name as 'Title' | 'Section' | 'Standard' | 'Muted' | 'Emphasis', language)}
          </button>
        ))}
      </div>

      {/* Format Controls */}
      <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>{t.textStylePopover.format}</label>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
        <button
          onClick={() => updateNodeStyle(nodeId, { fontWeight: node.fontWeight === 'bold' ? 'regular' : 'bold' })}
          style={{
            width: '36px', height: '36px', borderRadius: '8px',
            border: node.fontWeight === 'bold' ? '2px solid #6366F1' : '1px solid #E2E8F0',
            backgroundColor: node.fontWeight === 'bold' ? '#EEF2FF' : '#FFFFFF',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#334155',
          }}
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => updateNodeStyle(nodeId, { fontStyle: node.fontStyle === 'italic' ? 'normal' : 'italic' })}
          style={{
            width: '36px', height: '36px', borderRadius: '8px',
            border: node.fontStyle === 'italic' ? '2px solid #6366F1' : '1px solid #E2E8F0',
            backgroundColor: node.fontStyle === 'italic' ? '#EEF2FF' : '#FFFFFF',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#334155',
          }}
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => updateNodeStyle(nodeId, { textDecoration: node.textDecoration === 'underline' ? 'none' : 'underline' })}
          style={{
            width: '36px', height: '36px', borderRadius: '8px',
            border: node.textDecoration === 'underline' ? '2px solid #6366F1' : '1px solid #E2E8F0',
            backgroundColor: node.textDecoration === 'underline' ? '#EEF2FF' : '#FFFFFF',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#334155',
          }}
        >
          <Underline size={16} />
        </button>

        <div style={{ flex: 1 }} />

        {/* Font size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 4px' }}>
          <button
            onClick={() => updateNodeStyle(nodeId, { fontSize: Math.max(10, currentSize - 1) })}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#64748B', display: 'flex', alignItems: 'center' }}
          >
            <Minus size={12} />
          </button>
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#334155', minWidth: '20px', textAlign: 'center' }}>{currentSize}</span>
          <button
            onClick={() => updateNodeStyle(nodeId, { fontSize: Math.min(32, currentSize + 1) })}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#64748B', display: 'flex', alignItems: 'center' }}
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Text Color */}
      <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>{t.textStylePopover.textColor}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {THEME_COLORS.slice(0, 20).map((color) => (
          <button
            key={color}
            onClick={() => updateNodeStyle(nodeId, { textColor: color })}
            style={{
              width: '24px', height: '24px', borderRadius: '6px',
              border: node.textColor === color ? '2px solid #1E293B' : '1px solid rgba(0,0,0,0.08)',
              backgroundColor: color, cursor: 'pointer',
            }}
          />
        ))}
      </div>
    </div>
  );
}
