'use client';
// ============================================================
// CustomConnectorEdge — Styled, editable connector between nodes
// Toolbar is rendered separately as EdgeToolbar in Canvas
// ============================================================

import { memo } from 'react';
import {
  BaseEdge,
  getSmoothStepPath,
  getStraightPath,
  getBezierPath,
} from '@xyflow/react';

type StrokeStyle = 'solid' | 'dashed' | 'dotted';
type PathType = 'smooth' | 'straight' | 'step' | 'curved';

function getStrokeDasharray(style: StrokeStyle, width: number): string | undefined {
  if (style === 'dashed') return `${width * 4} ${width * 3}`;
  if (style === 'dotted') return `${width} ${width * 3}`;
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomConnectorEdge(props: any) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    markerStart,
    markerEnd,
    data = {},
  } = props;

  const strokeColor: string = data.strokeColor || '#0F172A';
  const strokeWidth: number = data.strokeWidth || 2;
  const strokeStyle: StrokeStyle = data.strokeStyle || 'solid';
  const pathType: PathType = data.pathType || 'smooth';

  const pathArgs = {
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
  };

  let edgePath: string;

  if (pathType === 'straight') {
    [edgePath] = getStraightPath(pathArgs);
  } else if (pathType === 'curved') {
    [edgePath] = getBezierPath(pathArgs);
  } else if (pathType === 'step') {
    [edgePath] = getSmoothStepPath({ ...pathArgs, borderRadius: 0, offset: 24 });
  } else {
    [edgePath] = getSmoothStepPath({ ...pathArgs, borderRadius: 14, offset: 24 });
  }

  const dashArray = getStrokeDasharray(strokeStyle, strokeWidth);

  return (
    <>
      {/* Wide invisible hit area */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={22}
        style={{ cursor: 'pointer' }}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? strokeWidth + 1 : strokeWidth,
          strokeLinecap: strokeStyle === 'dotted' ? 'round' : 'square',
          strokeLinejoin: 'round',
          strokeDasharray: dashArray,
          opacity: selected ? 1 : 0.8,
          transition: 'opacity 0.15s ease, stroke-width 0.15s ease',
        }}
      />
    </>
  );
}

export default memo(CustomConnectorEdge);
