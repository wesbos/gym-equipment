import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAssembly, resolveAssembly } from '../../rack-generator/assembly.ts';
import { definitions } from '../../rack-generator/catalog.ts';
import { isSystemPart } from '../../rack-generator/system-types.ts';
import { PLATE_SPECS } from '../../rack-generator/plates.ts';
import { cleanDocument } from '../state/history.ts';
import { GYM_FIELDS, sourceName, type GymEntry } from './types.ts';

/** Every gallery gym (#184) is checked straight off disk, the same files the gallery's `import.meta.glob` loads. */
const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, 'data');
const publicDir = path.join(here, '../../public/gyms');
const MAX_PREVIEW_BYTES = 200 * 1024;
const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json')).sort();
const partIds = new Set(definitions.map(d => d.id));

/** Every catalog part a document names, with where it came from. */
function partsOf(doc: GymEntry['doc']): [string, string][] {
  return [
    ...Object.entries(doc.structure).map(([id, v]): [string, string] => [`structure ${id}`, v.part]),
    ...doc.accessories.map((a): [string, string] => [`accessory ${a.id}`, a.part]),
    ...(doc.floorItems ?? []).map((f): [string, string] => [`floor item ${f.id}`, f.part]),
    ...(doc.wallItems ?? []).map((w): [string, string] => [`wall item ${w.id}`, w.part]),
    ...(doc.hangItems ?? []).map((h): [string, string] => [`hang item ${h.id}`, h.part]),
  ];
}
function platesOf(doc: GymEntry['doc']): string[] {
  const loads = (doc.floorItems ?? []).flatMap(f => (f.plates ? Object.values(f.plates).flat() : []));
  return [...doc.accessories.flatMap(a => a.plates ?? []), ...loads];
}

/** A Gym Radar source must be the gym's own page (its slug is the file name); any other source is an https page. */
function isSourceUrl(sourceUrl: string, slug: string) {
  let url: URL;
  try { url = new URL(sourceUrl); } catch { return false; }
  if (url.protocol !== 'https:') return false;
  if (url.hostname.replace(/^www\./, '') === 'gymradar.com') return url.href === `https://gymradar.com/gym/${slug}`;
  return true;
}

test('a gym source is its Gym Radar page or another https page, credited by site', () => {
  assert.ok(isSourceUrl('https://gymradar.com/gym/cable-compound', 'cable-compound'));
  assert.ok(!isSourceUrl('https://gymradar.com/gym/someone-else', 'cable-compound'), 'a Gym Radar URL names this gym');
  assert.ok(isSourceUrl('https://www.youtube.com/watch?v=QCfulhfSSNo', 'coop-garage-gym-reviews'));
  assert.ok(!isSourceUrl('http://www.youtube.com/watch?v=QCfulhfSSNo', 'coop-garage-gym-reviews'), 'https only');
  assert.ok(!isSourceUrl('not a url', 'cable-compound'));
  assert.equal(sourceName('https://gymradar.com/gym/cable-compound'), 'Gym Radar');
  assert.equal(sourceName('https://www.youtube.com/watch?v=QCfulhfSSNo'), 'YouTube');
  assert.equal(sourceName('https://youtu.be/QCfulhfSSNo'), 'YouTube');
  assert.equal(sourceName('https://www.garagegymreviews.com/some-tour'), 'garagegymreviews.com');
});

test('the gym data directory holds only gym JSON files', () => {
  assert.ok(fs.existsSync(dataDir));
  for (const file of fs.readdirSync(dataDir).filter(f => !f.startsWith('.'))) assert.match(file, /^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/, `${file}: name gyms <slug>.json`);
});

for (const file of files) {
  const slug = file.replace(/\.json$/, '');
  test(`gym ${slug} matches the gallery data contract`, () => {
    const gym = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')) as GymEntry;
    assert.deepEqual(Object.keys(gym).sort(), [...GYM_FIELDS].sort(), 'exactly the contract fields');
    assert.equal(gym.slug, slug, 'slug matches the file name');
    for (const key of ['title', 'owner', 'summary'] as const) assert.ok(typeof gym[key] === 'string' && gym[key].trim(), `${key} is required`);
    assert.ok(isSourceUrl(gym.sourceUrl, slug), `sourceUrl ${gym.sourceUrl} is this gym's Gym Radar page or another https page`);
    for (const key of ['highlights', 'equipment'] as const) {
      assert.ok(Array.isArray(gym[key]) && gym[key].length > 0, `${key} is a non-empty list`);
      for (const item of gym[key]) assert.ok(typeof item === 'string' && item.trim(), `${key} entries are text`);
    }
    const preview = path.join(publicDir, `${slug}.webp`);
    assert.ok(fs.existsSync(preview), `public/gyms/${slug}.webp exists (npx tsx scripts/render-gym-previews.ts ${slug})`);
    const bytes = fs.statSync(preview).size;
    assert.ok(bytes > 1000 && bytes <= MAX_PREVIEW_BYTES, `preview is ${Math.round(bytes / 1024)} KB; keep it under ~150 KB`);
    assert.equal(fs.readFileSync(preview).subarray(8, 12).toString('ascii'), 'WEBP', 'preview is a WebP image');
  });

  test(`gym ${slug} is a valid builder document built from catalog parts`, () => {
    const { doc } = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')) as GymEntry;
    const valid = validateAssembly(doc);
    // Opening a gym goes through cleanDocument; it must keep every piece the file lists.
    const cleaned = cleanDocument(doc);
    for (const key of ['accessories', 'floorItems', 'wallItems', 'hangItems', 'systems'] as const)
      assert.deepEqual((cleaned[key] ?? []).map(item => item.id), (doc[key] ?? []).map(item => item.id), `${key} survive validation`);
    assert.deepEqual(Object.keys(valid.structure).sort(), Object.keys(doc.structure).sort(), 'structure survives validation');
    assert.deepEqual(doc.room && cleaned.room, doc.room, 'room survives validation');
    for (const [where, part] of partsOf(doc)) assert.ok(partIds.has(part), `${where}: ${part} is a catalog part`);
    for (const system of doc.systems ?? []) assert.ok(isSystemPart(system.part), `system ${system.id}: ${system.part} is a catalog system`);
    for (const plate of platesOf(doc)) assert.ok(PLATE_SPECS[plate as keyof typeof PLATE_SPECS], `plate ${plate} exists`);
    assert.ok(resolveAssembly(cleaned).length > 0, 'the document resolves to a scene');
  });
}
