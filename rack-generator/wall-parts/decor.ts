/** Room decor (#201): wall-mounted openings, banners and fixtures. Metadata only (main bundle): never import Manifold
 * builders here. Family slot: wall-registry.ts spreads PARTS. Research: ../research/decor.md. Builders: ../parts/decor-wall.ts.
 * Wall axes: X along the wall, -Y out of it, Z up; origin at the face centre on the wall surface.
 *
 * Openings (windows, doors) cannot cut the builder's wall planes, so they are built proud of the surface: casing, a
 * bevelled jamb return and a self-lit glass pane read as a window in the wall. `standoff` pushes an opening out from the
 * room wall onto the face of a decor wall section (a thick return or partition standing in front of it). */
import { defineWallPart } from '../wall-part.ts';
import type { NumericParams } from '../types.ts';
import type { VendorAttribution } from '../vendor-metadata.ts';

export const inch = (v: number) => v * 25.4;
const range = (a: number, b: number, step: number) => Array.from({ length: Math.round((b - a) / step) + 1 }, (_, i) => a + i * step);
const COOP = 'https://www.youtube.com/watch?v=QCfulhfSSNo';
const generic = (product: string, reconstruction: string, url = COOP): VendorAttribution => ({
  vendor: 'Generic', url, credit: `Generic — ${product}`, trademark: 'Generic building product; no brand shown.', reconstruction,
});
const pick = <T,>(list: readonly T[], i: number, what: string) => { const v = list[i]; if (v === undefined) throw Error(`Unsupported ${what}.`); return v; };

// ── Windows ───────────────────────────────────────────────────────────────────────────────────────────
export const WINDOW = { casing: 70, sash: 55, stool: 30 } as const;
export const WINDOW_STYLES = ['Hopper', 'Slider', 'Picture', 'Casement'] as const;
export const STANDOFFS = range(0, 4000, 100);
const standoffParam = { key: 'standoff', label: 'Wall standoff', default: 0, options: STANDOFFS, format: (v: number) => v ? `${v} mm out` : 'On the wall' };
export const windowSize = (p: NumericParams) => ({ w: inch(p.width), h: inch(p.height) });
export const DECOR_WINDOW = defineWallPart({
  id: 'decor-window', name: 'Window', title: 'Vinyl window with casing', noun: 'window', section: 'Wall decor',
  description: 'A white vinyl window with a flat painted casing and a drywall return: clerestory hoppers and sliders for a basement stem wall, or a big picture window. The glass is a softly lit daylight pane. Independent reconstruction of a generic window; no brand shown.',
  params: [
    { key: 'style', label: 'Style', default: 0, options: [0, 1, 2, 3], format: (v: number) => WINDOW_STYLES[v] ?? String(v) },
    { key: 'width', label: 'Width', default: 36, options: range(20, 84, 4), format: (v: number) => `${v}″` },
    { key: 'height', label: 'Height', default: 16, options: range(12, 72, 2), format: (v: number) => `${v}″` },
    standoffParam,
  ],
  face: p => { const { w, h } = windowSize(p); return { width: w + 2 * WINDOW.casing, height: h + 2 * WINDOW.casing }; },
  // The rough opening is cut from the wall finish; on a standoff (in front of a wall section) nothing is cut.
  opening: p => p.standoff ? { width: 0, height: 0 } : { width: windowSize(p).w, height: windowSize(p).h },
  depth: 60, height: 2050,
  vendor: generic('vinyl window and casing', 'Sizes are nominal glass openings in whole inches; the casing (70 mm), sash frames (55 mm) and the bevelled return are estimated from Coop’s basement tour (8:30–8:45). Built proud of the wall because wall planes cannot be cut. Scenery only, excluded from print export.'),
});

// ── Interior door ─────────────────────────────────────────────────────────────────────────────────────
export const DOOR = { height: inch(80), casing: 64, leaf: 35 } as const;
export const DECOR_DOOR = defineWallPart({
  id: 'decor-interior-door', name: 'Interior door', title: 'Six-panel interior door with casing', noun: 'door', section: 'Wall decor',
  description: 'A white six-panel interior door, 80″ tall, with flat casing and a black lever. Hang it closed or standing open into the room. Independent reconstruction of a generic door; no brand shown.',
  params: [
    { key: 'width', label: 'Width', default: 32, options: [28, 30, 32, 36], format: (v: number) => `${v}″` },
    { key: 'open', label: 'Leaf', default: 0, options: [0, 1, 2], format: (v: number) => ['Closed', 'Open, hinge left', 'Open, hinge right'][v] ?? String(v) },
    standoffParam,
  ],
  face: p => ({ width: inch(p.width) + 2 * DOOR.casing, height: DOOR.height + DOOR.casing }),
  opening: p => p.standoff ? { width: 0, height: 0 } : { width: inch(p.width), height: DOOR.height },
  depth: 45, height: (DOOR.height + DOOR.casing) / 2,
  vendor: generic('six-panel interior door', 'Published standard: 80″ slab heights and 28–36″ widths, 1-3/8″ thick. Panel layout, casing width and lever estimated from photos. An open leaf swings 90° into the room. Scenery only, excluded from print export.'),
});

// ── Bay window alcove ─────────────────────────────────────────────────────────────────────────────────
/** A bay behind the wall: 45° side walls, each with a window, and a big picture window in the back wall. */
export const bayLayout = (p: NumericParams) => {
  const side = p.depth * Math.SQRT2, back = p.width - 2 * p.depth;
  if (back < 900) throw Error('The bay is too deep for its width.');
  const sideWindow = Math.min(side - 300, inch(34)), backWindow = Math.min(back - 300, inch(72));
  return { side, back, sideWindow, backWindow };
};
export const BAY_WINDOW = defineWallPart({
  id: 'decor-bay-window', name: 'Bay window', title: 'Bay window alcove', noun: 'bay window', section: 'Wall decor', opening: true,
  description: 'A walk-in bay built out past the wall: 45° side walls with a window in each and a big picture window at the back, a birch plywood wainscot below the sills and a flat ceiling, like the desk nook in Coop’s basement. The wall is cut away for its mouth. Independent reconstruction; no brand shown.',
  params: [
    { key: 'width', label: 'Mouth width', default: 4200, options: range(2400, 6000, 100), format: (v: number) => `${v} mm` },
    { key: 'depth', label: 'Depth', default: 1100, options: range(500, 2000, 50), format: (v: number) => `${v} mm` },
    { key: 'mouth', label: 'Mouth height', default: 2650, options: range(2000, 3500, 25), format: (v: number) => `${v} mm` },
    { key: 'sill', label: 'Sill height', default: 800, options: range(450, 1300, 25), format: (v: number) => `${v} mm` },
    { key: 'head', label: 'Window head height', default: 2250, options: range(1500, 3300, 25), format: (v: number) => `${v} mm` },
  ],
  validate: p => { bayLayout(p); if (p.head < p.sill + 450 || p.head > p.mouth - 50) throw Error('Bay windows need 450 mm of glass below the mouth.'); },
  face: p => ({ width: p.width, height: p.mouth }), depth: 20, height: 1325,
  vendor: generic('bay window alcove', 'Coop’s bay: a picture window flanked by two windows on angled walls behind his desk (8:35–8:45, 9:45). The 45° sides, depth, sill and head heights and the birch wainscot are estimated. Built behind the wall plane and seen through the cut-away mouth.' + ' Scenery only, excluded from print export.'),
});

// ── Banners ───────────────────────────────────────────────────────────────────────────────────────────
export interface BannerSpec { w: number; h: number; field: string; border: string; ink: string; lines: readonly string[]; cap: number; bw: number; weight?: number; track?: number }
export const AMERICAN_MADE: BannerSpec = { w: inch(72), h: inch(22), field: '#1f2b45', border: '#b12a31', ink: '#efe9dc', lines: ['AMERICAN MADE'], cap: 250, bw: 42 };
export const STAY_WEIRD: BannerSpec = { w: inch(60), h: inch(36), field: '#efe2c3', border: '#141414', ink: '#141414', lines: ['STAY', 'WEIRD'], cap: 330, bw: 48, weight: .3, track: .05 };
export const BANNER_SIZES = [[60, 36], [72, 24], [72, 48], [48, 24]] as const;
export const BANNER_FIELDS = [['Navy', '#1f2b45'], ['Black', '#161718'], ['Red', '#a8262c'], ['Cream', '#efe2c3'], ['Forest green', '#23402d']] as const;
export const BANNER_BORDERS = [['No border', ''], ['Red', '#b12a31'], ['Black', '#141414'], ['White', '#efe9dc'], ['Gold', '#c59a3c']] as const;
export function genericBanner(p: NumericParams): BannerSpec {
  const [wi, hi] = pick(BANNER_SIZES, p.size, 'banner size'), field = pick(BANNER_FIELDS, p.color, 'banner colour')[1], border = pick(BANNER_BORDERS, p.border, 'banner border')[1];
  return { w: inch(wi), h: inch(hi), field, border, ink: field, lines: [], cap: 0, bw: border ? 45 : 0 };
}
const bannerFace = (s: BannerSpec) => ({ width: s.w, height: s.h });
const BANNER_NOTE = 'Felt or canvas panel with a sewn border and brass grommets; lettering is plain block capitals built as geometry (not the maker’s lettering or any logo art). Size and colours estimated from Coop’s tour. Scenery only, excluded from print export.';
export const BANNER_AMERICAN_MADE = { ...defineWallPart({
  id: 'decor-banner-american-made', name: '“American Made” banner', title: '“American Made” felt banner', noun: 'banner', section: 'Wall decor',
  description: 'A 72″ × 22″ navy felt banner with a red border and cream “AMERICAN MADE” lettering, as over the storage shelving in Coop’s cove. Independent reconstruction of a generic felt banner; no brand shown.',
  params: [], face: bannerFace(AMERICAN_MADE), depth: 8, height: 2250,
  vendor: generic('“American Made” felt banner', BANNER_NOTE),
}), spec: AMERICAN_MADE };
export const BANNER_STAY_WEIRD = { ...defineWallPart({
  id: 'decor-banner-stay-weird', name: '“Stay Weird” banner', title: '“Stay Weird” canvas banner', noun: 'banner', section: 'Wall decor',
  description: 'A 60″ × 36″ cream canvas banner with a black border and bold black “STAY WEIRD” on two lines, as over Coop’s treadmill. Independent reconstruction of a generic canvas banner; no brand shown.',
  params: [], face: bannerFace(STAY_WEIRD), depth: 8, height: 1850,
  vendor: generic('“Stay Weird” canvas banner', BANNER_NOTE),
}), spec: STAY_WEIRD };
export const FABRIC_BANNER = defineWallPart({
  id: 'decor-fabric-banner', name: 'Fabric banner', title: 'Plain fabric banner', noun: 'banner', section: 'Wall decor',
  description: 'A plain felt or canvas wall banner with an optional sewn border and brass grommets, in four sizes and five colours. Independent reconstruction of a generic banner; no brand shown.',
  params: [
    { key: 'size', label: 'Size', default: 0, options: [0, 1, 2, 3], format: (v: number) => BANNER_SIZES[v] ? `${BANNER_SIZES[v][0]}″ × ${BANNER_SIZES[v][1]}″` : String(v) },
    { key: 'color', label: 'Colour', default: 0, options: [0, 1, 2, 3, 4], format: (v: number) => BANNER_FIELDS[v]?.[0] ?? String(v) },
    { key: 'border', label: 'Border', default: 1, options: [0, 1, 2, 3, 4], format: (v: number) => BANNER_BORDERS[v]?.[0] ?? String(v) },
  ],
  face: p => bannerFace(genericBanner(p)), depth: 8, height: 2000,
  vendor: generic('fabric banner', BANNER_NOTE),
});

// ── Speakers and TV ───────────────────────────────────────────────────────────────────────────────────
/** Sonos Five: published 203 × 364 × 154 mm (W × H × D standing on end), 6.4 kg. */
export const SONOS_FIVE = { w: 203, h: 364, d: 154, bracket: 26 } as const;
export const SONOS_FIVE_WALL = defineWallPart({
  id: 'sonos-five-wall-mount', name: 'Sonos Five', title: 'Sonos Five on a wall mount', noun: 'speaker', section: 'Wall decor',
  description: 'A Sonos Five speaker stood on end on a slim wall bracket, in matte black or white, as Coop’s stereo pair flanks his gym. Independent reconstruction; Sonos trademarks belong to Sonos, Inc.',
  params: [
    { key: 'orientation', label: 'Orientation', default: 0, options: [0, 1], format: (v: number) => v ? 'Horizontal' : 'Vertical' },
    { key: 'color', label: 'Colour', default: 0, options: [0, 1], format: (v: number) => v ? 'White' : 'Black' },
  ],
  face: p => p.orientation ? { width: SONOS_FIVE.h, height: SONOS_FIVE.w } : { width: SONOS_FIVE.w, height: SONOS_FIVE.h },
  depth: SONOS_FIVE.d + SONOS_FIVE.bracket, height: 2200,
  vendor: { vendor: 'Sonos', url: 'https://www.sonos.com/en-us/shop/five', credit: 'Sonos — Five', trademark: 'Sonos and Sonos Five are trademarks of Sonos, Inc.',
    reconstruction: 'Published: 203 × 364 × 154 mm. Rounded front profile, grille perforation (shown as a darker field), wordmark and the slim wall bracket are estimated from product photos and Coop’s tour (10:37–10:48). Scenery only, excluded from print export.' },
});
export const TV_SIZES = [43, 50, 55, 65, 75] as const;
/** 16:9 panel with a thin bezel: diagonal inches → [width, height] mm. */
export const tvPanel = (p: NumericParams) => { const d = inch(pick(TV_SIZES, p.size, 'TV size')); return { w: d * 16 / Math.hypot(16, 9) + 12, h: d * 9 / Math.hypot(16, 9) + 12 }; };
export const WALL_TV = defineWallPart({
  id: 'decor-wall-tv', name: 'Wall TV', title: 'Flat-screen TV on a wall mount', noun: 'television', section: 'Wall decor',
  description: 'A 43–75″ flat-screen TV on a low-profile wall mount, for timers, programming or the game. Independent reconstruction of a generic TV; no brand shown.',
  params: [{ key: 'size', label: 'Size', default: 2, options: [0, 1, 2, 3, 4], format: (v: number) => TV_SIZES[v] ? `${TV_SIZES[v]}″` : String(v) }],
  face: p => { const { w, h } = tvPanel(p); return { width: w, height: h }; }, depth: 75, height: 1900,
  vendor: generic('wall-mounted TV', 'A 16:9 panel from the nominal diagonal with a 6 mm bezel, a 30 mm body and a 45 mm mount. Scenery only, excluded from print export.'),
});

export const PARTS = [DECOR_WINDOW, DECOR_DOOR, BAY_WINDOW, BANNER_AMERICAN_MADE, BANNER_STAY_WEIRD, FABRIC_BANNER, SONOS_FIVE_WALL, WALL_TV] as const;
