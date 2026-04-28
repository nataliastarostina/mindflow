'use client';
// ============================================================
// NotePopover — Multi-document rich text editor for node details
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { useMapStore } from '@/stores/useMapStore';
import {
  X,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Plus,
  FileText,
  Code2,
  Quote,
  Trash2,
} from 'lucide-react';
import { formatDocumentLabel } from '@/lib/i18n';
import { useI18n } from '@/stores/useLanguageStore';

type BlockStyleValue =
  | 'body'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'quote'
  | 'monospaced';

function normalizeEditorHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed || trimmed === '<br>' || trimmed === '<div><br></div>' || trimmed === '<p><br></p>') {
    return '';
  }
  return html;
}

export default function NotePopover() {
  const { language, t } = useI18n();
  const {
    selectedNodeIds,
    activePopover,
    activeTextDocumentId,
    setActivePopover,
    setActiveTextDocumentId,
  } = useUIStore();
  const { mapData, createTextDocument, updateTextDocument, deleteTextDocument } = useMapStore();
  const editorRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const contentDraftRef = useRef('');
  const titleDraftRef = useRef('');
  const activeDocumentIdRef = useRef<string | null>(null);

  const nodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;
  const node = nodeId && mapData ? mapData.nodes[nodeId] : null;
  const documents = useMemo(() => node?.textDocuments || [], [node?.textDocuments]);
  const activeDocument = documents.find((document) => document.id === activeTextDocumentId) || documents[0] || null;
  const nodeLabel = node?.text?.trim() || t.common.untitledNode;

  useEffect(() => {
    activeDocumentIdRef.current = activeDocument?.id || null;
  }, [activeDocument]);

  const commitCurrentDocument = useCallback(() => {
    if (!nodeId || !activeDocumentIdRef.current) return;

    updateTextDocument(nodeId, activeDocumentIdRef.current, {
      title: titleDraftRef.current,
      content: normalizeEditorHtml(editorRef.current?.innerHTML ?? contentDraftRef.current),
    });
  }, [nodeId, updateTextDocument]);

  useEffect(() => {
    if (activePopover !== 'note' || !nodeId || !node) return;

    if (documents.length === 0) {
      const newDocumentId = createTextDocument(nodeId);
      if (newDocumentId) {
        setActiveTextDocumentId(newDocumentId);
      }
      return;
    }

    if (!activeTextDocumentId || !documents.some((document) => document.id === activeTextDocumentId)) {
      setActiveTextDocumentId(documents[0].id);
    }
  }, [activePopover, activeTextDocumentId, createTextDocument, documents, node, nodeId, setActiveTextDocumentId]);

  useEffect(() => {
    if (activePopover !== 'note' || !activeDocument) return;

    const nextTitle = activeDocument.title || t.common.untitledDocument;
    const nextContent = activeDocument.content || '';

    titleDraftRef.current = nextTitle;
    contentDraftRef.current = nextContent;

    if (editorRef.current && editorRef.current.innerHTML !== nextContent) {
      editorRef.current.innerHTML = nextContent;
    }
  }, [activeDocument, activePopover, t.common.untitledDocument]);

  useEffect(() => {
    if (activePopover !== 'note') return;

    document.execCommand('defaultParagraphSeparator', false, 'p');

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !editorRef.current) return;

      const range = selection.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [activePopover]);

  if (activePopover !== 'note' || !nodeId || !node || !activeDocument) return null;

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection) return;

    selection.removeAllRanges();
    if (savedRangeRef.current) {
      selection.addRange(savedRangeRef.current);
      return;
    }

    if (!editorRef.current) return;
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    selection.addRange(range);
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;

    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const applyCommand = (command: string, value?: string) => {
    focusEditor();
    restoreSelection();

    if (command === 'foreColor' || command === 'hiliteColor') {
      document.execCommand('styleWithCSS', false, 'true');
    }

    document.execCommand(command, false, value ?? '');
    saveSelection();
    contentDraftRef.current = editorRef.current?.innerHTML || '';
  };

  const applyBlockStyle = (style: BlockStyleValue) => {
    switch (style) {
      case 'title':
        applyCommand('formatBlock', 'H1');
        return;
      case 'heading':
        applyCommand('formatBlock', 'H2');
        return;
      case 'subheading':
        applyCommand('formatBlock', 'H3');
        return;
      case 'quote':
        applyCommand('formatBlock', 'BLOCKQUOTE');
        return;
      case 'monospaced':
        applyCommand('formatBlock', 'PRE');
        return;
      case 'body':
      default:
        applyCommand('formatBlock', 'P');
    }
  };

  const handleClose = () => {
    commitCurrentDocument();
    setActiveTextDocumentId(null);
    setActivePopover(null);
  };

  const handleHeadingChange = (value: BlockStyleValue) => {
    applyBlockStyle(value);
  };

  const handleEditorInput = () => {
    contentDraftRef.current = editorRef.current?.innerHTML || '';
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;

    const key = event.key.toLowerCase();

    if (key === 'b') {
      event.preventDefault();
      applyCommand('bold');
      return;
    }

    if (key === 'i') {
      event.preventDefault();
      applyCommand('italic');
      return;
    }

    if (key === 'u') {
      event.preventDefault();
      applyCommand('underline');
      return;
    }

    if (!event.altKey && !event.shiftKey) return;

    if (key === '1') {
      event.preventDefault();
      applyBlockStyle('title');
      return;
    }

    if (key === '2') {
      event.preventDefault();
      applyBlockStyle('heading');
      return;
    }

    if (key === '3') {
      event.preventDefault();
      applyBlockStyle('subheading');
      return;
    }

    if (event.shiftKey && key === '7') {
      event.preventDefault();
      applyCommand('insertOrderedList');
      return;
    }

    if (event.shiftKey && key === '8') {
      event.preventDefault();
      applyCommand('insertUnorderedList');
    }
  };

  const handleDocumentSelect = (documentId: string) => {
    if (documentId === activeDocument.id) return;
    commitCurrentDocument();
    setActiveTextDocumentId(documentId);
  };

  const handleCreateDocument = () => {
    commitCurrentDocument();
    const newDocumentId = createTextDocument(nodeId);
    if (!newDocumentId) return;

    setActiveTextDocumentId(newDocumentId);
    window.setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 0);
  };

  const handleTitleChange = (value: string) => {
    titleDraftRef.current = value;
  };

  const handleDeleteDocument = (documentId: string) => {
    if (!nodeId) return;
    const target = documents.find((d) => d.id === documentId);
    const label = target?.title?.trim() || t.common.untitledDocument;
    if (typeof window !== 'undefined' && !window.confirm(`${t.common.delete} "${label}"?`)) return;

    const wasActive = documentId === activeDocument.id;
    const remaining = documents.filter((d) => d.id !== documentId);

    deleteTextDocument(nodeId, documentId);

    if (wasActive) {
      if (remaining.length > 0) {
        setActiveTextDocumentId(remaining[0].id);
      } else {
        const newId = createTextDocument(nodeId);
        setActiveTextDocumentId(newId);
      }
    }
  };

  const toolbarButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    backgroundColor: '#FFFFFF',
    color: '#334155',
    cursor: 'pointer',
    flexShrink: 0,
  };

  const toolbarLabelStyle: React.CSSProperties = {
    ...toolbarButtonStyle,
    width: 'auto',
    padding: '0 10px',
    gap: '8px',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.28)',
        zIndex: 2100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '28px',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: 'min(1120px, calc(100vw - 56px))',
          height: 'min(88vh, 1180px)',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 28px 90px rgba(15, 23, 42, 0.24)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '18px 22px 14px',
            borderBottom: '1px solid #E2E8F0',
            background:
              'linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, rgba(255, 255, 255, 0.96) 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              marginBottom: '14px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#94A3B8',
                  textTransform: 'uppercase',
                  wordBreak: 'break-word',
                }}
              >
                {nodeLabel}
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A' }}>
                {t.notePopover.title}
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '999px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B',
                flexShrink: 0,
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Type size={15} color="#64748B" />
              <select
                defaultValue="body"
                onChange={(e) => handleHeadingChange(e.target.value as BlockStyleValue)}
                style={{
                  height: '36px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '0 12px',
                  fontSize: '13px',
                  color: '#334155',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="body">{t.notePopover.blockStyles.body}</option>
                <option value="title">{t.notePopover.blockStyles.title}</option>
                <option value="heading">{t.notePopover.blockStyles.heading}</option>
                <option value="subheading">{t.notePopover.blockStyles.subheading}</option>
                <option value="quote">{t.notePopover.blockStyles.quote}</option>
                <option value="monospaced">{t.notePopover.blockStyles.monospaced}</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyCommand('bold')} style={toolbarButtonStyle} title={t.notePopover.bold}>
                <Bold size={15} />
              </button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyCommand('italic')} style={toolbarButtonStyle} title={t.notePopover.italic}>
                <Italic size={15} />
              </button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyCommand('underline')} style={toolbarButtonStyle} title={t.notePopover.underline}>
                <Underline size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyCommand('insertUnorderedList')} style={toolbarButtonStyle} title={t.notePopover.bulletedList}>
                <List size={15} />
              </button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyCommand('insertOrderedList')} style={toolbarButtonStyle} title={t.notePopover.orderedList}>
                <ListOrdered size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyCommand('justifyLeft')} style={toolbarButtonStyle} title={t.notePopover.alignLeft}>
                <AlignLeft size={15} />
              </button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyCommand('justifyCenter')} style={toolbarButtonStyle} title={t.notePopover.alignCenter}>
                <AlignCenter size={15} />
              </button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyCommand('justifyRight')} style={toolbarButtonStyle} title={t.notePopover.alignRight}>
                <AlignRight size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={toolbarLabelStyle} title={t.notePopover.textColor}>
                <Heading1 size={14} />
                <input
                  type="color"
                  defaultValue="#0F172A"
                  onInput={(e) => applyCommand('foreColor', (e.target as HTMLInputElement).value)}
                  style={{
                    width: '20px',
                    height: '20px',
                    border: 'none',
                    padding: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                />
              </label>

              <label style={toolbarLabelStyle} title={t.notePopover.highlight}>
                <Highlighter size={14} />
                <input
                  type="color"
                  defaultValue="#FEF08A"
                  onInput={(e) => applyCommand('hiliteColor', (e.target as HTMLInputElement).value)}
                  style={{
                    width: '20px',
                    height: '20px',
                    border: 'none',
                    padding: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyBlockStyle('heading')}
                style={toolbarButtonStyle}
                title={t.notePopover.heading}
              >
                <Heading2 size={15} />
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyBlockStyle('subheading')}
                style={toolbarButtonStyle}
                title={t.notePopover.subheading}
              >
                <Heading3 size={15} />
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyBlockStyle('quote')}
                style={toolbarButtonStyle}
                title={t.notePopover.quote}
              >
                <Quote size={15} />
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyBlockStyle('monospaced')}
                style={toolbarButtonStyle}
                title={t.notePopover.monospaced}
              >
                <Code2 size={15} />
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '260px minmax(0, 1fr)',
            minHeight: 0,
          }}
        >
          <aside
            style={{
              borderRight: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              padding: '18px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              minHeight: 0,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#94A3B8',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}
              >
                {t.notePopover.sidebarTitle}
              </div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                {t.notePopover.sidebarDescription}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateDocument}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                height: '40px',
                borderRadius: '12px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <Plus size={15} />
              {t.notePopover.newDocument}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', minHeight: 0 }}>
              {documents.map((document, index) => {
                const isActive = document.id === activeDocument.id;
                return (
                  <div
                    key={document.id}
                    onClick={() => handleDocumentSelect(document.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      width: '100%',
                      padding: '11px 12px',
                      borderRadius: '12px',
                      border: isActive ? '1px solid #CBD5E1' : '1px solid transparent',
                      backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                      boxShadow: isActive ? '0 10px 24px rgba(15, 23, 42, 0.08)' : 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    className="note-doc-item"
                  >
                    <FileText size={15} style={{ color: isActive ? '#0F172A' : '#64748B', marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#0F172A',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: '2px',
                        }}
                      >
                        {document.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {formatDocumentLabel(index + 1, language)}
                      </div>
                    </div>
                    <button
                      type="button"
                      title={t.common.delete}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(document.id);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'transparent',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#FEE2E2';
                        (e.currentTarget as HTMLElement).style.color = '#E11D48';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = '#94A3B8';
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>

          <div
            style={{
              overflow: 'auto',
              background: 'linear-gradient(180deg, #EEF2F7 0%, #F8FAFC 120px, #F8FAFC 100%)',
              padding: '30px',
            }}
          >
            <div
              style={{
                width: 'min(100%, 794px)',
                minHeight: 'calc(100% - 20px)',
                margin: '0 auto',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
                padding: '40px 48px',
                display: 'flex',
                flexDirection: 'column',
                gap: '22px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#94A3B8',
                    textTransform: 'uppercase',
                  }}
                >
                  {t.notePopover.documentTitle}
                </div>
                <input
                  key={activeDocument.id}
                  ref={titleInputRef}
                  defaultValue={activeDocument.title}
                  onInput={(e) => handleTitleChange((e.target as HTMLInputElement).value)}
                  onBlur={commitCurrentDocument}
                  placeholder={t.common.untitledDocument}
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#0F172A',
                    background: 'transparent',
                    padding: 0,
                  }}
                />
              </div>

              <div
                ref={editorRef}
                className="note-editor-content"
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onKeyDown={handleEditorKeyDown}
                onBlur={commitCurrentDocument}
                style={{
                  minHeight: '420px',
                  outline: 'none',
                  fontSize: '15px',
                  lineHeight: 1.7,
                  color: '#1E293B',
                  wordBreak: 'break-word',
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '16px 22px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            {t.notePopover.footer}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleClose}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t.notePopover.saveAndClose}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
