/** Command palette model (#206): commands and every catalog part as one searchable list, ranked with the parts
 * gallery's search (gallery-model.ts `searchScore`) plus a fuzzy fallback and a recency boost. Pure and unit tested
 * (src/components/command-palette.test.ts). */
import { normalize, searchScore, searchTokens, type GalleryItem } from '../PartGallery/gallery-model.ts';
import type { ShortcutId } from '../../state/shortcuts.ts';
import type { Command } from './commands.ts';

export interface PaletteEntry {
  /** 'command:undo' or 'part:rogue-echo-bike' (the recents key). */
  key: string; kind: 'command' | 'part'; id: string;
  /** Row text: the command label, or "Add <part name>". */
  label: string;
  /** Secondary text: the command group, or brand · section. */
  detail: string;
  shortcut?: ShortcutId;
  /** searchScore fields. */
  name: string; brand: string; section: string; category: string; haystack: string;
  order: number;
}

export const commandEntry = (command: Command, order: number): PaletteEntry => ({
  key: `command:${command.id}`, kind: 'command', id: command.id, label: command.label, detail: command.group, shortcut: command.shortcut,
  name: command.label, brand: '', section: command.group, category: 'Actions', order,
  haystack: normalize(`${command.label} ${command.keywords ?? ''} ${command.group}`),
});
const partCache = new WeakMap<readonly GalleryItem[], PaletteEntry[]>();
/** One entry per catalog part (cached per catalog). */
export function partEntries(items: readonly GalleryItem[]): PaletteEntry[] {
  let entries = partCache.get(items);
  if (!entries) {
    entries = items.map(item => ({
      key: `part:${item.id}`, kind: 'part', id: item.id, label: `Add ${item.name}`, detail: item.brand === 'BOS STRENGTH' ? item.section : `${item.brand} · ${item.section}`,
      name: item.name, brand: item.brand, section: item.section, category: item.category, haystack: item.haystack, order: 1000 + item.order,
    }));
    partCache.set(items, entries);
  }
  return entries;
}

/** Letters of `token` appear in order in `text` ("echbk" in "echo bike"): a score in (0, 1], higher when the letters
 * are close together and start at a word; 0 when they do not all appear. */
export function fuzzyScore(text: string, token: string): number {
  if (!token) return 1;
  let at = -1, first = -1, gaps = 0;
  for (const char of token) {
    const next = text.indexOf(char, at + 1);
    if (next < 0) return 0;
    if (first < 0) first = next; else gaps += next - at - 1;
    at = next;
  }
  const wordStart = first === 0 || text[first - 1] === ' ' ? 1 : 0.7;
  return wordStart / (1 + gaps / token.length);
}
/** searchScore, or (when any token is missing) a weaker fuzzy match of every token against the name. */
export function paletteScore(entry: PaletteEntry, tokens: readonly string[]): number {
  const exact = searchScore(entry, tokens);
  if (exact > 0 || !tokens.length) return exact;
  const name = normalize(entry.name);
  let score = 0;
  for (const token of tokens) {
    const s = token.length >= 2 ? fuzzyScore(name, token) : 0;
    if (!s) return 0;
    score += s * 0.9;
  }
  return score;
}

export type PaletteMode = 'all' | 'parts' | 'commands';
/** "add rogue echo" searches parts only; "> undo" commands only. */
export function parseQuery(query: string): { mode: PaletteMode; text: string } {
  const trimmed = query.trimStart();
  if (/^>/.test(trimmed)) return { mode: 'commands', text: trimmed.slice(1) };
  const add = /^add\s+(.*)$/i.exec(trimmed);
  if (add) return { mode: 'parts', text: add[1] };
  return { mode: 'all', text: trimmed };
}

export interface PaletteSection { label: string; entries: PaletteEntry[] }
export const PALETTE_LIMIT = 60;
/**
 * The palette's result list. With no search: recents (commands and parts, most recent first), then every available
 * command (or, in "add " mode, recents then the catalog in order). With a search: one list ranked by relevance, where
 * recent entries get a boost that fades with age and commands win ties over parts.
 */
export function rankPalette(query: string, commands: readonly PaletteEntry[], parts: readonly PaletteEntry[], recents: readonly string[], limit = PALETTE_LIMIT): PaletteSection[] {
  const { mode, text } = parseQuery(query), tokens = searchTokens(text);
  const pool = mode === 'parts' ? parts : mode === 'commands' ? commands : [...commands, ...parts];
  const recency = new Map(recents.map((key, i) => [key, i]));
  if (!tokens.length) {
    const byKey = new Map(pool.map(e => [e.key, e]));
    const recent = recents.flatMap(key => byKey.get(key) ?? []).slice(0, 8), shown = new Set(recent.map(e => e.key));
    const rest = (mode === 'all' ? commands : pool).filter(e => !shown.has(e.key)).slice(0, Math.max(0, limit - recent.length));
    return [
      { label: 'Recent', entries: recent },
      { label: mode === 'parts' ? 'Parts' : 'Actions', entries: rest },
    ].filter(section => section.entries.length);
  }
  const scored: { entry: PaletteEntry; score: number; recent: number }[] = [];
  for (const entry of pool) {
    let score = paletteScore(entry, tokens);
    if (!score) continue;
    const r = recency.get(entry.key);
    if (r !== undefined) score += Math.max(0.5, 3 - r * 0.25);
    if (entry.kind === 'command') score += 0.25;
    scored.push({ entry, score, recent: r ?? Infinity });
  }
  scored.sort((a, b) => b.score - a.score || a.recent - b.recent || a.entry.order - b.entry.order);
  const entries = scored.slice(0, limit).map(s => s.entry);
  return entries.length ? [{ label: 'Results', entries }] : [];
}

/** Recently run palette entries, persisted per browser (never required). */
export const PALETTE_PREFS_KEY = 'bos-strength-palette-v1', PALETTE_RECENT_LIMIT = 16;
export const pushPaletteRecent = (list: readonly string[], key: string) => [key, ...list.filter(k => k !== key)].slice(0, PALETTE_RECENT_LIMIT);
export function loadPaletteRecents(storage: Pick<Storage, 'getItem'> | undefined): string[] {
  try {
    const data: unknown = JSON.parse(storage?.getItem(PALETTE_PREFS_KEY) ?? 'null');
    const list = data && typeof data === 'object' ? (data as { recent?: unknown }).recent : null;
    return Array.isArray(list) ? [...new Set(list.filter((k): k is string => typeof k === 'string' && /^(command|part):/.test(k)))].slice(0, PALETTE_RECENT_LIMIT) : [];
  } catch { return []; }
}
export function savePaletteRecents(storage: Pick<Storage, 'setItem'> | undefined, recent: readonly string[]) {
  try { storage?.setItem(PALETTE_PREFS_KEY, JSON.stringify({ recent })); } catch { /* private mode: recents stay in memory */ }
}
/** The palette's recents: its own history first, then parts recently added from anywhere (the gallery's recents). */
export const mergedRecents = (palette: readonly string[], galleryParts: readonly string[]) =>
  [...new Set([...palette, ...galleryParts.map(id => `part:${id}`)])];
