import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partAttribution } from './attribution.ts';
import { catalog } from './catalog.ts';
import { SYSTEM_PARTS } from './system-types.ts';
import { FLOOR_PART_IDS } from './floor-registry.ts';
import { DARKO_IDS, VOLTRA_IDS, vendorAttribution } from './vendor-metadata.ts';

test('all catalog export consumers share complete product identity', () => {
  assert.equal(catalog.attribution, partAttribution);
  for (const id of SYSTEM_PARTS) {
    const credit = partAttribution(id)!;
    assert.equal(credit.vendor, id === 'cable-kraken' ? 'Bells of Steel' : 'REP Fitness');
    assert.match(credit.url, id === 'cable-kraken' ? /^https:\/\/bellsofsteel.com\// : /^https:\/\/repfitness.com\//);
    assert.ok(credit.credit && credit.trademark && credit.reconstruction);
  }
  for (const id of [...DARKO_IDS, ...VOLTRA_IDS, ...FLOOR_PART_IDS])
    assert.deepEqual(partAttribution(id), vendorAttribution(id));
  assert.equal(partAttribution('upright'), undefined);
});
