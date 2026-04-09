// ============================================================
// Layout Engine — Computes node positions for all layout modes
// ============================================================

import type { MindMapNode, LayoutMode, LayoutResult, LayoutNodePosition } from '@/lib/types';
import { LAYOUT_SPACING } from '@/lib/constants';

interface TreeNode {
  id: string;
  node: MindMapNode;
  children: TreeNode[];
  width: number;
  height: number;
  subtreeHeight: number;
  subtreeWidth: number;
  x: number;
  y: number;
}

function buildTree(
  nodes: Record<string, MindMapNode>,
  rootId: string
): TreeNode | null {
  const rootNode = nodes[rootId];
  if (!rootNode) return null;

  const build = (nodeId: string): TreeNode => {
    const node = nodes[nodeId];
    const children = Object.values(nodes)
      .filter((n) => n.parentId === nodeId && (node.expanded !== false))
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((child) => build(child.id));

    return {
      id: nodeId,
      node,
      children,
      width: node.width || 140,
      height: node.height || 42,
      subtreeHeight: 0,
      subtreeWidth: 0,
      x: 0,
      y: 0,
    };
  };

  return build(rootId);
}

function computeSubtreeSize(
  tree: TreeNode,
  siblingSpacing: number,
  isVertical: boolean
): void {
  if (tree.children.length === 0) {
    tree.subtreeHeight = tree.height;
    tree.subtreeWidth = tree.width;
    return;
  }

  tree.children.forEach((child) =>
    computeSubtreeSize(child, siblingSpacing, isVertical)
  );

  if (isVertical) {
    tree.subtreeWidth = Math.max(
      tree.width,
      tree.children.reduce((sum, c) => sum + c.subtreeWidth, 0) +
        (tree.children.length - 1) * siblingSpacing
    );
    tree.subtreeHeight =
      tree.height +
      LAYOUT_SPACING.topDown.levelSpacing +
      Math.max(...tree.children.map((c) => c.subtreeHeight));
  } else {
    tree.subtreeHeight = Math.max(
      tree.height,
      tree.children.reduce((sum, c) => sum + c.subtreeHeight, 0) +
        (tree.children.length - 1) * siblingSpacing
    );
    tree.subtreeWidth =
      tree.width +
      LAYOUT_SPACING.tree.levelSpacing +
      Math.max(...tree.children.map((c) => c.subtreeWidth));
  }
}

// ============ RADIAL LAYOUT ============
function layoutRadial(
  nodes: Record<string, MindMapNode>,
  rootId: string
): LayoutResult {
  const tree = buildTree(nodes, rootId);
  if (!tree) return { positions: {} };

  const positions: Record<string, LayoutNodePosition> = {};
  const { levelSpacing, siblingSpacing } = LAYOUT_SPACING.radial;

  // Center root at exactly (0,0) center point, means top-left is (-width/2, -height/2)
  positions[tree.id] = {
    id: tree.id,
    x: -tree.width / 2,
    y: -tree.height / 2,
    width: tree.width,
    height: tree.height,
  };

  if (tree.children.length === 0) return { positions };

  // Split children into left and right groups
  const leftChildren: TreeNode[] = [];
  const rightChildren: TreeNode[] = [];

  tree.children.forEach((child, i) => {
    if (i % 2 === 0) {
      rightChildren.push(child);
    } else {
      leftChildren.push(child);
    }
  });

  // direction = 1 (Right), direction = -1 (Left)
  const layoutSide = (
    children: TreeNode[],
    direction: 1 | -1
  ) => {
    children.forEach((child) =>
      computeSubtreeSize(child, siblingSpacing, false)
    );

    const totalHeight = children.reduce(
      (sum, c) => sum + c.subtreeHeight,
      0
    ) + (children.length - 1) * siblingSpacing;

    let currentY = -totalHeight / 2;

    children.forEach((child) => {
      // If right, start from root's right edge + spacing
      // If left, start from root's left edge - spacing - child width
      const x = direction === 1 
        ? (tree.width / 2) + levelSpacing 
        : -(tree.width / 2) - levelSpacing - child.width;

      const y = currentY + child.subtreeHeight / 2 - child.height / 2;

      positions[child.id] = {
        id: child.id,
        x,
        y,
        width: child.width,
        height: child.height,
      };

      layoutSubtree(child, x, y, direction, levelSpacing, siblingSpacing, positions);
      currentY += child.subtreeHeight + siblingSpacing;
    });
  };

  layoutSide(rightChildren, 1);
  layoutSide(leftChildren, -1);

  return { positions };
}

function layoutSubtree(
  parent: TreeNode,
  parentX: number,
  parentY: number,
  direction: 1 | -1,
  levelSpacing: number,
  siblingSpacing: number,
  positions: Record<string, LayoutNodePosition>
) {
  if (parent.children.length === 0) return;

  parent.children.forEach((child) =>
    computeSubtreeSize(child, siblingSpacing, false)
  );

  const totalHeight = parent.children.reduce(
    (sum, c) => sum + c.subtreeHeight,
    0
  ) + (parent.children.length - 1) * siblingSpacing;

  let currentY = parentY + parent.height / 2 - totalHeight / 2;

  parent.children.forEach((child) => {
    const x =
      direction === 1
        ? parentX + parent.width + levelSpacing
        : parentX - child.width - levelSpacing;
    const y = currentY + child.subtreeHeight / 2 - child.height / 2;

    positions[child.id] = {
      id: child.id,
      x,
      y,
      width: child.width,
      height: child.height,
    };

    layoutSubtree(child, x, y, direction, levelSpacing * 0.9, siblingSpacing, positions);
    currentY += child.subtreeHeight + siblingSpacing;
  });
}

// ============ RIGHT TREE ============
function layoutRightTree(
  nodes: Record<string, MindMapNode>,
  rootId: string
): LayoutResult {
  const tree = buildTree(nodes, rootId);
  if (!tree) return { positions: {} };

  const positions: Record<string, LayoutNodePosition> = {};
  const { levelSpacing, siblingSpacing } = LAYOUT_SPACING.tree;

  computeSubtreeSize(tree, siblingSpacing, false);

  positions[tree.id] = {
    id: tree.id,
    x: 0,
    y: 0,
    width: tree.width,
    height: tree.height,
  };

  layoutSubtree(tree, 0, 0, 1, levelSpacing, siblingSpacing, positions);

  // Center vertically
  const allY = Object.values(positions).map((p) => p.y);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY.map((y, i) => y + Object.values(positions)[i].height));
  const centerOffset = (maxY + minY) / 2;

  Object.values(positions).forEach((p) => {
    p.y -= centerOffset;
  });

  return { positions };
}

// ============ TOP DOWN (VERTICAL / ORG CHART) ============
function layoutTopDown(
  nodes: Record<string, MindMapNode>,
  rootId: string
): LayoutResult {
  const tree = buildTree(nodes, rootId);
  if (!tree) return { positions: {} };

  const positions: Record<string, LayoutNodePosition> = {};
  const { levelSpacing, siblingSpacing } = LAYOUT_SPACING.topDown;

  computeSubtreeSize(tree, siblingSpacing, true);

  positions[tree.id] = {
    id: tree.id,
    x: 0,
    y: 0,
    width: tree.width,
    height: tree.height,
  };

  layoutTopDownSubtree(tree, 0, 0, levelSpacing, siblingSpacing, positions);

  // Center horizontally
  const allX = Object.values(positions).map((p) => p.x);
  const allWidths = Object.values(positions).map((p) => p.width);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX.map((x, i) => x + allWidths[i]));
  const centerOffset = (maxX + minX) / 2;

  Object.values(positions).forEach((p) => {
    p.x -= centerOffset;
  });

  return { positions };
}

function layoutTopDownSubtree(
  parent: TreeNode,
  parentX: number,
  parentY: number,
  levelSpacing: number,
  siblingSpacing: number,
  positions: Record<string, LayoutNodePosition>
) {
  if (parent.children.length === 0) return;

  parent.children.forEach((child) =>
    computeSubtreeSize(child, siblingSpacing, true)
  );

  const totalWidth = parent.children.reduce(
    (sum, c) => sum + c.subtreeWidth,
    0
  ) + (parent.children.length - 1) * siblingSpacing;

  let currentX = parentX + parent.width / 2 - totalWidth / 2;

  parent.children.forEach((child) => {
    const x = currentX + child.subtreeWidth / 2 - child.width / 2;
    const y = parentY + parent.height + levelSpacing;

    positions[child.id] = {
      id: child.id,
      x,
      y,
      width: child.width,
      height: child.height,
    };

    layoutTopDownSubtree(child, x, y, levelSpacing, siblingSpacing, positions);
    currentX += child.subtreeWidth + siblingSpacing;
  });
}

// ============ MAIN ENTRY ============
export function computeLayout(
  nodes: Record<string, MindMapNode>,
  rootId: string,
  mode: LayoutMode
): LayoutResult {
  switch (mode) {
    case 'radial':
      return layoutRadial(nodes, rootId);
    case 'right-tree':
      return layoutRightTree(nodes, rootId);
    case 'top-down':
      return layoutTopDown(nodes, rootId);
    default:
      return layoutRadial(nodes, rootId);
  }
}
