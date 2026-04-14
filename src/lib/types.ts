// ============================================================
// MindFlow — Core Type Definitions
// ============================================================

export type NodeShape =
  | 'rounded-rectangle'
  | 'pill'
  | 'soft-rectangle'
  | 'plain-text'
  | 'underline';

export type LayoutMode =
  | 'radial'
  | 'right-tree'
  | 'top-down'
  | 'list';

export type NodeType = 'central' | 'primary' | 'subtopic' | 'floating';

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold';
export type FontStyle = 'normal' | 'italic';
export type TextDecoration = 'none' | 'underline';
export type TextAlign = 'left' | 'center';

export interface TextDocument {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface MindMapNode {
  id: string;
  mapId: string;
  parentId: string | null;
  orderIndex: number;
  type: NodeType;
  text: string;
  note?: string;
  textDocuments?: TextDocument[];
  commentCount: number;
  link?: LinkRef | null;
  attachmentIds: string[];
  shape: NodeShape;
  fillColor?: string | null;
  borderColor?: string | null;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'none';
  lineColor?: string | null;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed';
  fontFamily?: string | null;
  fontSize?: number | null;
  fontWeight?: FontWeight;
  fontStyle?: FontStyle;
  textDecoration?: TextDecoration;
  textAlign?: TextAlign;
  textColor?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  imageDisplayMode?: 'icon' | 'thumbnail' | 'inline';
  manualPosition?: { x: number; y: number } | null;
  expanded: boolean;
  width?: number;
  height?: number;
  manualWidth?: number;
}

export interface LinkRef {
  url: string;
  title?: string;
}

export interface CommentData {
  id: string;
  nodeId: string;
  text: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface MapData {
  id: string;
  title: string;
  description?: string;
  rootNodeId: string;
  layoutMode: LayoutMode;
  nodes: Record<string, MindMapNode>;
  comments: Record<string, CommentData[]>;
  customEdges?: CustomEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface BranchColorAssignment {
  nodeId: string;
  color: string;
  depth: number;
}

// Layout engine types
export interface LayoutNodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  positions: Record<string, LayoutNodePosition>;
}

// UI State types
export interface CustomEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  endMarker?: 'arrow' | 'open-arrow' | 'none';
  startMarker?: 'arrow' | 'open-arrow' | 'none';
  pathType?: 'smooth' | 'straight' | 'step' | 'curved';
}

export type ActivePopover =
  | 'shape'
  | 'border'
  | 'line'
  | 'text-style'
  | 'link'
  | 'media'
  | 'comment'
  | 'note'
  | 'more-actions'
  | null;

export type ActiveModal =
  | 'share'
  | 'export'
  | 'settings'
  | null;
