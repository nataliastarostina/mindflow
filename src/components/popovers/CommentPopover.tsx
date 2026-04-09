'use client';
// ============================================================
// CommentPopover — Right-side panel for node comments
// ============================================================

import React, { useMemo, useState } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { useMapStore } from '@/stores/useMapStore';
import { X, Send, Trash2, Pencil, Check, X as XIcon } from 'lucide-react';
import { formatCommentTimestamp, formatCommentsCount } from '@/lib/i18n';
import { useI18n } from '@/stores/useLanguageStore';

export default function CommentPopover() {
  const { language, t } = useI18n();
  const { selectedNodeIds, activePopover, setActivePopover } = useUIStore();
  const { mapData, addComment, updateComment, deleteComment } = useMapStore();
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const nodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;
  const node = nodeId && mapData ? mapData.nodes[nodeId] : null;
  const comments = useMemo(() => (nodeId && mapData ? mapData.comments[nodeId] || [] : []), [mapData, nodeId]);
  const nodeLabel = node?.text?.trim() || t.common.untitledNode;

  if (activePopover !== 'comment' || !nodeId || !node) return null;

  const handleClose = () => {
    setEditingCommentId(null);
    setEditingText('');
    setActivePopover(null);
  };

  const handleSubmit = () => {
    const value = newCommentText.trim();
    if (!value) return;

    addComment(nodeId, value);
    setNewCommentText('');
  };

  const handleStartEdit = (commentId: string, text: string) => {
    setEditingCommentId(commentId);
    setEditingText(text);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleSaveEdit = () => {
    const value = editingText.trim();
    if (!editingCommentId || !value) return;

    updateComment(nodeId, editingCommentId, value);
    handleCancelEdit();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        bottom: 24,
        width: 'min(380px, calc(100vw - 32px))',
        backgroundColor: '#FFFFFF',
        borderRadius: '22px',
        boxShadow: '0 22px 60px rgba(15, 23, 42, 0.16)',
        border: '1px solid rgba(226, 232, 240, 0.96)',
        zIndex: 2100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        opacity: 1,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid #E2E8F0',
          background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#94A3B8',
                textTransform: 'uppercase',
                marginBottom: '6px',
                wordBreak: 'break-word',
              }}
            >
              {nodeLabel}
            </div>
            <div
              style={{
                fontSize: '22px',
                lineHeight: 1.2,
                fontWeight: 700,
                color: '#0F172A',
                wordBreak: 'break-word',
              }}
            >
              {t.commentPopover.title}
            </div>
            <div style={{ marginTop: '6px', fontSize: '13px', color: '#64748B' }}>
              {comments.length === 0 ? t.commentPopover.noCommentsYet : formatCommentsCount(comments.length, language)}
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
            aria-label={t.commentPopover.closeComments}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: '#FFFFFF',
        }}
      >
        {comments.length === 0 && (
          <div
            style={{
              borderRadius: '16px',
              border: '1px dashed #CBD5E1',
              backgroundColor: '#F8FAFC',
              padding: '18px 16px',
              fontSize: '13px',
              lineHeight: 1.5,
              color: '#64748B',
            }}
          >
            {t.commentPopover.firstComment}
          </div>
        )}

        {comments.map((comment) => {
          const isEditing = editingCommentId === comment.id;

          return (
            <div
              key={comment.id}
              style={{
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)',
                padding: '14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '10px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    {comment.authorName}
                  </div>
                  <div style={{ fontSize: '11px', lineHeight: 1.4, color: '#94A3B8', marginTop: '2px' }}>
                    {formatCommentTimestamp(comment.createdAt, comment.updatedAt, language)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(comment.id, comment.text)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '30px',
                        height: '30px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        color: '#64748B',
                        cursor: 'pointer',
                      }}
                      aria-label={t.commentPopover.editComment}
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing) {
                        handleCancelEdit();
                      }
                      deleteComment(nodeId, comment.id);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '30px',
                      height: '30px',
                      borderRadius: '10px',
                      border: '1px solid #FECACA',
                      backgroundColor: '#FFF1F2',
                      color: '#E11D48',
                      cursor: 'pointer',
                    }}
                    aria-label={t.commentPopover.deleteComment}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {isEditing ? (
                <>
                  <textarea
                    value={editingText}
                    onChange={(event) => setEditingText(event.target.value)}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                        event.preventDefault();
                        handleSaveEdit();
                      }
                    }}
                    rows={4}
                    style={{
                      width: '100%',
                      resize: 'vertical',
                      minHeight: '92px',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      padding: '12px 13px',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        height: '34px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        color: '#475569',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <XIcon size={14} />
                      {t.common.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={!editingText.trim()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        height: '34px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: editingText.trim() ? '#0F172A' : '#CBD5E1',
                        color: '#FFFFFF',
                        cursor: editingText.trim() ? 'pointer' : 'default',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <Check size={14} />
                      {t.common.save}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap' }}>
                  {comment.text}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          padding: '16px 20px 20px',
          borderTop: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>
          {t.commentPopover.newComment}
        </div>
        <textarea
          value={newCommentText}
          onChange={(event) => setNewCommentText(event.target.value)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={t.commentPopover.placeholder}
          rows={4}
          style={{
            width: '100%',
            resize: 'vertical',
            minHeight: '104px',
            borderRadius: '14px',
            border: '1px solid #CBD5E1',
            padding: '12px 13px',
            fontSize: '13px',
            lineHeight: 1.5,
            color: '#0F172A',
            outline: 'none',
            boxSizing: 'border-box',
            backgroundColor: '#FFFFFF',
          }}
          autoFocus
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
          <div style={{ fontSize: '11px', color: '#94A3B8' }}>
            {t.commentPopover.postHint}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!newCommentText.trim()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              height: '38px',
              padding: '0 14px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: newCommentText.trim() ? '#0F172A' : '#CBD5E1',
              color: '#FFFFFF',
              cursor: newCommentText.trim() ? 'pointer' : 'default',
              fontSize: '13px',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <Send size={14} />
            {t.commentPopover.postComment}
          </button>
        </div>
      </div>
    </div>
  );
}
