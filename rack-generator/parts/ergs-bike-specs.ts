/** Per-model geometry for the air-bike engine (ergs-bikes.ts). Envelope numbers come from the metadata (published);
 * every other coordinate is scaled off near-side-on product photos (see research/ergs.md), in mm, +Y toward the fan. */
import type { AirBikeSpec } from './ergs-bikes.ts';
import { AIR_BIKES } from '../floor-parts/ergs.ts';

const WHITE = '#eeeeea';

/** Rogue Echo Bike V3.0: 55 × 29.5 × 52.25 in; 27 in, 10-blade steel fan in a full steel-wire guard; textured black steel. */
export function echoBike(): AirBikeSpec {
  const { length: L, width: W, height: H } = AIR_BIKES.echo, front = L / 2, rear = -L / 2, fan = { d: 766, y: front - 384.5, z: 510 };
  return {
    label: 'Rogue Echo Bike', L, W, H, frame: '#2b2d30', accent: '#2b2d30', roughness: .78,
    fan: { ...fan, width: 150, blades: 10, bladeD: 686, bladeW: 76, guard: 'wire', spokes: 96, rings: 5, bands: 9, guardColor: '#1b1c1e', bladeColor: '#26282a' },
    feet: { front: { y: 372, w: 603, wheel: 76 }, rear: { y: -636, w: 603 } },
    tubes: [
      // Fork legs either side of the fan, foot to hub and up to the arm pivots.
      { pts: [[92, 382, 52], [92, 296, 612]], rect: [22, 62], mirror: true },
      // Backbone: drive housing to a crossbar behind the cage, side rails forward to the hub ("ECHO BIKE" rail on the right).
      { pts: [[0, -205, 330], [0, -96, 400]], rect: [64, 90] },
      { pts: [[-92, -96, 400], [92, -96, 400]], rect: [60, 70] },
      { pts: [[92, -96, 400], [92, 300, 506]], rect: [22, 84], mirror: true },
      // Seat tube and rear leg to the rear stabiliser.
      { pts: [[0, -238, 260], [0, -412, 792]], rect: [72, 72] },
      { pts: [[0, -300, 330], [0, -636, 58]], rect: [58, 58] },
      { pts: [[0, -255, 150], [0, -300, 330]], rect: [58, 58] },
    ],
    drive: { y: -250, z: 285, d: 300, t: 112, color: '#1b1c1e' },
    crank: 170, crankAngle: 15,
    seat: { post: [[0, -405, 770], [0, -445, 866]], slider: [rear, rear + 300, 884], saddle: [-560, 952], saddleColor: '#141516', stitch: '#b3232b' },
    arms: { path: [[122, 352, 408], [122, 306, 548], [134, 196, 1150], [140, 182, 1262], [150, 176, H - 20]], grip: [[152, 174, H - 19], [W / 2 - 19, -46, H - 19]], d: 40, gripD: 38,
      link: [[122, 352, 408], [80, -86, 330]] },
    console: { mast: [[0, -90, 470], [0, -60, 760], [0, 70, 1060]], at: [0, 88, 1150], size: [170, 250, 50], tilt: 18, screen: '#9cb9ad' },
    pegs: { y: 322, z: 452, x0: 104, x1: 250 },
    plates: [
      { a: [103.6, 377, 110], b: [103.6, 330, 420], h: 36, color: WHITE, mirror: true },
      { a: [103.6, 40, 443], b: [103.6, 230, 478], h: 30, color: WHITE },
    ],
  };
}

/** AssaultBike Classic: 50.95 × 23.34 × 50 in; black round-tube frame, wire-guarded steel fan, U-shaped rear foot and a centre floor rail. */
export function assaultClassic(): AirBikeSpec {
  const { length: L, width: W, height: H } = AIR_BIKES.assault, front = L / 2, rear = -L / 2, fan = { d: 650, y: front - 326.5, z: 431 };
  return {
    label: 'AssaultBike Classic', L, W, H, frame: '#1b1c1e', accent: '#c21f2a', roughness: .5,
    fan: { ...fan, width: 140, blades: 10, bladeD: 606, bladeW: 88, guard: 'wire', spokes: 64, rings: 7, bands: 8, guardColor: '#18191a', bladeColor: '#202123' },
    feet: { front: { y: 262, w: 560, wheel: 70, wheelY: 440 }, rear: { y: rear + 21, w: 520, u: 200 } },
    tubes: [
      // Fork legs outside the cage, rising past the fan to a crown that carries the console mast.
      { pts: [[87, 280, 45], [87, 300, 800]], rect: [26, 58], mirror: true },
      { pts: [[-87, 300, 806], [87, 300, 806]], d: 44 },
      // Centre floor rail from the rear U to the front foot, backbone to the fan, seat tube and the curved rear stay.
      { pts: [[0, rear + 60, 30], [0, -540, 94], [0, 230, 94], [0, 262, 50]], d: 50 },
      { pts: [[0, -222, 256], [0, -30, 395]], d: 52 },
      { pts: [[-87, -30, 400], [87, -30, 400]], d: 44 },
      { pts: [[87, -30, 402], [87, 300, 431]], d: 44, mirror: true },
      { pts: [[0, -250, 250], [0, -339, 600]], rect: [56, 56] },
      { pts: [[0, -540, 94], [0, -505, 205], [0, -430, 330], [0, -335, 420]], d: 44 },
      { pts: [[0, -222, 256], [0, -200, 94]], rect: [50, 50] },
    ],
    drive: { y: -222, z: 256, d: 280, t: 100, color: '#161718' },
    crank: 170, crankAngle: 25,
    seat: { post: [[0, -339, 590], [0, -352, 742]], slider: [-557, -213, 760], saddle: [-303, 873], saddleColor: '#141516' },
    arms: { path: [[115, 332, 330], [115, 300, 435], [150, 305, 1040], [205, 285, 1165]], grip: [[205, 285, 1165], [W / 2 - 18, 190, H - 18]], d: 38, gripD: 36,
      link: [[115, 332, 330], [70, -70, 300]] },
    console: { mast: [[0, 300, 806], [0, 290, 1000]], at: [0, 282, 1062], size: [220, 150, 60], tilt: 45, screen: '#a2b3a4' },
    pegs: { y: 300, z: 500, x0: 100, x1: 230 },
    plates: [
      { a: [100.6, 292, 470], b: [100.6, 297, 770], h: 32, color: WHITE, mirror: true },
      { a: [28.6, -268, 300], b: [28.6, -300, 450], h: 30, color: '#c21f2a', mirror: true },
    ],
  };
}

/** Bells of Steel Blitz: 53 × 23 × 51 in; 25 in fan, belt drive, inverted-U fork over the fan, yellow "BLITZ" seat tube. */
export function blitz(): AirBikeSpec {
  const { length: L, width: W, height: H } = AIR_BIKES.blitz, front = L / 2, rear = -L / 2, fan = { d: 664, y: front - 333.5, z: 440 };
  return {
    label: 'Bells of Steel Blitz Air Bike', L, W, H, frame: '#18191b', accent: '#d8a62b', roughness: .45,
    fan: { ...fan, width: 140, blades: 10, bladeD: 610, bladeW: 96, guard: 'wire', spokes: 60, rings: 7, bands: 8, guardColor: '#161718', bladeColor: '#1d1e20' },
    feet: { front: { y: 300, w: 560, wheel: 70, wheelY: 420 }, rear: { y: rear + 35, w: 520 } },
    tubes: [
      { pts: [[90, 300, 45], [90, 330, 700], [72, 334, 792], [0, 336, 814], [-72, 334, 792], [-90, 330, 700], [-90, 300, 45]], d: 48 },
      { pts: [[0, 336, 814], [0, 330, 1060]], d: 44 },
      { pts: [[0, -190, 300], [0, -22, 400]], rect: [50, 70] },
      { pts: [[-90, -22, 400], [90, -22, 400]], d: 44 },
      { pts: [[90, -22, 404], [90, 330, 440]], d: 44, mirror: true },
      { pts: [[0, -228, 250], [0, -330, 640]], rect: [60, 60] },
      { pts: [[0, -262, 240], [0, rear + 35, 55]], rect: [60, 50] },
      { pts: [[0, -150, 150], [0, 300, 50]], rect: [50, 40] },
    ],
    drive: { y: -240, z: 280, d: 300, t: 110, color: '#18191b' },
    crank: 170, crankAngle: 30,
    seat: { post: [[0, -330, 630], [0, -345, 780]], slider: [-560, -300, 800], saddle: [-450, 880], saddleColor: '#141516' },
    arms: { path: [[120, 362, 330], [120, 332, 440], [150, 282, 1000], [208, 232, 1170]], grip: [[208, 232, 1170], [258, 172, 1262], [W / 2 - 18, 40, H - 18]], d: 36, gripD: 36,
      link: [[120, 362, 330], [74, -90, 330]] },
    console: { mast: [[0, 330, 1060], [0, 322, 1090]], at: [0, 322, 1140], size: [190, 270, 60], tilt: 18, screen: '#a8b9a0' },
    pegs: { y: 330, z: 505, x0: 100, x1: 225 },
    plates: [{ a: [30.6, -245, 330], b: [30.6, -300, 580], h: 24, color: '#d8a62b', mirror: true }],
  };
}

/** REP Strive with VPR: 57.41 × 27.23 × 53.24 in; perforated magnetic fan covers, multi-grip handles, satin metallic black. */
export function strive(): AirBikeSpec {
  const { length: L, width: W, height: H } = AIR_BIKES.strive, front = L / 2, rear = -L / 2, fan = { d: 720, y: front - 361.5, z: 480 };
  return {
    label: 'REP Strive Air Bike', L, W, H, frame: '#2a2b2e', accent: '#2a2b2e', roughness: .45,
    fan: { ...fan, width: 150, blades: 10, bladeD: 660, bladeW: 100, guard: 'perforated', spokes: 0, rings: 0, bands: 12, guardColor: '#1c1d1f', bladeColor: '#1d1e20', rim: '#5a5d61' },
    feet: { front: { y: 352, w: 640, wheel: 100, wheelY: 478 }, rear: { y: rear + 35, w: 600 } },
    tubes: [
      { pts: [[91, 352, 50], [91, 332, 562]], rect: [26, 66], mirror: true },
      { pts: [[0, -32, 470], [0, -10, 800], [0, 110, 1100]], d: 56 },
      { pts: [[0, -232, 320], [0, -32, 440]], rect: [64, 90] },
      { pts: [[-91, -32, 440], [91, -32, 440]], rect: [60, 60] },
      { pts: [[91, -32, 444], [91, 332, 480]], rect: [26, 84], mirror: true },
      { pts: [[0, -250, 260], [0, -382, 702]], rect: [72, 72] },
      { pts: [[0, -300, 300], [0, -520, 120], [0, rear + 60, 60]], d: 52 },
    ],
    drive: { y: -262, z: 290, d: 320, t: 120, color: '#1c1d1f' },
    crank: 170, crankAngle: 20,
    seat: { post: [[0, -382, 690], [0, -400, 850]], slider: [-620, -330, 870], saddle: [-500, 952], saddleColor: '#141516' },
    arms: { path: [[125, 382, 360], [125, 340, 480], [140, 250, 1050], [150, 205, 1222], [200, 185, 1300]], grip: [[200, 185, 1300], [W / 2 - 18, 150, H - 18]], d: 40, gripD: 36,
      link: [[125, 382, 360], [80, -100, 330]] },
    console: { mast: [[0, 110, 1100], [0, 150, 1150]], at: [0, 150, 1212], size: [140, 230, 50], tilt: 22, screen: '#b9d4e6' },
    pegs: { y: 342, z: 470, x0: 104, x1: 240 },
    plates: [{ a: [104.6, 60, 455], b: [104.6, 200, 470], h: 34, color: WHITE, mirror: true }],
  };
}

/** Schwinn Airdyne AD7: 53 × 26.5 × 53 in; grey frame with red accents, wide black paddle fan, raked fork with SCHWINN lettering. */
export function airdyneAd7(): AirBikeSpec {
  const { length: L, width: W, height: H } = AIR_BIKES.ad7, front = L / 2, rear = -L / 2, fan = { d: 710, y: front - 356.5, z: 480 };
  return {
    label: 'Schwinn Airdyne AD7', L, W, H, frame: '#56595d', accent: '#c0262d', black: '#1a1b1c', roughness: .45,
    fan: { ...fan, width: 150, blades: 12, bladeD: 650, bladeW: 150, guard: 'wire', spokes: 64, rings: 6, bands: 10, guardColor: '#3a3d40', bladeColor: '#141516', rim: '#55595d' },
    feet: { front: { y: 418, w: 640, wheel: 60, wheelY: 470 }, rear: { y: rear + 35, w: 640 } },
    tubes: [
      { pts: [[93, 409, 30], [93, 170, 880]], rect: [26, 70], mirror: true },
      { pts: [[-93, 170, 880], [93, 170, 880]], rect: [60, 60] },
      { pts: [[0, 170, 880], [0, 91, 1166]], rect: [60, 80] },
      { pts: [[0, 418, 45], [0, rear + 35, 45]], d: 40 },
      { pts: [[93, 290, 480], [93, -60, 420]], rect: [26, 90], mirror: true },
      { pts: [[-93, -60, 420], [93, -60, 420]], rect: [60, 60] },
      { pts: [[0, -60, 420], [0, -200, 360]], rect: [60, 90] },
      { pts: [[0, -280, 380], [0, -330, 680]], rect: [70, 70] },
      { pts: [[0, -326, 640], [0, -330, 672]], rect: [78, 78], paint: 'accent' },
      { pts: [[0, -437, 300], [0, -583, 56]], rect: [60, 60] },
    ],
    drive: { y: -250, z: 320, d: 340, t: 130, color: '#141516', shroud: [[-60, 470], [-60, 230], [-200, 130], [-440, 140], [-470, 300], [-330, 470]] },
    crank: 170, crankAngle: 25,
    seat: { post: [[0, -330, 670], [0, -345, 860]], slider: [-583, -320, 880], saddle: [-470, 990], saddleColor: '#141516', stitch: '#b3232b' },
    arms: { path: [[128, 330, 380], [128, 300, 480], [140, 125, 1195], [150, 40, 1240]], grip: [[150, 40, 1240], [W / 2 - 18, -20, H - 44]], d: 38, gripD: 36,
      link: [[128, 330, 380], [84, -90, 360]] },
    console: { mast: [[0, 91, 1120], [0, 75, 1160]], at: [0, 60, 1198], size: [170, 300, 60], tilt: 25, screen: '#a7b3a3' },
    pegs: { y: 300, z: 470, x0: 106, x1: 230 },
    plates: [
      { a: [106.6, 392, 90], b: [106.6, 300, 420], h: 40, color: WHITE, mirror: true },
      { a: [106.6, 150, 462], b: [106.6, -20, 432], h: 40, color: '#c9ccce', mirror: true },
    ],
  };
}

/** Schwinn Airdyne AD6: 49.7 × 25.7 × 50.9 in; grey round-tube frame, grey crank shroud with the red Schwinn roundel, black wire fan guard. */
export function airdyneAd6(): AirBikeSpec {
  const { length: L, width: W, height: H } = AIR_BIKES.ad6, front = L / 2, rear = -L / 2, fan = { d: 620, y: front - 311.5, z: 450 };
  return {
    label: 'Schwinn Airdyne AD6', L, W, H, frame: '#626970', accent: '#5c6064', black: '#1a1b1c', roughness: .4,
    fan: { ...fan, width: 150, blades: 8, bladeD: 566, bladeW: 120, guard: 'wire', spokes: 40, rings: 5, bands: 8, guardColor: '#161718', bladeColor: '#1a1b1c' },
    feet: { front: { y: 360, w: 600, wheel: 60, wheelY: 440 }, rear: { y: rear + 35, w: 600 } },
    tubes: [
      { pts: [[97, 360, 40], [97, 319, 450]], d: 42, mirror: true },
      { pts: [[97, 319, 450], [97, -40, 480]], d: 42, mirror: true },
      { pts: [[-97, -40, 480], [97, -40, 480]], d: 42 },
      { pts: [[0, -40, 480], [0, 40, 850], [0, 120, 1040]], d: 50 },
      { pts: [[0, -40, 480], [0, -260, 300]], d: 50 },
      { pts: [[0, 360, 40], [0, rear + 35, 40]], d: 48 },
      { pts: [[0, -260, 300], [0, -330, 640]], d: 55 },
      { pts: [[0, -300, 330], [0, rear + 35, 40]], d: 45 },
      { pts: [[104, -30, 420], [104, 300, 450]], rect: [30, 150], paint: 'accent' },
    ],
    drive: { y: -250, z: 300, d: 330, t: 150, color: '#5c6064', shroud: [[0, 520], [0, 200], [-180, 130], [-380, 200], [-420, 330], [-330, 450], [-150, 500]] },
    crank: 165, crankAngle: 25,
    seat: { post: [[0, -330, 630], [0, -345, 800]], saddle: [-350, 900], saddleColor: '#141516' },
    arms: { path: [[125, 360, 360], [125, 319, 450], [150, 250, 1050], [160, 200, 1180], [180, 140, 1265]], grip: [[180, 140, 1265], [W / 2 - 18, 60, H - 18]], d: 38, gripD: 36,
      link: [[125, 360, 360], [84, -90, 330]] },
    console: { mast: [[0, 120, 1040], [0, 140, 1070]], at: [0, 150, 1100], size: [200, 130, 70], tilt: 55, screen: '#9aa596' },
    plates: [
      { a: [75.6, -60, 330], b: [75.6, -60, 331], h: 90, color: '#c62128', round: true, mirror: true },
      { a: [76.3, -60, 330], b: [76.3, -60, 331], h: 50, color: WHITE, round: true, mirror: true },
    ],
  };
}

/** Classic big-fan Airdyne frame shared by the AD3 and AD4 (Schwinn: "the bikes are the same except for the display console").
 * Published 50 × 22.5 × 48 in envelope; positions scaled off the eBay side photos (research/ergs.md): fan front at +L/2, saddle back
 * at −L/2, grips at ±W/2 and H. Fork legs rise either side of the fan into a U over it (fan-lock knob on top), a low box rail runs
 * from the front to the rear stabiliser, a top tube drops from the fork to the bottom bracket, and the seat tube carries a curved
 * rear stay down to the rear stabiliser. */
function airdyneClassic(key: 'ad3' | 'ad4', finish: { label: string; frame: string; accent: string; guard: string; rim: string; hub: string; blade: string; windGuard?: string; roughness: number }, console: AirBikeSpec['console'], plates: AirBikeSpec['plates']): AirBikeSpec {
  const { length: L, width: W, height: H } = AIR_BIKES[key], front = L / 2, fan = { d: 620, y: front - 310, z: 460 }, fw = 240, leg = fw / 2 + 18;
  return {
    label: finish.label, L, W, H, frame: finish.frame, accent: finish.accent, black: '#161718', roughness: finish.roughness,
    fan: { ...fan, width: fw, blades: 12, bladeD: 570, bladeW: 110, guard: 'wire', spokes: 72, rings: 6, bands: 12, guardColor: finish.guard, bladeColor: finish.blade, rim: finish.rim, hub: finish.hub, windGuard: finish.windGuard },
    feet: { front: { y: 267, w: W, wheel: 75, wheelY: 560 }, rear: { y: -517, w: W } },
    tubes: [
      // Fork legs outside the cages rising into the U over the fan.
      { pts: [[leg, 267, 45], [leg, 262, 690], [leg - 30, 262, 770], [0, 262, 792], [-leg + 30, 262, 770], [-leg, 262, 690], [-leg, 267, 45]], d: 32 },
      // Fan-lock knob on top of the U.
      { pts: [[0, 262, 800], [0, 262, 836]], d: 30, paint: 'black' },
      // Low box rail from the front stabiliser to the rear stabiliser, top tube from the fork to the bottom bracket.
      { pts: [[0, 267, 176], [0, -517, 176]], rect: [40, 50] },
      { pts: [[leg, 280, 434], [60, -40, 352], [0, -190, 316]], d: 32, mirror: true },
      { pts: [[0, 267, 60], [0, 267, 176]], rect: [40, 50] },
      // Seat tube from the bottom bracket, curved rear stay and the seat-frame brace.
      { pts: [[0, -201, 250], [0, -391, 690]], d: 36 },
      { pts: [[0, -391, 633], [0, -470, 480], [0, -500, 340], [0, -517, 60]], d: 32 },
      { pts: [[0, -253, 305], [0, -503, 305]], rect: [40, 44] },
      { pts: [[0, -201, 176], [0, -201, 250]], rect: [40, 44] },
    ],
    drive: { y: -201, z: 305, d: 210, t: 70, color: finish.frame, shroud: [[-110, 330], [-60, 400], [40, 330], [60, 250], [0, 200], [-120, 210]] },
    crank: 165, crankAngle: 20,
    seat: { post: [[0, -391, 690], [0, -405, 800]], saddle: [-513.5, 858], saddleColor: '#141516', postSize: 34 },
    // Arms pivot on the fork at the foot pegs and rise to horizontal rear-facing grips.
    arms: { path: [[150, 292, 330], [150, 285, 470], [168, 205, 1010], [196, 176, 1150], [230, 150, H - 40]], grip: [[230, 150, H - 40], [W / 2 - 18, 110, H - 18], [W / 2 - 18, -70, H - 18]], d: 30, gripD: 36,
      link: [[140, 300, 300], [95, -150, 305]] },
    console,
    pegs: { y: 292, z: 330, x0: 150, x1: 250 },
    plates,
  };
}
/** Schwinn Airdyne AD4: charcoal frame, black wire cages and brass hub disc, electronic LCD console on twin posts, SCHWINN rail decal. */
export const airdyneAd4 = () => airdyneClassic('ad4', { label: 'Schwinn Airdyne AD4', frame: '#4b5157', accent: '#c4262e', guard: '#18191a', rim: '#1d1e20', hub: '#b08d57', blade: '#3a3d40', roughness: .5 },
  { mast: [[0, 262, 792], [0, 240, 900], [0, 232, 950]], at: [0, 226, 990], size: [190, 130, 55], tilt: 35, screen: '#a9b3a0' },
  [{ a: [20.6, -140, 176], b: [20.6, -430, 176], h: 30, color: '#d9dcde', mirror: true }]);
/** Schwinn Air-Dyne AD3: bronze frame, chrome cages and top guard, yellow SCHWINN AIR-DYNE rail, analog ergometer box on a single post. */
export const airdyneAd3 = () => airdyneClassic('ad3', { label: 'Schwinn Air-Dyne AD3', frame: '#9c7443', accent: '#f0c419', guard: '#d4d8db', rim: '#c9cdd0', hub: '#c9cdd0', blade: '#9a9ea2', windGuard: '#d4d8db', roughness: .38 },
  { mast: [[0, 262, 792], [0, 215, 880], [0, 190, 925]], at: [0, 178, 960], size: [140, 290, 75], tilt: 58, screen: '#9fb09a' },
  [{ a: [20.6, 190, 176], b: [20.6, -440, 176], h: 42, color: '#f0c419', mirror: true }, { a: [21.3, 40, 176], b: [21.3, -300, 176], h: 18, color: '#c4262e', mirror: true }]);
