'use client';
// ============================================================
// ExportModal — High-quality PNG/PDF/MD export of full mind map
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { useMapStore } from '@/stores/useMapStore';
import { useReactFlow, getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { X, FileImage, AlignLeft, Image as ImageIcon, FileText } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { useI18n } from '@/stores/useLanguageStore';
import {
  isGoogleAccessDeniedError,
  preloadGoogleDocsAccess,
  requestGoogleDocsAccessToken,
} from '@/lib/googleIdentity';
import { exportMindMapToGoogleDocs } from '@/lib/googleDocsExport';
import type { MindMapNode } from '@/lib/types';

type ExportFormat = 'png' | 'pdf' | 'markdown' | 'google-docs';

function compareNodes(a: MindMapNode, b: MindMapNode): number {
  if (a.type === 'central' && b.type !== 'central') return -1;
  if (b.type === 'central' && a.type !== 'central') return 1;
  return a.orderIndex - b.orderIndex || a.text.localeCompare(b.text);
}

function nodeHasGoogleDocsContent(node: MindMapNode, commentCount: number): boolean {
  return Boolean(
    node.link ||
      commentCount > 0 ||
      (node.textDocuments || []).some((document) => document.title.trim() || document.content.trim())
  );
}

export default function ExportModal() {
  const { language, t } = useI18n();
  const { activeModal, setActiveModal } = useUIStore();
  const { mapData, getChildren, getRootNode } = useMapStore();
  const [exporting, setExporting] = useState(false);
  const [exportScope, setExportScope] = useState<'map_only' | 'full_data'>('map_only');
  const [googleSelectedNodeIds, setGoogleSelectedNodeIds] = useState<string[]>([]);
  const [googleDocumentUrl, setGoogleDocumentUrl] = useState<string | null>(null);
  const { getNodes } = useReactFlow();

  const childrenByParent = useMemo(() => {
    if (!mapData) return {};

    const nextChildrenByParent: Record<string, MindMapNode[]> = {};
    Object.values(mapData.nodes).forEach((node) => {
      const parentKey = node.parentId || '__root__';
      nextChildrenByParent[parentKey] ||= [];
      nextChildrenByParent[parentKey].push(node);
    });
    Object.values(nextChildrenByParent).forEach((children) => children.sort(compareNodes));
    return nextChildrenByParent;
  }, [mapData]);

  const googleRootNodes = useMemo(() => {
    if (!mapData) return [];

    const roots = childrenByParent.__root__ || [];
    const rootNode = mapData.nodes[mapData.rootNodeId];
    if (!rootNode) return roots;
    return [rootNode, ...roots.filter((node) => node.id !== rootNode.id)];
  }, [childrenByParent, mapData]);

  const allMapNodes = useMemo(() => {
    const result: MindMapNode[] = [];
    const visit = (node: MindMapNode) => {
      result.push(node);
      (childrenByParent[node.id] || []).forEach(visit);
    };
    googleRootNodes.forEach(visit);
    return result;
  }, [childrenByParent, googleRootNodes]);

  const googleSelectedNodeIdSet = useMemo(
    () => new Set(googleSelectedNodeIds),
    [googleSelectedNodeIds]
  );

  useEffect(() => {
    if (activeModal !== 'export' || !mapData) return;

    setGoogleDocumentUrl(null);
    setGoogleSelectedNodeIds(
      Object.values(mapData.nodes)
        .filter((node) => nodeHasGoogleDocsContent(node, mapData.comments[node.id]?.length || 0))
        .map((node) => node.id)
    );
  }, [activeModal, mapData]);

  useEffect(() => {
    if (activeModal !== 'export' || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return;

    void preloadGoogleDocsAccess().catch((error) => {
      console.warn('Google authorization script preload failed:', error);
    });
  }, [activeModal]);

  if (activeModal !== 'export') return null;

  const handleExport = async (format: ExportFormat) => {
    setExporting(true);
    setGoogleDocumentUrl(null);
    try {
      if (format === 'google-docs') {
        if (!mapData) throw new Error('No map data');
        const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!googleClientId) {
          alert(t.exportModal.googleClientMissing);
          return;
        }

        const accessToken = await requestGoogleDocsAccessToken(googleClientId);
        const result = await exportMindMapToGoogleDocs({
          mapData,
          selectedNodeIds: googleSelectedNodeIds,
          locale: language,
          accessToken,
          labels: {
            structureTabTitle: t.exportModal.googleStructureTab,
            hierarchyTitle: t.exportModal.googleHierarchy,
            documentsTitle: t.exportModal.googleDocuments,
            commentsTitle: t.exportModal.googleComments,
            linkTitle: t.exportModal.markdownLink,
            untitledNode: t.common.untitledNode,
            untitledDocument: t.common.untitledDocument,
          },
        });

        setGoogleDocumentUrl(result.documentUrl);
        window.open(result.documentUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      if (format === 'markdown') {
        const root = getRootNode();
        if (!root || !mapData) throw new Error('No root node');

        const lines: string[] = [];
        lines.push(`# ${mapData.title || t.exportModal.markdownFallbackTitle}\n`);

        const recurse = (nodeId: string, level: number) => {
          const node = mapData.nodes[nodeId];
          if (!node) return;

          const indent = '  '.repeat(level);
          if (level === 0) {
            lines.push(`## ${node.text}`);
          } else {
            lines.push(`${indent}- **${node.text}**`);
          }

          const nodeComments = mapData.comments[nodeId];
          if (nodeComments && nodeComments.length > 0) {
            nodeComments.forEach((c) => {
              lines.push(`${indent}  > ${t.exportModal.markdownComment}: ${c.text}`);
            });
          }
          if (node.link) {
            lines.push(`${indent}  > ${t.exportModal.markdownLink}: ${node.link.url}`);
          }

          const children = getChildren(nodeId);
          children.forEach((child) => {
            recurse(child.id, level + 1);
          });
        };

        recurse(root.id, 0);

        const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${mapData.title || 'mindmap'}.md`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setActiveModal(null);
        return;
      }

      const nodes = getNodes();
      if (nodes.length === 0) throw new Error('No nodes');

      // Use tight padding for map_only, generous for full visual bounds
      const padding = exportScope === 'map_only' ? 24 : 120;
      const nodesBounds = getNodesBounds(nodes);
      const width = nodesBounds.width + padding * 2;
      const height = nodesBounds.height + padding * 2;

      const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewportEl) throw new Error('Canvas not found');

      const viewport = getViewportForBounds(nodesBounds, width, height, 0.5, 2, padding);

      const pixelRatio = format === 'png' ? 3 : 2;

      const dataUrl = await toPng(viewportEl, {
        backgroundColor: '#FFFFFF',
        width: width,
        height: height,
        pixelRatio,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
        filter: (node) => {
          const el = node as HTMLElement;
          if (!el.classList) return true;
          return !el.classList.contains('contextual-toolbar') &&
                 !el.classList.contains('react-flow__minimap') &&
                 !el.classList.contains('react-flow__controls') &&
                 !el.classList.contains('react-flow__attribution') &&
                 !el.classList.contains('react-flow__panel');
        },
      });

      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `mindmap-${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => { img.onload = resolve; });

        const orientation = width > height ? 'landscape' : 'portrait';
        const pdfWidth = width / pixelRatio;
        const pdfHeight = height / pixelRatio;

        const pdf = new jsPDF({
          orientation: orientation as 'landscape' | 'portrait',
          unit: 'px',
          format: [pdfWidth, pdfHeight],
          hotfixes: ['px_scaling'],
        });

        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        pdf.save(`mindmap-${Date.now()}.pdf`);
      }

      setActiveModal(null);
    } catch (err) {
      console.error('Export failed:', err);
      const message = format === 'google-docs'
        ? isGoogleAccessDeniedError(err)
          ? t.exportModal.googleAccessBlocked
          : t.exportModal.googleExportFailed
        : t.exportModal.exportFailed;
      alert(message);
    } finally {
      setExporting(false);
    }
  };

  const toggleGoogleNode = (nodeId: string) => {
    setGoogleSelectedNodeIds((current) => (
      current.includes(nodeId)
        ? current.filter((id) => id !== nodeId)
        : [...current, nodeId]
    ));
  };

  const renderGoogleNodeOption = (node: MindMapNode, depth: number): React.ReactNode => {
    const documentsCount = (node.textDocuments || []).filter((document) => (
      document.title.trim() || document.content.trim()
    )).length;
    const commentsCount = mapData?.comments[node.id]?.length || 0;
    const hasLink = Boolean(node.link);
    const meta = [
      documentsCount > 0 ? `${documentsCount} ${t.exportModal.googleDocuments}` : null,
      commentsCount > 0 ? `${commentsCount} ${t.exportModal.googleComments}` : null,
      hasLink ? t.exportModal.markdownLink : null,
    ].filter(Boolean).join(' · ');

    return (
      <React.Fragment key={node.id}>
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '6px 8px',
            paddingLeft: `${8 + depth * 18}px`,
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={googleSelectedNodeIdSet.has(node.id)}
            onChange={() => toggleGoogleNode(node.id)}
            style={{ marginTop: '3px' }}
          />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1E293B', wordBreak: 'break-word' }}>
              {node.text || t.common.untitledNode}
            </span>
            {meta && (
              <span style={{ display: 'block', marginTop: '2px', fontSize: '11px', color: '#64748B' }}>
                {meta}
              </span>
            )}
          </span>
        </label>
        {(childrenByParent[node.id] || []).map((child) => renderGoogleNodeOption(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
      }}
      onClick={() => setActiveModal(null)}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '24px',
          width: 'min(560px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          boxShadow: '0 16px 48px rgba(0,0,0,0.16)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1E293B', margin: 0 }}>{t.exportModal.title}</h2>
          <button onClick={() => setActiveModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={20} />
          </button>
        </div>

        {/* Scope Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
            {t.exportModal.scope}
          </label>
          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
            <button
              onClick={() => setExportScope('map_only')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: exportScope === 'map_only' ? '#FFFFFF' : 'transparent',
                boxShadow: exportScope === 'map_only' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                color: exportScope === 'map_only' ? '#0F172A' : '#64748B',
                transition: 'all 0.2s',
              }}
            >
              {t.exportModal.mapOnly}
            </button>
            <button
              onClick={() => setExportScope('full_data')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: exportScope === 'full_data' ? '#FFFFFF' : 'transparent',
                boxShadow: exportScope === 'full_data' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                color: exportScope === 'full_data' ? '#0F172A' : '#64748B',
                transition: 'all 0.2s',
              }}
            >
              {t.exportModal.fullPage}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', display: 'block' }}>
              {t.exportModal.googleTabsTitle}
            </label>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setGoogleSelectedNodeIds(allMapNodes.map((node) => node.id))}
                style={{ border: 'none', background: 'none', padding: 0, fontSize: '12px', fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}
              >
                {t.exportModal.selectAllTabs}
              </button>
              <button
                type="button"
                onClick={() => setGoogleSelectedNodeIds([])}
                style={{ border: 'none', background: 'none', padding: 0, fontSize: '12px', fontWeight: 600, color: '#64748B', cursor: 'pointer' }}
              >
                {t.exportModal.clearTabs}
              </button>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5, marginBottom: '10px' }}>
            {googleSelectedNodeIds.length === 0
              ? t.exportModal.structureOnlyHint
              : t.exportModal.googleTabsDescription}
          </div>
          <div
            style={{
              maxHeight: '180px',
              overflowY: 'auto',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px',
              backgroundColor: '#FFFFFF',
            }}
          >
            {googleRootNodes.map((node) => renderGoogleNodeOption(node, 0))}
          </div>
        </div>

        <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
          {t.exportModal.format}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => handleExport('png')}
            disabled={exporting}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '16px',
              borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF',
              cursor: exporting ? 'wait' : 'pointer', transition: 'all 0.15s', textAlign: 'left',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#F8FAFC')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#FFFFFF')}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={22} style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{t.exportModal.pngTitle}</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{t.exportModal.pngDescription}</div>
            </div>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '16px',
              borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF',
              cursor: exporting ? 'wait' : 'pointer', transition: 'all 0.15s', textAlign: 'left',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#F8FAFC')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#FFFFFF')}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#FCE7F3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileImage size={22} style={{ color: '#EC4899' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{t.exportModal.pdfTitle}</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{t.exportModal.pdfDescription}</div>
            </div>
          </button>

          <button
            onClick={() => handleExport('markdown')}
            disabled={exporting}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '16px',
              borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF',
              cursor: exporting ? 'wait' : 'pointer', transition: 'all 0.15s', textAlign: 'left',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#F8FAFC')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#FFFFFF')}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlignLeft size={22} style={{ color: '#4B5563' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{t.exportModal.markdownTitle}</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{t.exportModal.markdownDescription}</div>
            </div>
          </button>

          <button
            onClick={() => handleExport('google-docs')}
            disabled={exporting}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '16px',
              borderRadius: '12px', border: '1px solid #BBF7D0', backgroundColor: '#F0FDF4',
              cursor: exporting ? 'wait' : 'pointer', transition: 'all 0.15s', textAlign: 'left',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#DCFCE7')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#F0FDF4')}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={22} style={{ color: '#16A34A' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#14532D' }}>{t.exportModal.googleDocsTitle}</div>
              <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>{t.exportModal.googleDocsDescription}</div>
            </div>
          </button>
        </div>

        {googleDocumentUrl && (
          <a
            href={googleDocumentUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '14px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#14532D',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {t.exportModal.openGoogleDocument}
          </a>
        )}

        {exporting && (
          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#64748B' }}>
            {t.exportModal.exporting}
          </div>
        )}
      </div>
    </div>
  );
}
