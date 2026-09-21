import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { historyKeyStep } from '../state/shortcuts.ts';

export interface Timeline {
  entries: readonly { id: number; label: string; category: string }[];
  position: number;
  latest: number;
  applied: number;
  viewing: boolean;
}
const spacing = 28;
const icons: Record<string, string> = { add: '+', remove: '−', move: '↔', dimension: '↔', appearance: '◐', logo: 'A', structure: '▱', preset: '▦', restore: '↶', edit: '✎' };
/** History keys come from the shortcut registry (src/state/shortcuts.ts); re-exported for existing callers. */
export { historyKeyStep };
/** Presentation-only showcase trigger; it never touches history. */
export interface BuildPlayback { playing: boolean; disabled: boolean; toggle: () => void }
export function HistoryTimeline({ timeline, loading, seek, restore, clear, build }: {
  timeline: Timeline; loading: boolean; seek: (step: number) => void; restore: () => void; clear: () => void; build?: BuildPlayback;
}) {
  const { entries, position, latest, applied, viewing } = timeline;
  const [playing, setPlaying] = useState(false);
  const [windowStart, setWindowStart] = useState(0);
  const [windowSize, setWindowSize] = useState(50);
  const [confirmClear, setConfirmClear] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  const pending = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const dragging = useRef<number | null>(null);
  const expected = useRef<number | null>(null);
  const playbackEnd = useRef(applied);
  const seekRef = useRef(seek);
  seekRef.current = seek;
  const cancelPending = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null; pending.current = null;
  };
  const navigate = (step: number) => { cancelPending(); setPlaying(false); seekRef.current(step); };
  const queueSeek = (step: number) => {
    setPlaying(false); pending.current = step;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const next = pending.current; pending.current = null;
      if (next !== null) seekRef.current(next);
    });
  };
  useEffect(() => () => cancelPending(), []);
  useEffect(() => {
    const element = rail.current!;
    const resize = () => setWindowSize(Math.ceil(element.clientWidth / spacing) + 4);
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (dragging.current !== null) return;
    const element = rail.current!;
    const x = position * spacing;
    if (x < element.scrollLeft || x > element.scrollLeft + element.clientWidth - spacing) {
      element.scrollLeft = Math.max(0, x - element.clientWidth / 2);
    }
  }, [position]);
  useEffect(() => {
    if (!playing) return;
    // User edits, undo, keyboard navigation or loading a design stop the replay.
    if (position !== expected.current || applied !== playbackEnd.current || position >= playbackEnd.current) {
      setPlaying(false); return;
    }
    if (loading) return;
    const timer = setTimeout(() => {
      expected.current = position + 1;
      seekRef.current(position + 1);
    }, 400);
    return () => clearTimeout(timer);
  }, [playing, position, applied, loading]);
  const pointerStep = (clientX: number) => {
    const element = rail.current!;
    return Math.max(0, Math.min(latest, Math.round((clientX - element.getBoundingClientRect().left + element.scrollLeft - spacing / 2) / spacing)));
  };
  const keyboard = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const step = historyKeyStep(event.key, position, latest);
    if (step !== undefined) { event.preventDefault(); event.stopPropagation(); navigate(step); }
  };
  const label = position === 0 ? 'Initial design' : entries[position - 1]?.label ?? 'Change';
  const first = Math.max(0, Math.min(windowStart, latest - windowSize));
  const last = Math.min(latest, first + windowSize);
  return <section className="history-timeline" aria-label="Design history">
    <div className="timeline-controls">
      <button type="button" aria-label={playing ? 'Pause history' : 'Play history'} aria-pressed={playing} disabled={!applied}
        onClick={() => {
          cancelPending();
          if (playing) { setPlaying(false); return; }
          playbackEnd.current = applied; expected.current = 0; seekRef.current(0); setPlaying(true);
        }}>{playing ? 'Ⅱ' : '▶'}</button>
      <button type="button" aria-label="Previous history step" disabled={!position} onClick={() => navigate(position - 1)}>‹</button>
      <button type="button" aria-label="Next history step" disabled={position === latest} onClick={() => navigate(position + 1)}>›</button>
      {build && <button type="button" className="timeline-build" data-build-toggle aria-pressed={build.playing}
        disabled={!build.playing && build.disabled} title="Watch the rack assemble itself · click, drag or ESC to skip"
        onClick={() => { cancelPending(); setPlaying(false); build.toggle(); }}>{build.playing ? '■ Stop build' : '▶ Play build'}</button>}
      <output className={viewing ? 'timeline-position viewing' : 'timeline-position'} aria-live="off">
        {viewing ? 'Viewing history' : 'Current'} <span>{position} / {latest}</span>
      </output>
      {viewing && <button type="button" onClick={() => navigate(applied)}>Return to latest</button>}
      <button type="button" disabled={!viewing} onClick={() => { cancelPending(); setPlaying(false); restore(); }}>Restore to here</button>
      <div className="timeline-privacy">
        {confirmClear ? <><span>Erase all past steps?</span><button type="button" onClick={() => { cancelPending(); setPlaying(false); clear(); setConfirmClear(false); }}>Erase history</button><button type="button" onClick={() => setConfirmClear(false)}>Cancel</button></> :
          <button type="button" disabled={!latest} onClick={() => { setPlaying(false); setConfirmClear(true); }}>Clear history</button>}
      </div>
    </div>
    <div className="timeline-rail" ref={rail} role="slider" tabIndex={0} aria-label="History playhead"
      aria-valuemin={0} aria-valuemax={latest} aria-valuenow={position} aria-valuetext={`${position} of ${latest}: ${label}`}
      onKeyDown={keyboard} onScroll={event => setWindowStart(Math.max(0, Math.floor(event.currentTarget.scrollLeft / spacing) - 2))}
      onPointerDown={event => {
        if (event.button !== 0) return;
        event.preventDefault(); event.currentTarget.focus(); dragging.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId); queueSeek(pointerStep(event.clientX));
      }}
      onPointerMove={event => { if (dragging.current === event.pointerId) queueSeek(pointerStep(event.clientX)); }}
      onPointerUp={event => {
        if (dragging.current !== event.pointerId) return;
        queueSeek(pointerStep(event.clientX)); dragging.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { dragging.current = null; cancelPending(); }}
      onLostPointerCapture={() => { dragging.current = null; }}>
      <div className="timeline-track" style={{ width: (latest + 1) * spacing }}>
        {Array.from({ length: last - first + 1 }, (_, i) => first + i).map(step => {
          const entry = entries[step - 1], title = step ? entry.label : 'Initial design';
          return <span key={step} className={`timeline-marker ${step <= position ? 'visited' : ''} ${step === position ? 'current' : ''}`}
            style={{ left: step * spacing }} data-step={step} title={`${step}: ${title}`} aria-hidden="true">
            <span className="timeline-dot" />
            <span className="timeline-marker-icon">{step ? icons[entry.category] ?? '✎' : '◇'}</span>
          </span>;
        })}
        <span className="timeline-playhead" style={{ left: position * spacing + spacing / 2 }} aria-hidden="true" />
      </div>
    </div>
  </section>;
}
