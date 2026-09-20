import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGalleryItems, categoryTree, filterItems, scopeItems, searchScore, searchTokens, brandFacets, brandKey, rackFit, rackFitCache,
  pushRecent, toggleFavourite, parsePrefs, loadPrefs, savePrefs, PREFS_KEY, RECENT_LIMIT, gridLayout, visibleRows, moveIndex,
  CATALOG_PART_IDS, CATALOG_SECTIONS, detailRows, type GalleryFilter,
} from './PartGallery/gallery-model.ts';
import { RACK_DEFAULTS } from '../../rack-generator/assembly.ts';
import { RACK_PARTS } from '../../rack-generator/rack-registry.ts';
import { FLOOR_PARTS } from '../../rack-generator/floor-registry.ts';
import type { RackDimensions } from '../../rack-generator/types.ts';

const items = buildGalleryItems();
const none = { recent: [], favourites: [] };
const all: GalleryFilter = { scope: { kind: 'all' }, query: '', brands: [], fitsOnly: false };

test('gallery items cover every catalog part once, in categories, with brand and spec', () => {
  assert.equal(items.length, CATALOG_PART_IDS.length);
  assert.equal(new Set(items.map(i => i.id)).size, items.length);
  assert.ok(items.length > 400, `catalog has ${items.length} parts`);
  for (const item of items) {
    assert.ok(item.name && item.brand && item.category && item.spec, item.id);
    assert.equal(item.haystack, item.haystack.toLowerCase());
  }
  const tree = categoryTree(items);
  assert.deepEqual(tree.slice(0, 2).map(c => c.label), ['Racks & systems', 'Rack attachments']);
  assert.equal(tree.reduce((n, c) => n + c.count, 0), items.length);
  for (const c of tree) assert.equal(c.sections.reduce((n, s) => n + s.count, 0), c.count, c.label);
  assert.ok(tree.find(c => c.label === 'Rack attachments')!.sections.some(s => s.label === 'J-cups & safeties'));
  // Every catalog section lands in a category (27 sections today).
  assert.equal(new Set(items.map(i => i.section)).size, CATALOG_SECTIONS.length);
  assert.equal(items.find(i => i.id === 'j-hook-standard')!.brand, 'BOS STRENGTH');
  assert.equal(items.find(i => i.id === 'cable-ares2')!.kind, 'system');
  assert.equal(items.find(i => i.id === 'upright')!.draggable, false);
  assert.equal(items.find(i => i.id === 'j-hook-standard')!.pairable, true);
});

test('names come from worker definitions when they load', () => {
  const named = buildGalleryItems([{ id: 'upright', name: 'BOS STRENGTH Upright 75', defaults: { height: 2032 } }]);
  const upright = named.find(i => i.id === 'upright')!;
  assert.equal(upright.name, 'Upright 75');
  assert.match(upright.spec, /height 2032 mm/);
  assert.ok(detailRows(upright, { id: 'upright', name: 'x', defaults: { height: 2032 } }).some(([k, v]) => k === 'Height' && v === '2032 mm'));
});

test('scopes: category and section keep section order; recents and favourites keep list order', () => {
  const rack = scopeItems(items, { kind: 'category', category: 'Rack attachments' }, none);
  assert.ok(rack.length > 50 && rack.every(i => i.category === 'Rack attachments'));
  assert.equal(rack[0].section, 'J-hooks & monolifts');
  const sections = rack.map(i => i.section).filter((s, i, a) => a[i - 1] !== s);
  assert.equal(new Set(sections).size, sections.length, 'sections are contiguous');
  const safeties = scopeItems(items, { kind: 'category', category: 'Rack attachments', section: 'Safeties' }, none);
  assert.deepEqual(safeties.map(i => i.id), ['safety-box', 'safety-pin-pipe', 'safety-webbing', 'spotter-arm']);
  const ctx = { recent: ['landmine', 'gone-part', 'olympic-barbell'], favourites: ['cable-kraken'] };
  assert.deepEqual(scopeItems(items, { kind: 'recent' }, ctx).map(i => i.id), ['landmine', 'olympic-barbell']);
  assert.deepEqual(scopeItems(items, { kind: 'favourites' }, ctx).map(i => i.id), ['cable-kraken']);
  assert.equal(scopeItems(items, { kind: 'all' }, none).length, items.length);
});

test('search: every token must match; name prefixes rank first', () => {
  assert.deepEqual(searchTokens('  Rogue   Bench '), ['rogue', 'bench']);
  const results = filterItems(items, { ...all, query: 'rogue bench' }, none);
  assert.ok(results.length > 1);
  for (const item of results) assert.ok(item.haystack.includes('rogue') && item.haystack.includes('bench'), item.id);
  const hooks = filterItems(items, { ...all, query: 'j-hook' }, none);
  assert.equal(hooks[0].id.startsWith('j-hook'), true);
  // Brand and section are searchable too.
  assert.ok(filterItems(items, { ...all, query: 'concept2' }, none).every(i => i.brandKey === 'concept2'));
  assert.ok(filterItems(items, { ...all, query: 'cardio' }, none).length >= 40);
  assert.deepEqual(filterItems(items, { ...all, query: 'zzzz-nothing' }, none), []);
  const barbell = items.find(i => i.id === 'olympic-barbell')!;
  assert.ok(searchScore(barbell, ['olympic']) > searchScore(barbell, ['barbells']));
  assert.equal(searchScore(barbell, ['olympic', 'nope']), 0);
  // Regex metacharacters are literal.
  assert.doesNotThrow(() => filterItems(items, { ...all, query: '(+[' }, none));
});

test('brand chips merge spellings and filter results', () => {
  assert.equal(brandKey('IronMaster'), brandKey('Ironmaster'));
  assert.equal(brandKey('PRIME Fitness USA'), brandKey('PRIME Fitness'));
  assert.equal(brandKey('DIY (lumber build)'), brandKey('DIY (steel beer keg)'));
  assert.equal(brandKey('BowFlex Inc.'), brandKey('BowFlex'));
  const facets = brandFacets(items);
  assert.equal(facets[0].label, 'Rogue Fitness');
  assert.equal(new Set(facets.map(f => f.key)).size, facets.length);
  assert.equal(facets.reduce((n, f) => n + f.count, 0), items.length);
  const rogueRep = filterItems(items, { ...all, brands: [brandKey('Rogue Fitness'), brandKey('REP Fitness')] }, none);
  assert.ok(rogueRep.length > 100 && rogueRep.every(i => ['Rogue Fitness', 'REP Fitness'].includes(i.brand)));
  const cardio = filterItems(items, { ...all, scope: { kind: 'category', category: 'Cardio' }, brands: [brandKey('Concept2')] }, none);
  assert.ok(cardio.length && cardio.every(i => i.category === 'Cardio' && i.brand === 'Concept2'));
});

test('fits my rack: bore and fit rules on the current rack; non-rack parts are unaffected', () => {
  const stock = RACK_DEFAULTS as RackDimensions, fiveEighths: RackDimensions = { ...stock, tube: 50.8, holeDiameter: 17.5, pitch: 50.8 };
  assert.equal(rackFit('olympic-barbell', stock), null);
  assert.equal(rackFit('j-hook-standard', stock), null);
  assert.equal(rackFit('rep-utility-seat', stock), null, 'hosted parts fit wherever their host does');
  const stockFits = RACK_PARTS.map(p => rackFit(p.id, stock)).filter(f => f !== null);
  assert.ok(stockFits.length > 50, `${stockFits.length} checked`);
  assert.deepEqual(stockFits.filter(f => !f.fits), [], 'every upright and rail attachment fits the stock BOS 3x3 rack');
  const small = RACK_PARTS.map(p => [p.id, rackFit(p.id, fiveEighths)] as const);
  const refused = small.filter(([, f]) => f && !f.fits);
  assert.ok(refused.length > 10, 'many 3x3, 1-inch attachments refuse a 2x2 rack with 5/8-inch holes');
  assert.ok(refused.some(([, f]) => /hardware/.test(f!.reason!)) && refused.some(([, f]) => /3 ?x ?3|3 in/.test(f!.reason!)));
  for (const [, f] of refused) assert.ok(f!.reason && f!.reason.length > 5);
  const fit = rackFitCache(fiveEighths);
  const filtered = filterItems(items, { ...all, fitsOnly: true }, { ...none, fit });
  assert.equal(filtered.length, items.length - refused.length);
  for (const [id] of refused) assert.ok(!filtered.some(i => i.id === id), id);
  assert.ok(filtered.some(i => i.id === FLOOR_PARTS[0].id), 'floor items stay');
  assert.equal(fit(refused[0][0]), fit(refused[0][0]), 'cached');
});

test('recents and favourites: most recent first, bounded, tolerant storage', () => {
  let recent: string[] = [];
  for (const id of ['a', 'b', 'c', 'a']) recent = pushRecent(recent, id);
  assert.deepEqual(recent, ['a', 'c', 'b']);
  for (let i = 0; i < 30; i++) recent = pushRecent(recent, `p${i}`);
  assert.equal(recent.length, RECENT_LIMIT);
  assert.equal(recent[0], 'p29');
  assert.deepEqual(toggleFavourite(['x'], 'y'), ['y', 'x']);
  assert.deepEqual(toggleFavourite(['y', 'x'], 'y'), ['x']);
  assert.deepEqual(parsePrefs('not json'), { recent: [], favourites: [] });
  assert.deepEqual(parsePrefs('{"recent":"x","favourites":[1,"a","a","b"]}'), { recent: [], favourites: ['a', 'b'] });
  assert.deepEqual(parsePrefs('{"recent":["j-hook-standard","nope"]}', id => CATALOG_PART_IDS.includes(id as never)).recent, ['j-hook-standard']);
  const memory = new Map<string, string>();
  const storage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => { memory.set(k, v); } };
  savePrefs(storage, { recent: ['landmine'], favourites: ['dip-horn'] });
  assert.deepEqual(JSON.parse(memory.get(PREFS_KEY)!), { recent: ['landmine'], favourites: ['dip-horn'] });
  assert.deepEqual(loadPrefs(storage), { recent: ['landmine'], favourites: ['dip-horn'] });
  const broken = { getItem: () => { throw Error('SecurityError'); }, setItem: () => { throw Error('QuotaExceeded'); } };
  assert.deepEqual(loadPrefs(broken), { recent: [], favourites: [] });
  assert.doesNotThrow(() => savePrefs(broken, { recent: [], favourites: [] }));
  assert.deepEqual(loadPrefs(undefined), { recent: [], favourites: [] });
});

test('grid layout windows rows and moves the keyboard cursor across section breaks', () => {
  const sample = [...Array(5)].map(() => ({ section: 'A', category: 'Cat' })).concat([...Array(3)].map(() => ({ section: 'B', category: 'Cat' })));
  const layout = gridLayout(sample, 3, { grouped: true, rowHeight: 100, headerHeight: 30, gap: 10 });
  assert.deepEqual(layout.rows.map(r => r.kind), ['header', 'cards', 'cards', 'header', 'cards']);
  assert.equal(layout.rows[0].kind === 'header' && layout.rows[0].label, 'Cat · A');
  assert.equal(layout.height, 30 + 110 + 110 + 30 + 110);
  assert.deepEqual(layout.rowOf, [1, 1, 1, 2, 2, 4, 4, 4]);
  assert.equal(moveIndex(layout, 1, 'ArrowDown'), 4);
  assert.equal(moveIndex(layout, 2, 'ArrowDown'), 4, 'clamps to the shorter row');
  assert.equal(moveIndex(layout, 4, 'ArrowDown'), 6, 'crosses the section header');
  assert.equal(moveIndex(layout, 7, 'ArrowDown'), 7, 'stays at the bottom edge');
  assert.equal(moveIndex(layout, 5, 'ArrowUp'), 3);
  assert.equal(moveIndex(layout, 0, 'ArrowLeft'), 0);
  assert.equal(moveIndex(layout, 4, 'ArrowRight'), 5);
  assert.equal(moveIndex(layout, 3, 'End'), 7);
  assert.equal(moveIndex(layout, 3, 'Home'), 0);
  assert.equal(moveIndex(layout, 0, 'PageDown', 2), 5);
  assert.equal(moveIndex(layout, 0, 'Enter'), null);
  const flat = gridLayout(sample, 4, { grouped: false, rowHeight: 100, headerHeight: 30, gap: 10 });
  assert.deepEqual(flat.rows.map(r => r.kind), ['cards', 'cards']);
  const big = gridLayout([...Array(1000)].map(() => ({ section: 'A', category: 'A' })), 5, { grouped: false, rowHeight: 100, headerHeight: 30, gap: 10 });
  const [first, last] = visibleRows(big, 5500, 800, 1);
  assert.ok(first >= 48 && first <= 50 && last - first < 12, `${first}..${last}`);
  assert.deepEqual(visibleRows(gridLayout([], 3, { grouped: true, rowHeight: 1, headerHeight: 1, gap: 0 }), 0, 100), [0, -1]);
});
