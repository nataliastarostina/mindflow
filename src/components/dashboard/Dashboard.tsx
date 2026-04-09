'use client';
// ============================================================
// Dashboard — Map list with create/open/delete
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAllMaps, createMap, deleteMap, duplicateMap, createDemoMap } from '@/lib/api';
import type { MapData } from '@/lib/types';
import { Plus, Trash2, Copy, MoreHorizontal, Clock, Map } from 'lucide-react';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { formatTopicsCount } from '@/lib/i18n';
import { useI18n } from '@/stores/useLanguageStore';

export default function Dashboard() {
  const router = useRouter();
  const { language, locale, t } = useI18n();
  const [maps, setMaps] = useState<MapData[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const refreshMaps = useCallback(() => {
    setMaps(getAllMaps());
    setLoaded(true);
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(refreshMaps);
    return () => window.cancelAnimationFrame(frameId);
  }, [refreshMaps]);

  const handleCreate = () => {
    const map = createMap(undefined, language);
    router.push(`/editor/${map.id}`);
  };

  const handleCreateDemo = () => {
    const map = createDemoMap(language);
    router.push(`/editor/${map.id}`);
  };

  const handleOpen = (id: string) => {
    router.push(`/editor/${id}`);
  };

  const handleDelete = (id: string) => {
    deleteMap(id);
    refreshMaps();
    setActiveMenu(null);
  };

  const handleDuplicate = (id: string) => {
    const newMap = duplicateMap(id, language);
    if (newMap) refreshMaps();
    setActiveMenu(null);
  };

  if (!loaded) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#FAFBFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94A3B8',
        fontFamily: "'Inter', sans-serif",
      }}>
        {t.common.loading}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FAFBFC',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 40px',
          borderBottom: '1px solid #F1F5F9',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              fontSize: '18px',
              fontWeight: 700,
            }}
          >
            M
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B', margin: 0 }}>
            MindFlow
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LanguageSwitcher />
          <button
            onClick={handleCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#6366F1',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#4F46E5')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#6366F1')}
          >
            <Plus size={18} />
            {t.dashboard.newMap}
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px' }}>
        {maps.length === 0 ? (
          /* Empty state */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 40px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
              }}
            >
              <Map size={36} style={{ color: '#6366F1' }} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 600, color: '#1E293B', marginBottom: '8px' }}>
              {t.dashboard.noMapsYet}
            </h2>
            <p style={{ fontSize: '15px', color: '#64748B', marginBottom: '28px', maxWidth: '400px', lineHeight: '1.6' }}>
              {t.dashboard.emptyDescription}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCreate}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#6366F1',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t.dashboard.createBlankMap}
              </button>
              <button
                onClick={handleCreateDemo}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {t.dashboard.tryDemoMap}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B', marginBottom: '20px' }}>
              {t.dashboard.recentMaps}
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {/* Create new card */}
              <button
                onClick={handleCreate}
                style={{
                  padding: '24px',
                  borderRadius: '14px',
                  border: '2px dashed #E2E8F0',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  minHeight: '140px',
                  transition: 'all 0.15s',
                  color: '#94A3B8',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#6366F1';
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFAFE';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0';
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                <Plus size={24} />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{t.dashboard.newMap}</span>
              </button>

              {/* Map cards */}
              {maps.map((map) => (
                <div
                  key={map.id}
                  onClick={() => handleOpen(map.id)}
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    border: '1px solid #F1F5F9',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    minHeight: '140px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1E293B', marginBottom: '6px', margin: 0 }}>
                      {map.title}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: '6px 0 0' }}>
                      {formatTopicsCount(Object.keys(map.nodes).length, language)}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#CBD5E1' }}>
                      <Clock size={11} />
                      {new Date(map.updatedAt).toLocaleDateString(locale)}
                    </span>

                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === map.id ? null : map.id);
                        }}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94A3B8',
                        }}
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {activeMenu === map.id && (
                        <div
                          style={{
                            position: 'absolute',
                            right: 0,
                            bottom: '32px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '10px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                            padding: '4px',
                            minWidth: '140px',
                            zIndex: 50,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleDuplicate(map.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px',
                              width: '100%', padding: '8px 12px', borderRadius: '6px',
                              border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                              fontSize: '13px', color: '#334155', textAlign: 'left',
                            }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#F8FAFC')}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
                          >
                            <Copy size={14} /> {t.common.duplicate}
                          </button>
                          <button
                            onClick={() => handleDelete(map.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px',
                              width: '100%', padding: '8px 12px', borderRadius: '6px',
                              border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                              fontSize: '13px', color: '#F43F5E', textAlign: 'left',
                            }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#FFF1F2')}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
                          >
                            <Trash2 size={14} /> {t.common.delete}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
