'use client';
// ============================================================
// BranchEdge — Smooth bezier branch connector
// ============================================================

import React, { memo } from 'react';
import { BaseEdge, getBezierPath } from '@xyflow/react';
import { getLineWidthForDepth } from '@/lib/constants';

interface BranchEdgeData {
  color?: string;
  depth?: number;
  lineStyle?: 'solid' | 'dashed';
  lineWidth?: number;
  layoutMode?: string;
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BranchEdge(props: any) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected } = props;
  const data = (props.data || {}) as BranchEdgeData;
  const color = data.color || '#94A3B8';
  const depth = data.depth || 1;
  const lineWidth = data.lineWidth || getLineWidthForDepth(depth);
  const isDashed = data.lineStyle === 'dashed';

  // Calculate distance-based curvature for natural-looking curves
  const dx = Math.abs(targetX - sourceX);
  const dy = Math.abs(targetY - sourceY);
  const curvature = (data.layoutMode === 'top-down' || data.layoutMode === 'list')
    ? 0.5
    : Math.min(0.5, Math.max(0.2, dy / (dx + 100) * 0.5));

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature,
  });

  return (
    <>
      {/* Invisible wider path for easier selection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(lineWidth + 12, 16)}
        style={{ cursor: 'pointer' }}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: selected ? lineWidth + 1 : lineWidth,
          strokeDasharray: isDashed ? '6 4' : undefined,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          opacity: selected ? 1 : 0.85,
          transition: 'stroke-width 0.15s ease, opacity 0.15s ease',
        }}
      />
    </>
  );
}

export default memo(BranchEdge);
