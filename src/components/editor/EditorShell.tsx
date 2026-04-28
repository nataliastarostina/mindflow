'use client';
// ============================================================
// EditorShell — Full editor layout orchestrator
// ============================================================

import React, { useEffect, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import Canvas from './Canvas';
import TopLeftBar from './TopLeftBar';
import TopRightBar from './TopRightBar';
import RightToolbar from './RightToolbar';
import BottomLeftBar from './BottomLeftBar';
import StylePopover from '@/components/popovers/StylePopover';
import TextStylePopover from '@/components/popovers/TextStylePopover';
import LinkPopover from '@/components/popovers/LinkPopover';
import CommentPopover from '@/components/popovers/CommentPopover';
import NotePopover from '@/components/popovers/NotePopover';
import MoreActionsPopover from '@/components/popovers/MoreActionsPopover';
import ExportModal from '@/components/modals/ExportModal';
import ShareModal from '@/components/modals/ShareModal';
import { useMapStore } from '@/stores/useMapStore';
import { useUIStore } from '@/stores/useUIStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { AUTOSAVE_DEBOUNCE_MS } from '@/lib/constants';
import type { MapData } from '@/lib/types';
import { useI18n } from '@/stores/useLanguageStore';

interface EditorShellProps {
  initialMap: MapData;
  shareSlug?: string | null;
}

export default function EditorShell({ initialMap, shareSlug = null }: EditorShellProps) {
  const { t } = useI18n();
  const { loadMap, mapData, persist } = useMapStore();
  const { setActivePopover } = useUIStore();
  const { pushState } = useHistoryStore();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load map on mount
  useEffect(() => {
    loadMap(initialMap, { shareSlug });
    pushState(initialMap);
  }, [initialMap, shareSlug, loadMap, pushState]);

  // Autosave
  useEffect(() => {
    if (!mapData) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persist();
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [mapData, persist]);

  // Save on blur
  useEffect(() => {
    const handleBlur = () => persist();
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [persist]);

  // Save synchronously before the tab goes away (refresh, close, nav).
  // Without this a refresh within the autosave debounce window loses edits.
  useEffect(() => {
    const flush = () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      persist();
    };
    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    return () => {
      window.removeEventListener('beforeunload', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, [persist]);

  // Close popovers on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePopover(null);
        useUIStore.getState().setActiveModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActivePopover]);

  if (!mapData) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFBFC',
        color: '#94A3B8',
        fontSize: '14px',
      }}>
        {t.editor.loadingMap}
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div
        style={{
          width: '100vw',
          height: '100vh',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Canvas Layer */}
        <Canvas />

        {/* UI Overlay Layers */}
        <TopLeftBar />
        <TopRightBar />
        <RightToolbar />
        <BottomLeftBar />

        {/* Popover Layer */}
        <StylePopover />
        <TextStylePopover />
        <LinkPopover />
        <CommentPopover />
        <NotePopover />
        <MoreActionsPopover />

        {/* Modal Layer */}
        <ExportModal />
        <ShareModal />

        {/* Save indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '16px',
            fontSize: '11px',
            color: '#CBD5E1',
            zIndex: 50,
          }}
        >
          {t.editor.autoSaved}
        </div>
      </div>
    </ReactFlowProvider>
  );
}
