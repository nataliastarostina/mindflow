// ============================================================
// History Store — Undo/Redo
// ============================================================

import { create } from 'zustand';
import type { MapData } from '@/lib/types';

const MAX_HISTORY = 50;

interface HistoryState {
  undoStack: string[];
  redoStack: string[];
  canUndo: boolean;
  canRedo: boolean;

  pushState: (mapData: MapData) => void;
  undo: () => MapData | null;
  redo: () => MapData | null;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,

  pushState: (mapData) =>
    set((state) => {
      const serialized = JSON.stringify(mapData);
      const newUndoStack = [...state.undoStack, serialized];
      if (newUndoStack.length > MAX_HISTORY) {
        newUndoStack.shift();
      }
      return {
        undoStack: newUndoStack,
        redoStack: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  undo: () => {
    const { undoStack } = get();
    if (undoStack.length < 2) return null;

    const newUndo = [...undoStack];
    const current = newUndo.pop()!;
    const previous = newUndo[newUndo.length - 1];

    set((state) => ({
      undoStack: newUndo,
      redoStack: [...state.redoStack, current],
      canUndo: newUndo.length > 1,
      canRedo: true,
    }));

    return JSON.parse(previous) as MapData;
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return null;

    const newRedo = [...redoStack];
    const next = newRedo.pop()!;

    set((state) => ({
      undoStack: [...state.undoStack, next],
      redoStack: newRedo,
      canUndo: true,
      canRedo: newRedo.length > 0,
    }));

    return JSON.parse(next) as MapData;
  },

  clear: () =>
    set({
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
    }),
}));
