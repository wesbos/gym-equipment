/** Shared observers that reveal each prebuilt image once, then stop watching it. Chrome's native `loading="lazy"`
 *  keeps every not-yet-loaded image under a per-frame intersection check (~0.8 ms/frame for the ~470 sidebar cards
 *  while the builder canvas animates); unobserving after first sight makes that cost decay to zero. */
const seen = new Set<string>();
const callbacks = new WeakMap<Element, () => void>();
const observers = new WeakMap<Element | Document, IntersectionObserver>();
const scrollRoots = new WeakMap<Element, Element | null>();

/** True when this URL was already shown this session (the browser has it cached): render it without observing. */
export const revealed = (url: string) => seen.has(url);

/** Nearest scrolling ancestor-or-self of `node`, so the preload margin applies inside clipped lists. Every node on
 *  the walk is cached, so sibling cards cost one lookup. */
function scrollRoot(node: Element | null): Element | null {
  const visited: Element[] = [];
  let root: Element | null = null;
  for (; node && node !== document.documentElement; node = node.parentElement) {
    const cached = scrollRoots.get(node);
    if (cached !== undefined) { root = cached; break; }
    visited.push(node);
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) { root = node; break; }
  }
  for (const each of visited) scrollRoots.set(each, root);
  return root;
}

export function revealWhenVisible(element: Element, url: string, reveal: () => void): () => void {
  const root = scrollRoot(element.parentElement);
  let observer = observers.get(root ?? document);
  if (!observer) {
    observer = new IntersectionObserver((entries, self) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        self.unobserve(entry.target);
        callbacks.get(entry.target)?.();
        callbacks.delete(entry.target);
      }
    }, { root, rootMargin: '300px 0px' });
    observers.set(root ?? document, observer);
  }
  callbacks.set(element, () => { seen.add(url); reveal(); });
  observer.observe(element);
  return () => { observer.unobserve(element); callbacks.delete(element); };
}
