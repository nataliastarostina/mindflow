'use client';
// ============================================================
// ExportModal — High-quality PNG/PDF/MD export of full mind map
// ============================================================

import React, { useState } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { useMapStore } from '@/stores/useMapStore';
import { useReactFlow, getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { X, FileImage, AlignLeft, Image as ImageIcon } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { useI18n } from '@/stores/useLanguageStore';

export default function ExportModal() {
  const { t } = useI18n();
  const { activeModal, setActiveModal } = useUIStore();
  const { mapData, getChildren, getRootNode } = useMapStore();
  const [exporting, setExporting] = useState(false);
  const [exportScope, setExportScope] = useState<'map_only' | 'full_data'>('map_only');
  const { getNodes } = useReactFlow();

  if (activeModal !== 'export') return null;

  const handleExport = async (format: 'png' | 'pdf' | 'markdown') => {
    setExporting(true);
    try {
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
      alert(t.exportModal.exportFailed);
    } finally {
      setExporting(false);
    }
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
          width: '420px',
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
        </div>

        {exporting && (
          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#64748B' }}>
            {t.exportModal.exporting}
          </div>
        )}
      </div>
    </div>
  );
}
