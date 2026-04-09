'use client';
// ============================================================
// EdgeToolbar — Popover near selected edge, same positioning
// pattern as StylePopover (absolute, anchored to canvas coords)
// ============================================================

import React, { useMemo } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { useMapStore } from '@/stores/useMapStore';
import { useI18n } from '@/stores/useLanguageStore';

type StrokeStyle = 'solid' | 'dashed' | 'dotted';
type EndMarker = 'arrow' | 'open-arrow' | 'none';
type PathType = 'smooth' | 'straight' | 'step' | 'curved';

const EDGE_COLORS = [
  '#0F172A', '#6366F1', '#EC4899', '#F59E0B',
  '#10B981', '#3B82F6', '#EF4444', '#8B5CF6',
];

const STROKE_WIDTHS: { label: string; value: number }[] = [
  { label: '—', value: 1.5 },
  { label: '━', value: 3 },
  { label: '▬', value: 5 },
];

const PATH_TYPES: { label: string; value: PathType }[] = [
  { label: '⌒', value: 'curved' },
  { label: '⤷', value: 'smooth' },
  { label: '→', value: 'straight' },
  { label: '⌐', value: 'step' },
];

const PANEL_WIDTH = 300;

function PanelButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="nodrag nopan"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '30px',
        height: '30px',
        padding: '0 7px',
        borderRadius: '7px',
        border: active ? '1.5px solid #6366F1' : '1px solid #E2E8F0',
        backgroundColor: active ? '#EEF2FF' : '#FFFFFF',
        color: active ? '#4F46E5' : '#475569',
        fontSize: '13px',
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        transition: 'all 0.12s ease',
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return (
    <div style={{ width: '100%', height: '1px', backgroundColor: '#F1F5F9', margin: '2px 0' }} />
  );
}

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: '10px',
      color: '#94A3B8',
      fontWeight: 600,
      width: '52px',
      flexShrink: 0,
      letterSpacing: '0.03em',
      textTransform: 'uppercase' as const,
    }}>
      {children}
    </span>
  );
}

interface EdgeToolbarProps {
  edgeId: string | null;
  onClose: () => void;
}

export default function EdgeToolbar({ edgeId, onClose }: EdgeToolbarProps) {
  const { t } = useI18n();
  const { mapData, updateCustomEdge, removeCustomEdge } = useMapStore();
  const { getNodes } = useReactFlow();
  const viewport = useViewport();

  // Compute screen position: midpoint between source and target nodes,
  // then place panel to the left of that midpoint (like StylePopover)
  const panelPosition = useMemo(() => {
    if (!edgeId || !mapData?.customEdges) return null;
    const edge = mapData.customEdges.find((e) => e.id === edgeId);
    if (!edge) return null;

    const rfNodes = getNodes();
    const sourceNode = rfNodes.find((n) => n.id === edge.source);
    const targetNode = rfNodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) return null;

    // Midpoint in flow coordinates
    const midFlowX = (sourceNode.position.x + targetNode.position.x) / 2;
    const midFlowY = (sourceNode.position.y + targetNode.position.y) / 2;

    // Convert to screen coordinates
    const screenX = midFlowX * viewport.zoom + viewport.x;
    const screenY = midFlowY * viewport.zoom + viewport.y;

    // Place panel to the LEFT of midpoint, like StylePopover
    // If midpoint is on the left half, place to the right instead
    const isLeftHalf = screenX < window.innerWidth / 2;
    const left = isLeftHalf
      ? screenX + 24
      : screenX - PANEL_WIDTH - 24;

    // Vertically: align to midpoint, clamped to stay on screen
    const panelHeight = 380; // approx
    const top = Math.max(60, Math.min(screenY - panelHeight / 2, window.innerHeight - panelHeight - 20));

    return { left, top };
  }, [edgeId, mapData, getNodes, viewport]);

  if (!edgeId || !mapData?.customEdges || !panelPosition) return null;

  const edge = mapData.customEdges.find((e) => e.id === edgeId);
  if (!edge) return null;

  const strokeColor: string = edge.strokeColor || '#0F172A';
  const strokeWidth: number = edge.strokeWidth || 2;
  const strokeStyle: StrokeStyle = (edge.strokeStyle as StrokeStyle) || 'solid';
  const pathType: PathType = (edge.pathType as PathType) || 'smooth';
  const endMarker: EndMarker = (edge.endMarker as EndMarker) ?? 'arrow';
  const startMarker: EndMarker = (edge.startMarker as EndMarker) ?? 'none';

  const update = (patch: Record<string, unknown>) => updateCustomEdge(edgeId, patch);

  const handleDelete = () => {
    removeCustomEdge(edgeId);
    onClose();
  };

  return (
    <div
      className="nodrag nopan"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: panelPosition.left,
        top: panelPosition.top,
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(148, 163, 184, 0.22)',
        borderRadius: '14px',
        boxShadow: '0 8px 32px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(0,0,0,0.03)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: `${PANEL_WIDTH}px`,
        zIndex: 2000,
        pointerEvents: 'all',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A', letterSpacing: '0.02em' }}>
          {t.editor.edgeToolbar.title}
        </span>
        <button
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '22px', height: '22px', borderRadius: '6px',
            border: 'none', backgroundColor: 'transparent',
            color: '#94A3B8', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: 0,
          }}
          title={t.common.close}
        >
          ×
        </button>
      </div>

      <Sep />

      {/* Color */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <RowLabel>{t.editor.edgeToolbar.color}</RowLabel>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {EDGE_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => update({ strokeColor: color })}
              title={color}
              style={{
                width: '20px', height: '20px', borderRadius: '50%',
                backgroundColor: color,
                border: strokeColor === color ? '2.5px solid #6366F1' : '1.5px solid rgba(0,0,0,0.1)',
                cursor: 'pointer', padding: 0, flexShrink: 0,
                transition: 'transform 0.1s ease',
                transform: strokeColor === color ? 'scale(1.18)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Width */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <RowLabel>{t.editor.edgeToolbar.thickness}</RowLabel>
        <div style={{ display: 'flex', gap: '4px' }}>
          {STROKE_WIDTHS.map(({ label, value }) => (
            <PanelButton key={value} active={strokeWidth === value} onClick={() => update({ strokeWidth: value })} title={`${value}px`}>
              {label}
            </PanelButton>
          ))}
        </div>
      </div>

      {/* Style */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <RowLabel>{t.editor.edgeToolbar.style}</RowLabel>
        <div style={{ display: 'flex', gap: '4px' }}>
          <PanelButton active={strokeStyle === 'solid'} onClick={() => update({ strokeStyle: 'solid' })} title={t.editor.edgeToolbar.solid}>——</PanelButton>
          <PanelButton active={strokeStyle === 'dashed'} onClick={() => update({ strokeStyle: 'dashed' })} title={t.editor.edgeToolbar.dashed}>- -</PanelButton>
          <PanelButton active={strokeStyle === 'dotted'} onClick={() => update({ strokeStyle: 'dotted' })} title={t.editor.edgeToolbar.dotted}>· ·</PanelButton>
        </div>
      </div>

      {/* Path type */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <RowLabel>{t.editor.edgeToolbar.line}</RowLabel>
        <div style={{ display: 'flex', gap: '4px' }}>
          {PATH_TYPES.map(({ label, value }) => (
            <PanelButton key={value} active={pathType === value} onClick={() => update({ pathType: value })} title={value}>
              {label}
            </PanelButton>
          ))}
        </div>
      </div>

      {/* Markers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <RowLabel>{t.editor.edgeToolbar.arrows}</RowLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#CBD5E1', width: '42px', flexShrink: 0 }}>{t.editor.edgeToolbar.start}</span>
            <PanelButton active={startMarker === 'none'} onClick={() => update({ startMarker: 'none' })} title={t.editor.edgeToolbar.noArrow}>○</PanelButton>
            <PanelButton active={startMarker === 'open-arrow'} onClick={() => update({ startMarker: 'open-arrow' })} title={t.editor.edgeToolbar.open}>{'<'}</PanelButton>
            <PanelButton active={startMarker === 'arrow'} onClick={() => update({ startMarker: 'arrow' })} title={t.editor.edgeToolbar.arrow}>◁</PanelButton>
          </div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#CBD5E1', width: '42px', flexShrink: 0 }}>{t.editor.edgeToolbar.end}</span>
            <PanelButton active={endMarker === 'none'} onClick={() => update({ endMarker: 'none' })} title={t.editor.edgeToolbar.noArrow}>○</PanelButton>
            <PanelButton active={endMarker === 'open-arrow'} onClick={() => update({ endMarker: 'open-arrow' })} title={t.editor.edgeToolbar.open}>{'>'}</PanelButton>
            <PanelButton active={endMarker === 'arrow'} onClick={() => update({ endMarker: 'arrow' })} title={t.editor.edgeToolbar.arrow}>▷</PanelButton>
          </div>
        </div>
      </div>

      <Sep />

      {/* Delete */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleDelete}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 12px', borderRadius: '8px', border: 'none',
            backgroundColor: '#FEF2F2', color: '#DC2626',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Trash2 size={12} />
          {t.editor.edgeToolbar.deleteLine}
        </button>
      </div>
    </div>
  );
}
