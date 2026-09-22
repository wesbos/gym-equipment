import { useEffect, useState } from 'react';
import type { BuilderStore } from '../../state/builder-store.ts';
import { shallowEqual, useStoreSelector } from '../../state/use-store.ts';
import { SHOW_AFTER_MS, progressLabel, replacesScene } from './build-progress-model.ts';
import './build-progress.css';

/** Loading indicator over the stage (#218) while the scene generates geometry. Never blocks orbiting. */
export function BuildProgress({ store }: { store: BuilderStore }) {
  const { loading, progress, firstBuild } = useStoreSelector(store, s => ({ loading: s.loading, progress: s.buildProgress, firstBuild: !s.builtDoc }), shallowEqual);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!loading) { setShown(false); return; }
    const timer = setTimeout(() => setShown(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [loading]);
  if (!loading || !shown) return null;
  const scrim = replacesScene(progress, firstBuild), label = progressLabel(progress);
  return <div className="build-progress" data-scrim={scrim || undefined}>
    <div className="build-progress-card">
      <span className="build-progress-spinner" aria-hidden="true" />
      <span className="build-progress-label">{label}</span>
      {!!progress?.total && <progress aria-label="Loading models" max={progress.total} value={progress.done} />}
    </div>
  </div>;
}
