import { nanoid } from 'nanoid';

export function generateId(): string {
  return nanoid(12);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function getTextWidth(text: string, fontSize: number, fontWeight: string = 'normal'): number {
  if (typeof document === 'undefined') return text.length * fontSize * 0.6;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length * fontSize * 0.6;
  ctx.font = `${fontWeight} ${fontSize}px Inter, sans-serif`;
  return ctx.measureText(text).width;
}

function splitWrappedLines(
  text: string,
  fontSize: number,
  fontWeight: string,
  maxTextWidth: number
): string[] {
  const normalized = text.replace(/\r\n/g, '\n');
  const rawLines = normalized.split('\n');
  const wrapped: string[] = [];

  rawLines.forEach((rawLine) => {
    if (!rawLine.trim()) {
      wrapped.push('');
      return;
    }

    let currentLine = '';
    let lastBreakIndex = -1;

    for (let i = 0; i < rawLine.length; i++) {
      const nextLine = currentLine + rawLine[i];
      if (/\s/.test(rawLine[i])) {
        lastBreakIndex = currentLine.length;
      }

      if (getTextWidth(nextLine, fontSize, fontWeight) <= maxTextWidth) {
        currentLine = nextLine;
        continue;
      }

      if (!currentLine) {
        wrapped.push(rawLine[i]);
        currentLine = '';
        lastBreakIndex = -1;
        continue;
      }

      if (lastBreakIndex >= 0) {
        const line = currentLine.slice(0, lastBreakIndex).trimEnd();
        const rest = `${currentLine.slice(lastBreakIndex + 1)}${rawLine[i]}`.trimStart();
        wrapped.push(line);
        currentLine = rest;
      } else {
        wrapped.push(currentLine);
        currentLine = rawLine[i];
      }

      lastBreakIndex = /\s/.test(currentLine) ? currentLine.lastIndexOf(' ') : -1;
    }

    wrapped.push(currentLine.trimEnd());
  });

  return wrapped.filter((line, index, arr) => line.length > 0 || arr.length === 1);
}

export function computeNodeDimensions(
  text: string,
  fontSize: number,
  fontWeight: string,
  minWidth: number,
  padding: number = 40,
  maxWidth: number = 320
): { width: number; height: number } {
  const maxTextWidth = Math.max(minWidth, maxWidth - padding);
  const lines = splitWrappedLines(text, fontSize, fontWeight, maxTextWidth);
  const widestLine = lines.reduce((max, line) => {
    return Math.max(max, getTextWidth(line || ' ', fontSize, fontWeight));
  }, 0);
  const width = Math.min(maxWidth, Math.max(minWidth, Math.ceil(widestLine + padding)));
  const lineHeight = Math.max(18, Math.ceil(fontSize * 1.4));
  const verticalPadding = fontSize >= 18 ? 28 : 24;
  const height = Math.max(lineHeight + verticalPadding, lines.length * lineHeight + verticalPadding);
  return { width, height };
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
