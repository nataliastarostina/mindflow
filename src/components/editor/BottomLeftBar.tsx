'use client';
// ============================================================
// BottomLeftBar — Zoom, fit, center controls
// ============================================================

import React from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { Maximize2, Focus, Minus, Plus, Map } from 'lucide-react';
import { useMapStore } from '@/stores/useMapStore';
import { getLayoutModeLabel } from '@/lib/i18n';
import { useI18n } from '@/stores/useLanguageStore';

export default function BottomLeftBar() {
  const { language, t } = useI18n();
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();
  const viewport = useViewport();
  const mapData = useMapStore((s) => s.mapData);

  const zoomPercent = Math.round(viewport.zoom * 100);

  const handleFit = () => {
    fitView({ padding: 0.3, duration: 250 });
  };

  const handleCenter = () => {
    // Center on root node
    if (mapData) {
      const rootNode = mapData.nodes[mapData.rootNodeId];
      if (rootNode) {
        setCenter(0, 0, { duration: 250, zoom: viewport.zoom });
      }
    }
  };

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: '#475569',
    transition: 'background-color 0.15s',
    padding: '0 8px',
    fontSize: '12px',
    fontWeight: 500,
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        height: '42px',
        padding: '0 6px',
        backgroundColor: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderRadius: '12px',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
      }}
    >
      {/* Layout mode badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '0 8px',
          height: '32px',
          fontSize: '11px',
          fontWeight: 500,
          color: '#64748B',
        }}
      >
        <Map size={13} />
        {getLayoutModeLabel(mapData?.layoutMode, language)}
      </div>

      <div style={{ width: '1px', height: '18px', backgroundColor: '#E2E8F0' }} />

      {/* Zoom controls */}
      <button
        onClick={() => zoomOut({ duration: 200 })}
        style={btnStyle}
        title={t.editor.zoomOut}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = '#F1F5F9')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
        }
      >
        <Minus size={14} />
      </button>

      <span
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: '#64748B',
          minWidth: '40px',
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {zoomPercent}%
      </span>

      <button
        onClick={() => zoomIn({ duration: 200 })}
        style={btnStyle}
        title={t.editor.zoomIn}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = '#F1F5F9')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
        }
      >
        <Plus size={14} />
      </button>

      <div style={{ width: '1px', height: '18px', backgroundColor: '#E2E8F0' }} />

      {/* Fit & Center */}
      <button
        onClick={handleFit}
        style={btnStyle}
        title={t.editor.fitToScreen}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = '#F1F5F9')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
        }
      >
        <Maximize2 size={14} />
      </button>

      <button
        onClick={handleCenter}
        style={btnStyle}
        title={t.editor.centerMap}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = '#F1F5F9')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
        }
      >
        <Focus size={14} />
      </button>
    </div>
  );
}
