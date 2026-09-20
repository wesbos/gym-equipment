/** Keyboard shortcuts overlay (#206): "?" (or the palette's "Keyboard shortcuts") lists every entry of the shortcut
 * registry (src/state/shortcuts.ts), the same list the builder's handlers match against, so it cannot drift. */
import { memo, useLayoutEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { closePanel, usePanel } from '../../state/editor-ui.ts';
import { matches, overlayGroups } from '../../state/shortcuts.ts';
import './shortcuts-overlay.css';

export const ShortcutsOverlay = memo(function ShortcutsOverlay() {
  return usePanel() === 'shortcuts' ? <OverlayDialog /> : null;
});

function OverlayDialog() {
  const groups = useMemo(() => overlayGroups(), []);
  const close = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const shell = document.querySelector<HTMLElement>('.builder-shell');
    shell?.setAttribute('inert', '');
    close.current?.focus({ preventScroll: true });
    return () => shell?.removeAttribute('inert');
  }, []);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key === 'Escape' || matches('shortcuts', event)) { event.preventDefault(); closePanel(); }
  };
  return <div className="shortcuts-overlay" onKeyDown={onKeyDown}>
    <div className="so-backdrop" onPointerDown={() => closePanel()} />
    <div className="so-panel" role="dialog" aria-modal="true" aria-labelledby="so-title">
      <header className="so-header">
        <h2 id="so-title">Keyboard shortcuts</h2>
        <button ref={close} type="button" className="so-close" aria-label="Close keyboard shortcuts" onClick={() => closePanel()}>Esc</button>
      </header>
      <div className="so-groups" tabIndex={0} aria-label="Shortcut list">
        {groups.map(group => <section key={group.group} className="so-group" aria-label={group.group}>
          <h3>{group.group}</h3>
          <dl>
            {group.rows.map(row => <div key={row.id} className="so-row" data-shortcut={row.id}>
              <dt>{row.label}{row.when && <small> · {row.when}</small>}</dt>
              <dd>{row.keys.map((keys, i) => <span key={i} className="so-combo">
                {i > 0 && <span className="so-or">or</span>}
                {keys.map((key, k) => <kbd key={k}>{key}</kbd>)}
              </span>)}</dd>
            </div>)}
          </dl>
        </section>)}
      </div>
    </div>
  </div>;
}
