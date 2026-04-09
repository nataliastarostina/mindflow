'use client';
// ============================================================
// StylePopover — Shape, color, and border controls
// ============================================================

import React, { useState, useMemo } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { useUIStore } from '@/stores/useUIStore';
import { useMapStore } from '@/stores/useMapStore';
import { THEME_COLORS, SHAPE_PRESETS, BRANCH_COLORS } from '@/lib/constants';
import { X } from 'lucide-react';
import type { NodeShape } from '@/lib/types';
import { getShapeLabel } from '@/lib/i18n';
import { useI18n } from '@/stores/useLanguageStore';

type Tab = 'shape' | 'border' | 'line';

export default function StylePopover() {
  const { language, t } = useI18n();
  const { selectedNodeIds, activePopover, setActivePopover } = useUIStore();
  const { mapData, updateNodeStyle } = useMapStore();
  const [activeTab, setActiveTab] = useState<Tab>('shape');
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
    
    // Position to the left or right of the node
    const isLeftSide = rfNode.position.x < 0;
    
    return {
      left: isLeftSide ? x + width + 16 : x - 300 - 16,
      top: y,
    };
  }, [nodeId, getNodes, viewport]);

  if (activePopover !== 'shape' || !nodeId || !popoverPosition) return null;
  const node = mapData?.nodes[nodeId];
  if (!node) return null;

  const handleClose = () => setActivePopover(null);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'shape', label: t.stylePopover.tabs.shape },
    { id: 'border', label: t.stylePopover.tabs.border },
    { id: 'line', label: t.stylePopover.tabs.line },
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
        width: '300px',
        zIndex: 2000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{t.stylePopover.title}</span>
        <button onClick={handleClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px', color: '#94A3B8' }}>
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '14px', backgroundColor: '#F1F5F9', borderRadius: '8px', padding: '3px' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              backgroundColor: activeTab === tab.id ? '#FFFFFF' : 'transparent',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              color: activeTab === tab.id ? '#1E293B' : '#64748B',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Shape tab */}
      {activeTab === 'shape' && (
        <div>
          <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>{t.stylePopover.shape}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '14px' }}>
            {SHAPE_PRESETS.map((shape) => (
              <button
                key={shape.id}
                onClick={() => updateNodeStyle(nodeId, { shape: shape.id as NodeShape })}
                style={{
                  padding: '8px 6px',
                  borderRadius: '8px',
                  border: node.shape === shape.id ? '2px solid #6366F1' : '1px solid #E2E8F0',
                  backgroundColor: node.shape === shape.id ? '#EEF2FF' : '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '10px',
                  color: '#334155',
                  fontWeight: 500,
                  transition: 'all 0.1s',
                }}
              >
                {getShapeLabel(shape.id as NodeShape, language)}
              </button>
            ))}
          </div>

          <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>{t.stylePopover.fillColor}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {THEME_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => updateNodeStyle(nodeId, { fillColor: color, textColor: isLightColor(color) ? '#1E293B' : '#FFFFFF' })}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  border: node.fillColor === color ? '2px solid #1E293B' : '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: color,
                  cursor: 'pointer',
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.transform = 'scale(1.15)')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.transform = 'scale(1)')}
              />
            ))}
          </div>
        </div>
      )}

      {/* Border tab */}
      {activeTab === 'border' && (
        <div>
          <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>{t.stylePopover.borderWidth}</label>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            {[
              { label: t.stylePopover.borderWidths.none, value: 0 },
              { label: t.stylePopover.borderWidths.thin, value: 1 },
              { label: t.stylePopover.borderWidths.medium, value: 2 },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => updateNodeStyle(nodeId, { borderWidth: opt.value, borderStyle: opt.value > 0 ? 'solid' : 'none' })}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: (node.borderWidth || 0) === opt.value ? '2px solid #6366F1' : '1px solid #E2E8F0',
                  backgroundColor: (node.borderWidth || 0) === opt.value ? '#EEF2FF' : '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#334155',
                  fontWeight: 500,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>{t.stylePopover.borderStyle}</label>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            {[
              { value: 'solid', label: t.stylePopover.lineStyles.solid },
              { value: 'dashed', label: t.stylePopover.lineStyles.dashed },
            ].map((style) => (
              <button
                key={style.value}
                onClick={() => updateNodeStyle(nodeId, { borderStyle: style.value as 'solid' | 'dashed' })}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: node.borderStyle === style.value ? '2px solid #6366F1' : '1px solid #E2E8F0',
                  backgroundColor: node.borderStyle === style.value ? '#EEF2FF' : '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#334155',
                  fontWeight: 500,
                }}
              >
                {style.label}
              </button>
            ))}
          </div>

          <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>{t.stylePopover.borderColor}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {THEME_COLORS.slice(0, 20).map((color) => (
              <button
                key={color}
                onClick={() => updateNodeStyle(nodeId, { borderColor: color })}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  border: node.borderColor === color ? '2px solid #1E293B' : '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: color,
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Line tab */}
      {activeTab === 'line' && (
        <div>
          <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>{t.stylePopover.branchColor}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {BRANCH_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => updateNodeStyle(nodeId, { lineColor: color })}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  border: node.lineColor === color ? '2px solid #1E293B' : '2px solid transparent',
                  backgroundColor: color,
                  cursor: 'pointer',
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.transform = 'scale(1.15)')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.transform = 'scale(1)')}
              />
            ))}
          </div>

          <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>{t.stylePopover.thickness}</label>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            {[1, 1.5, 2, 3].map((w) => (
              <button
                key={w}
                onClick={() => updateNodeStyle(nodeId, { lineWidth: w })}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: '8px',
                  border: (node.lineWidth || 2) === w ? '2px solid #6366F1' : '1px solid #E2E8F0',
                  backgroundColor: (node.lineWidth || 2) === w ? '#EEF2FF' : '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ width: '24px', height: `${w}px`, backgroundColor: node.lineColor || '#94A3B8', borderRadius: '2px' }} />
              </button>
            ))}
          </div>

          <label style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>{t.stylePopover.lineStyle}</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { label: t.stylePopover.lineStyles.solid, value: 'solid' },
              { label: t.stylePopover.lineStyles.dashed, value: 'dashed' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateNodeStyle(nodeId, { lineStyle: opt.value as 'solid' | 'dashed' })}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: (node.lineStyle || 'solid') === opt.value ? '2px solid #6366F1' : '1px solid #E2E8F0',
                  backgroundColor: (node.lineStyle || 'solid') === opt.value ? '#EEF2FF' : '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#334155',
                  fontWeight: 500,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6;
}
