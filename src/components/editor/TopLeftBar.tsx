'use client';
// ============================================================
// TopLeftBar — Map title, search, actions
// ============================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useMapStore } from '@/stores/useMapStore';
import { useUIStore } from '@/stores/useUIStore';
import { ChevronDown, Search, X } from 'lucide-react';

import Link from 'next/link';
import { useI18n } from '@/stores/useLanguageStore';

export default function TopLeftBar() {
  const { t } = useI18n();
  const { mapData, setTitle } = useMapStore();
  const { searchOpen, searchQuery, setSearchQuery, toggleSearch } = useUIStore();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  const handleTitleClick = useCallback(() => {
    setIsEditingTitle(true);
    setTitleDraft(mapData?.title || '');
  }, [mapData?.title]);

  useEffect(() => {
    if (isEditingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [isEditingTitle]);

  const commitTitle = useCallback(() => {
    if (titleDraft.trim()) {
      setTitle(titleDraft.trim());
    }
    setIsEditingTitle(false);
  }, [titleDraft, setTitle]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        height: '48px',
        padding: '0 20px',
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: 100,
        backgroundColor: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderRadius: '12px',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFF',
          fontSize: '14px',
          fontWeight: 700,
          flexShrink: 0,
          textDecoration: 'none',
        }}
        title={t.editor.backToDashboard}
      >
        M
      </Link>

      {/* Title */}
      {isEditingTitle ? (
        <input
          ref={titleRef}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitTitle();
            if (e.key === 'Escape') setIsEditingTitle(false);
          }}
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#1E293B',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            width: '200px',
            padding: '2px 4px',
            borderRadius: '4px',
          }}
        />
      ) : (
        <button
          onClick={handleTitleClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#1E293B',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: '4px',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) =>
            ((e.target as HTMLElement).style.backgroundColor = '#F1F5F9')
          }
          onMouseLeave={(e) =>
            ((e.target as HTMLElement).style.backgroundColor = 'transparent')
          }
        >
          {mapData?.title || t.common.untitled}
          <ChevronDown size={14} style={{ opacity: 0.4 }} />
        </button>
      )}

      {/* Divider */}
      <div
        style={{
          width: '1px',
          height: '20px',
          backgroundColor: '#E2E8F0',
          margin: '0 4px',
        }}
      />

      {/* Search */}
      {searchOpen ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Search size={14} style={{ color: '#94A3B8' }} />
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.editor.searchPlaceholder}
            style={{
              fontSize: '13px',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              width: '160px',
              color: '#334155',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') toggleSearch();
            }}
          />
          <button
            onClick={toggleSearch}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#94A3B8',
            }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={toggleSearch}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#94A3B8',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) =>
            ((e.target as HTMLElement).style.backgroundColor = '#F1F5F9')
          }
          onMouseLeave={(e) =>
            ((e.target as HTMLElement).style.backgroundColor = 'transparent')
          }
          title={t.editor.search}
        >
          <Search size={16} />
        </button>
      )}
    </div>
  );
}
