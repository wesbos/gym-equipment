/** Shared metadata helpers for the adjustable-dumbbell family (main bundle, no Manifold imports). */
/** How far a lifted handle (with its selected plates) rides above its cradle, matching POWERBLOCK_LIFT. */
export const DUMBBELL_LIFT = 80;
/** Pose param for cradle dumbbells: lifted shows the selected stack leaving the unselected plates in the cradle. */
export const POSE_OPTIONS = [0, 1] as const;
export const poseLabel = (v: number) => ['Lifted from cradle (shows selection)', 'Racked in cradle'][v] ?? String(v);
export const pounds = (v: number) => `${v} lb`;
export const inch = (v: number) => v * 25.4;
