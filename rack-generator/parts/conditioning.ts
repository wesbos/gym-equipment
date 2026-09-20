/** Sleds, battle ropes and plyo boxes: Manifold builders for the entries in ../floor-parts/conditioning.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `floorDefinition(PART, build)` per entry.
 * Sled builders live in ./conditioning-sleds.ts, rope/box/jump-rope builders in ./conditioning-soft.ts, shared kit in ./conditioning-kit.ts. */
import type { PartDefinition } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import {
  AMAZON_BASICS_BATTLE_ROPE, DOG_SLED, GAMES_BOX_DIMS, REP_PLYO_SIZES, REP_ROPE_COLOURS, REP_SLEEVE_BATTLE_ROPE, REP_SOFT_PLYO_BOX, ROGUE_DOG_SLED,
  ROGUE_ECHO_DOG_SLED, ROGUE_GAMES_BOX, ROGUE_PRO_JUMP_ROPE, ROGUE_SLICE_SLED, TITAN_BATTLE_ROPE, TITAN_PRO_SLED, TITAN_SLED, TITAN_SOFT_PLYO_BOX,
  TORQUE_TANK_M1, amazonRope, repRope, titanRope,
} from '../floor-parts/conditioning.ts';
import { buildEchoSled, buildSliceSled, buildTankM1, buildTubeSled } from './conditioning-sleds.ts';
import { buildBattleRope, buildJumpRope, buildSoftPlyoBox, buildWoodPlyoBox } from './conditioning-soft.ts';
import type { Mat } from './conditioning-kit.ts';
const POLY_BLACK: Mat = ['Black 3-strand poly dacron', 'source', '#232325', 0, .86];
const HEAT_SHRINK: Mat = ['Glossy black heat-shrink grips', 'handle', '#0f1011', 0, .38];
const WHITE: Mat = ['White printed grip logo', 'source', '#ecebe6', 0, .5];
export const definitions: PartDefinition[] = [
  floorDefinition(TORQUE_TANK_M1, buildTankM1),
  floorDefinition(ROGUE_SLICE_SLED, buildSliceSled),
  floorDefinition(ROGUE_ECHO_DOG_SLED, buildEchoSled),
  floorDefinition(TITAN_PRO_SLED, (api, p) => buildTubeSled(api, TITAN_SLED, p)),
  floorDefinition(ROGUE_DOG_SLED, (api, p) => buildTubeSled(api, DOG_SLED, p)),
  floorDefinition(AMAZON_BASICS_BATTLE_ROPE, (api, p) => buildBattleRope(api, amazonRope(p), p.pose, {
    body: POLY_BLACK, grip: HEAT_SHRINK, tracer: ['Yellow tracer yarn', 'source', '#e0b41e', 0, .6], label: { text: 'amazon basics', mat: WHITE, width: 150 } })),
  floorDefinition(REP_SLEEVE_BATTLE_ROPE, (api, p) => { const c = REP_ROPE_COLOURS[p.color]; if (!c) throw Error('Unsupported battle rope colour.'); return buildBattleRope(api, repRope(p), p.pose, {
    body: [`${c.name} nylon sleeve`, 'source', c.color, 0, .8], grip: ['Black moulded rubber handles', 'handle', '#131415', 0, .42], label: { text: 'REP', mat: WHITE, width: 120 } }); }),
  floorDefinition(TITAN_BATTLE_ROPE, (api, p) => buildBattleRope(api, titanRope(p), p.pose, { body: POLY_BLACK, grip: HEAT_SHRINK, label: { text: 'TITAN', mat: WHITE, width: 105 } })),
  floorDefinition(REP_SOFT_PLYO_BOX, (api, p) => buildSoftPlyoBox(api, REP_PLYO_SIZES[p.size].dims, p.height, 'rep')),
  floorDefinition(TITAN_SOFT_PLYO_BOX, (api, p) => buildSoftPlyoBox(api, GAMES_BOX_DIMS, p.height, 'titan')),
  floorDefinition(ROGUE_GAMES_BOX, (api, p) => buildWoodPlyoBox(api, GAMES_BOX_DIMS, p.height)),
  floorDefinition(ROGUE_PRO_JUMP_ROPE, (api, p) => buildJumpRope(api, p.length, p.pose)),
];
