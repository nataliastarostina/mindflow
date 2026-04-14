'use client';
// ============================================================
// RightToolbar — Vertical floating tool panel
// ============================================================

import React, { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useMapStore } from '@/stores/useMapStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import {
  ZoomIn,
  ZoomOut,
  LayoutGrid,
  Undo2,
  Redo2,
} from 'lucide-react';
import type { LayoutMode } from '@/lib/types';
import { getLayoutModeLabel } from '@/lib/i18n';
import { useI18n } from '@/stores/useLanguageStore';

export default function RightToolbar() {
  const { language, t } = useI18n();
  const { zoomIn, zoomOut } = useReactFlow();
  const { mapData, setLayoutMode } = useMapStore();
  const { canUndo, canRedo, undo, redo } = useHistoryStore();
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const layoutOptions: { mode: LayoutMode; label: string; icon: string }[] = [
    { mode: 'radial', label: getLayoutModeLabel('radial', language), icon: '🔄' },
    { mode: 'right-tree', label: getLayoutModeLabel('right-tree', language), icon: '➡️' },
    { mode: 'top-down', label: getLayoutModeLabel('top-down', language), icon: '📊' },
    { mode: 'list', label: getLayoutModeLabel('list', language), icon: '📋' },
  ];

  const handleUndo = () => {
    const data = undo();
    if (data) useMapStore.getState().loadMap(data);
  };

  const handleRedo = () => {
    const data = redo();
    if (data) useMapStore.getState().loadMap(data);
  };

  const handleLayoutChange = (mode: LayoutMode) => {
    setLayoutMode(mode);
    setShowLayoutMenu(false);
  };

  const toolBtnStyle: React.CSSProperties = {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#475569',
    transition: 'all 0.15s ease',
    position: 'relative',
  };

  const disabledStyle: React.CSSProperties = {
    opacity: 0.35,
    cursor: 'default',
  };

  return (
    <div
      style={{
        position: 'absolute',
        right: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '6px',
        backgroundColor: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderRadius: '14px',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
      }}
    >
      <button
        onClick={() => zoomIn({ duration: 200 })}
        style={toolBtnStyle}
        title={t.editor.zoomIn}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = '#F1F5F9')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
        }
      >
        <ZoomIn size={18} />
      </button>

      <button
        onClick={() => zoomOut({ duration: 200 })}
        style={toolBtnStyle}
        title={t.editor.zoomOut}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = '#F1F5F9')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
        }
      >
        <ZoomOut size={18} />
      </button>

      <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '4px 6px' }} />

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowLayoutMenu(!showLayoutMenu)}
          style={{
            ...toolBtnStyle,
            backgroundColor: showLayoutMenu ? '#F1F5F9' : 'transparent',
          }}
          title={t.editor.layoutMode}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = '#F1F5F9')
          }
          onMouseLeave={(e) => {
            if (!showLayoutMenu) {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }
          }}
        >
          <LayoutGrid size={18} />
        </button>

        {showLayoutMenu && (
          <div
            style={{
              position: 'absolute',
              right: '48px',
              top: '0',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
              padding: '6px',
              minWidth: '160px',
              zIndex: 200,
            }}
          >
            {layoutOptions.map((opt) => (
              <button
                key={opt.mode}
                onClick={() => handleLayoutChange(opt.mode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  backgroundColor:
                    mapData?.layoutMode === opt.mode ? '#F1F5F9' : 'transparent',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: mapData?.layoutMode === opt.mode ? 600 : 400,
                  transition: 'background-color 0.1s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor = '#F8FAFC')
                }
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    mapData?.layoutMode === opt.mode ? '#F1F5F9' : 'transparent';
                }}
              >
                <span>{opt.icon}</span>
                <span style={{ flex: 1 }}>{opt.label}</span>
                {mapData?.layoutMode === opt.mode && (
                  <span style={{ fontSize: '14px', color: '#334155' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '4px 6px' }} />

      <button
        onClick={canUndo ? handleUndo : undefined}
        style={{ ...toolBtnStyle, ...(canUndo ? {} : disabledStyle) }}
        title={t.editor.undo}
        onMouseEnter={(e) => {
          if (canUndo) (e.currentTarget as HTMLElement).style.backgroundColor = '#F1F5F9';
        }}
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
        }
      >
        <Undo2 size={18} />
      </button>

      <button
        onClick={canRedo ? handleRedo : undefined}
        style={{ ...toolBtnStyle, ...(canRedo ? {} : disabledStyle) }}
        title={t.editor.redo}
        onMouseEnter={(e) => {
          if (canRedo) (e.currentTarget as HTMLElement).style.backgroundColor = '#F1F5F9';
        }}
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
        }
      >
        <Redo2 size={18} />
      </button>
    </div>
  );
}
