import { DEFAULT_FRAME_COLOR, resolveMaterial, type Appearance, type FrameFinish } from './appearance.ts';

/** Match renderer/export inheritance, including legacy color-only overrides. */
export function physicalFinish(appearance: Appearance, id: string): FrameFinish {
  return resolveMaterial({ role: 'frame' }, appearance, id).finish ?? 'paint';
}

/** Reset only one editable field; a physical finish defaults to the rack finish. */
export function resetAppearanceField(appearance: Appearance, field: 'color' | 'finish', id?: string): Appearance {
  const next = structuredClone(appearance);
  if (!id) {
    if (field === 'color') next.frameColor = DEFAULT_FRAME_COLOR;
    else next.frameFinish = 'paint';
    return next;
  }
  if (field === 'color') {
    const finish = physicalFinish(appearance, id);
    if (next.overrides) delete next.overrides[id];
    // A legacy color implied paint. Keep that finish after removing only its color.
    if (physicalFinish(next, id) !== finish) next.finishOverrides = { ...next.finishOverrides, [id]: finish };
  } else {
    const finish = appearance.frameFinish ?? 'paint';
    if (next.finishOverrides) delete next.finishOverrides[id];
    // A retained custom color must not force paint over the inherited steel finish.
    if (physicalFinish(next, id) !== finish) next.finishOverrides = { ...next.finishOverrides, [id]: finish };
  }
  return next;
}
