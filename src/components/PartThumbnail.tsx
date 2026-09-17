import { useEffect, useRef, useState } from 'react';
import type { NumericParams } from '../../rack-generator/types.ts';
import { thumbnailKey } from '../thumbnails/queue.ts';
import { requestThumbnail, retainThumbnails } from '../thumbnails/service.ts';
import { partIcon } from './part-icon.ts';
import './part-thumbnail.css';

/** Geometry on demand. The parent owns the accessible part name. */
export function PartThumbnail({ part, params = {}, className = '', enabled = true }: { part: string; params?: NumericParams; className?: string; enabled?: boolean }) {
  const element = useRef<HTMLSpanElement>(null);
  const [result, setResult] = useState<{ key: string; image: string | null }>();
  const key = thumbnailKey({ part, params });
  useEffect(retainThumbnails, []);
  useEffect(() => {
    if (!enabled) return;
    const request = { part, params: { ...params } };
    let cancel: (() => void) | undefined;
    let live = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        cancel ??= requestThumbnail(request, (image) => { if (live) setResult({ key, image }); });
      } else {
        cancel?.();
        cancel = undefined;
      }
    });
    observer.observe(element.current!);
    return () => { live = false; observer.disconnect(); cancel?.(); };
    // Canonical key includes every parameter, independent of object identity/order.
  }, [key, enabled]);
  const image = result?.key === key ? result.image : null;
  return (
    <span ref={element} className={`part-thumbnail ${className}`} aria-hidden="true" data-thumbnail={image ? 'ready' : result?.key === key ? 'fallback' : 'loading'}>
      {image ? <img src={image} alt="" width="128" height="128" draggable={false} /> : <span dangerouslySetInnerHTML={{ __html: partIcon(part) }} />}
    </span>
  );
}
