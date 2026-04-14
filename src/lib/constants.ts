// ============================================================
// MindFlow — Constants & Design Tokens
// ============================================================

// Branch color palette — muted, harmonious, Notion/Linear-inspired
export const BRANCH_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
] as const;

// Theme color palette for popovers
export const THEME_COLORS = [
  // Row 1: vibrant
  '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
  // Row 2: muted
  '#818CF8', '#A78BFA', '#F472B6', '#FB7185', '#FB923C',
  '#FACC15', '#4ADE80', '#2DD4BF', '#22D3EE', '#60A5FA',
  // Row 3: neutrals
  '#1E293B', '#334155', '#475569', '#64748B', '#94A3B8',
  '#CBD5E1', '#E2E8F0', '#F1F5F9', '#FFFFFF', '#000000',
] as const;

// Node dimensions by type
export const NODE_DEFAULTS = {
  central: {
    width: 220,
    height: 56,
    fontSize: 18,
    fontWeight: 'bold' as const,
    shape: 'rounded-rectangle' as const,
    fillColor: '#1E293B',
    textColor: '#FFFFFF',
  },
  primary: {
    width: 140,
    height: 42,
    fontSize: 15,
    fontWeight: 'semibold' as const,
    shape: 'rounded-rectangle' as const,
    fillColor: null,
    textColor: '#1E293B',
  },
  subtopic: {
    width: 120,
    height: 36,
    fontSize: 14,
    fontWeight: 'regular' as const,
    shape: 'rounded-rectangle' as const,
    fillColor: null,
    textColor: '#334155',
  },
  floating: {
    width: 130,
    height: 38,
    fontSize: 14,
    fontWeight: 'regular' as const,
    shape: 'rounded-rectangle' as const,
    fillColor: '#FEF3C7',
    textColor: '#92400E',
  },
} as const;

// Layout spacing
export const LAYOUT_SPACING = {
  radial: {
    levelSpacing: 120,
    siblingSpacing: 50,
    minBranchAngle: 15,
  },
  tree: {
    levelSpacing: 100,
    siblingSpacing: 40,
    subtreeGap: 24,
  },
  topDown: {
    levelSpacing: 90,
    siblingSpacing: 60,
    subtreeGap: 30,
  },
  list: {
    verticalSpacing: 12,
    indentPerLevel: 40,
  },
} as const;

// Font presets
export const FONT_PRESETS = [
  { name: 'Title', fontSize: 20, fontWeight: 'bold' as const },
  { name: 'Section', fontSize: 16, fontWeight: 'semibold' as const },
  { name: 'Standard', fontSize: 14, fontWeight: 'regular' as const },
  { name: 'Muted', fontSize: 13, fontWeight: 'regular' as const },
  { name: 'Emphasis', fontSize: 14, fontWeight: 'medium' as const },
] as const;

// Shape presets
export const SHAPE_PRESETS = [
  { id: 'rounded-rectangle', label: 'Rounded Rectangle' },
  { id: 'pill', label: 'Pill' },
  { id: 'soft-rectangle', label: 'Soft Rectangle' },
  { id: 'plain-text', label: 'Plain Text' },
  { id: 'underline', label: 'Underline' },
] as const;

// Keyboard shortcuts
export const SHORTCUTS = {
  addChild: ['Tab'],
  addSibling: ['Enter'],
  addSiblingAbove: ['Shift+Enter'],
  deleteNode: ['Delete', 'Backspace'],
  toggleExpand: ['Space'],
  undo: ['Meta+z', 'Control+z'],
  redo: ['Meta+Shift+z', 'Control+Shift+z'],
  bold: ['Meta+b', 'Control+b'],
  italic: ['Meta+i', 'Control+i'],
  underline: ['Meta+u', 'Control+u'],
  selectAll: ['Meta+a', 'Control+a'],
  fitView: ['Meta+Shift+f', 'Control+Shift+f'],
  escape: ['Escape'],
} as const;

// Viewport
export const VIEWPORT_DEFAULTS = {
  minZoom: 0.1,
  maxZoom: 2.5,
  defaultZoom: 1,
  fitPadding: 80,
  zoomStep: 0.15,
  transitionDuration: 200,
} as const;

// Autosave
export const AUTOSAVE_DEBOUNCE_MS = 800;
export const AUTOSAVE_HARD_INTERVAL_MS = 10000;

// Line thickness by depth
export function getLineWidthForDepth(depth: number): number {
  if (depth === 0) return 3;
  if (depth === 1) return 2.5;
  if (depth === 2) return 2;
  return 1.5;
}

// Color toning for deeper branches
export function getTonedColor(baseColor: string, depth: number): string {
  if (depth <= 1) return baseColor;
  // Lighten the color for deeper nodes
  const opacity = Math.max(0.5, 1 - (depth - 1) * 0.15);
  return `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
}
