/** Shared material groups for the hypers family: [name, role, colour, metalness, roughness].
 * Factory colours use role 'source' so rack paint never recolours them. */
import type { Material } from './hypers-kit.ts';
export const HM = {
  black: ['Black powder-coated steel frame', 'source', '#1d1e20', .3, .55],
  satin: ['Satin black powder-coated steel', 'source', '#252629', .35, .5],
  vinyl: ['Black vinyl upholstery', 'liner', '#141517', 0, .78],
  board: ['Pad base boards', 'source', '#18191a', 0, .8],
  foam: ['Black foam rollers and grips', 'handle', '#191a1b', 0, .92],
  rubber: ['Rubber feet and step treads', 'liner', '#121213', 0, .95],
  caps: ['Molded plastic end caps', 'source', '#151516', .05, .6],
  zinc: ['Zinc-plated weight horns and sleeves', 'fastener', '#b9bdc1', .9, .3],
  chrome: ['Chrome spring collars', 'fastener', '#d9dcdf', 1, .18],
  bolts: ['Black oxide bolts and pivot hardware', 'fastener', '#2b2c2e', .8, .35],
  hardware: ['Zinc-plated bolt heads', 'fastener', '#c2c5c8', .9, .32],
  brace: ['Zinc-plated cross brace', 'fastener', '#b3b7bb', .9, .3],
  rollerVinyl: ['Pleated vinyl roller covers', 'handle', '#1b1c1e', 0, .8],
  webbing: ['Black nylon webbing strap', 'source', '#27282a', 0, .95],
  white: ['White screen-printed branding', 'source', '#ecebe6', 0, .6],
  label: ['Warning labels and badges', 'source', '#d8d9d6', .5, .4],
  orange: ['Orange label band', 'source', '#e0701e', 0, .5],
  red: ['Red pop-pin indicator', 'source', '#c8242d', .1, .45],
  rogue: ['Rogue textured black powder coat', 'source', '#1e1f21', .25, .62],
  cut: ['Laser-cut plate lettering', 'source', '#0d0d0e', .1, .8],
} as const satisfies Record<string, Material>;
