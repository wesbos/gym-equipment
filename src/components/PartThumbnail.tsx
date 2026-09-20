import { useEffect, useRef, useState } from 'react';
import type { NumericParams } from '../../rack-generator/types.ts';
import { prebuiltThumbnail } from '../thumbnails/prebuilt.ts';
import { revealed, revealWhenVisible } from '../thumbnails/reveal.ts';
import { thumbnailKey } from '../thumbnails/queue.ts';
import { requestThumbnail, retainThumbnails } from '../thumbnails/service.ts';
import { partIcon } from './part-icon.ts';
import './part-thumbnail.css';

/** Build-time WebP for catalog defaults; live geometry only for other params. The parent owns the accessible part name. */
export function PartThumbnail({ part, params = {}, className = '', enabled = true }: { part: string; params?: NumericParams; className?: string; enabled?: boolean }) {
  const element = useRef<HTMLSpanElement>(null);
  const [result, setResult] = useState<{ key: string; image: string | null }>();
  const key = thumbnailKey({ part, params });
  // A static image (or known build failure) needs no CAD, render, observer or worker.
  const prebuilt = prebuiltThumbnail(part, params, key);
  const live = prebuilt === undefined;
  useEffect(() => (live ? retainThumbnails() : undefined), [live]);
  // Prebuilt images get a src once near view (then are never observed again), or at once if already seen.
  const [shown, setShown] = useState<string>();
  const src = prebuilt && (shown === prebuilt || revealed(prebuilt)) ? prebuilt : undefined;
  useEffect(() => {
    if (!prebuilt || src) return;
    return revealWhenVisible(element.current!, prebuilt, () => setShown(prebuilt));
  }, [prebuilt, src]);
  useEffect(() => {
    if (!enabled || !live) return;
    const request = { part, params: { ...params } };
    let cancel: (() => void) | undefined;
    let mounted = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        cancel ??= requestThumbnail(request, (image) => { if (mounted) setResult({ key, image }); });
      } else {
        cancel?.();
        cancel = undefined;
      }
    });
    observer.observe(element.current!);
    return () => { mounted = false; observer.disconnect(); cancel?.(); };
    // Canonical key includes every parameter, independent of object identity/order.
  }, [key, enabled, live]);
  if (!live) {
    return (
      <span ref={element} className={`part-thumbnail ${className}`} aria-hidden="true" data-thumbnail={prebuilt ? 'ready' : 'fallback'}>
        {prebuilt ? src && <img src={src} alt="" width="128" height="128" loading="lazy" decoding="async" draggable={false} /> : <span dangerouslySetInnerHTML={{ __html: partIcon(part) }} />}
      </span>
    );
  }
  const image = result?.key === key ? result.image : null;
  return (
    <span ref={element} className={`part-thumbnail ${className}`} aria-hidden="true" data-thumbnail={image ? 'ready' : result?.key === key ? 'fallback' : 'loading'}>
      {image ? <img src={image} alt="" width="128" height="128" decoding="async" draggable={false} /> : <span dangerouslySetInnerHTML={{ __html: partIcon(part) }} />}
    </span>
  );
}
