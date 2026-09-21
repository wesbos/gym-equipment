import { VendorCredit } from '../components/VendorControls.tsx';
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PartThumbnail } from "../components/PartThumbnail.tsx";
import { Link } from "@tanstack/react-router";
import "../../rack-generator/library-gallery.css";
import type {
  CatalogDefinition,
  LibraryWorkerResponse,
} from "../../rack-generator/worker-types.ts";
type CatalogPart = CatalogDefinition & { note?: string };
/** Phones and small tablets (#215): the catalog is grouped into category sections, each showing a first few cards
 * until "Show all", so the page is a browsable index rather than 500 cards in one column of rows. */
const COMPACT = "(max-width: 900px)";
const PREVIEW = 4;
const sectionId = (category: string) => `library-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (notify) => {
      if (typeof matchMedia !== "function") return () => {};
      const list = matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => typeof matchMedia === "function" && matchMedia(query).matches,
    () => false,
  );
}
/** True once `ref` comes within a couple of screens of the viewport, then stays true: sections mount cards lazily. */
function useNearViewport(ref: React.RefObject<HTMLElement | null>) {
  const [near, setNear] = useState(() => typeof IntersectionObserver !== "function");
  useEffect(() => {
    if (near || !ref.current) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setNear(true); }, { rootMargin: "1200px 0px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [near, ref]);
  return near;
}
function PartCard({ part }: { part: CatalogPart }) {
  return (
    <Link className="gallery-card" to="/parts/$partId" params={{ partId: part.id }}>
      <PartThumbnail part={part.id} params={part.defaults} />
      <span className="gallery-category">{part.category}</span>
      <h2>{part.name}</h2>
      {/* Compact: the card is already a link, so the credit is text (no nested anchor). */}
      <VendorCredit part={part.id} compact />
      <span className="gallery-specs">
        {Object.entries(part.defaults)
          .filter(([key]) => ["height", "length", "width", "diameter"].includes(key))
          .slice(0, 3)
          .map(([key, value]) => `${key} ${Math.round(value)} mm`)
          .join(" · ")}
      </span>
      <strong>Inspect & customize ↗</strong>
    </Link>
  );
}
function LibrarySection({ category, parts, preview }: { category: string; parts: CatalogPart[]; preview: number }) {
  const ref = useRef<HTMLElement>(null), near = useNearViewport(ref);
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? parts : parts.slice(0, preview), hidden = parts.length - shown.length;
  return (
    <section ref={ref} className="library-section" id={sectionId(category)} aria-label={category}
      style={{ "--cards": shown.length } as React.CSSProperties}>
      <h2 className="library-section-title">{category} <span>{parts.length}</span></h2>
      {near ? (
        <div className="gallery-grid">
          {shown.map((part) => <PartCard key={part.id} part={part} />)}
        </div>
      ) : <div className="library-section-placeholder" aria-hidden="true" />}
      {hidden > 0 && (
        <button type="button" className="library-show-all" onClick={() => setExpanded(true)}>
          Show all {parts.length} · {category}
        </button>
      )}
    </section>
  );
}
/** Catalog metadata loads first; visible cards request geometry thumbnails lazily. */
export default function LibraryPage() {
  const [parts, setParts] = useState<CatalogPart[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All parts");
  const [error, setError] = useState("");
  const compact = useMediaQuery(COMPACT);
  useEffect(() => {
    const worker = new Worker(
      new URL("../../rack-generator/library-worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = ({ data }: MessageEvent<LibraryWorkerResponse>) => {
      if (data.type === "catalog" && data.definitions) {
        setParts(data.definitions);
        worker.terminate();
      }
    };
    worker.onerror = (event) =>
      setError(event.message || "Could not load the parts catalog.");
    return () => {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    };
  }, []);
  const categories = [
    "All parts",
    ...new Set(parts.map((part) => part.category)),
  ];
  const matches = parts.filter(
    (part) =>
      (category === "All parts" || category === part.category) &&
      `${part.name} ${part.category}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );
  const grouped = new Map<string, CatalogPart[]>();
  for (const part of matches) {
    const list = grouped.get(part.category);
    if (list) list.push(part); else grouped.set(part.category, [part]);
  }
  const sections = [...grouped];
  return (
    <main className="library-gallery">
      <header>
        <div>
          <p className="eyebrow">BOS STRENGTH / LIBRARY</p>
          <h1>Parts library</h1>
        </div>
        <nav className="library-links">
          <Link to="/gyms">Pre-built gyms ↗</Link>
          <Link to="/">Build a rack ↗</Link>
        </nav>
      </header>
      <div className="gallery-filters">
        <label>
          Find a part
          <input
            type="search"
            placeholder="Uprights, safeties, storage…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <span role="status">
          {error ||
            (parts.length ? `${matches.length} parts` : "Loading catalog…")}
        </span>
        {sections.length > 1 && (
          <nav className="library-sections" aria-label="Sections">
            {sections.map(([name, list]) => (
              <a key={name} href={`#${sectionId(name)}`} onClick={(event) => {
                event.preventDefault();
                const target = document.getElementById(sectionId(name));
                // Land the heading just under the sticky search and section bar.
                const bar = event.currentTarget.closest<HTMLElement>(".gallery-filters")?.getBoundingClientRect().height ?? 0;
                if (target) scrollTo({ top: target.getBoundingClientRect().top + scrollY - bar - 12 });
              }}>{name} <span>{list.length}</span></a>
            ))}
          </nav>
        )}
      </div>
      {sections.map(([name, list]) => (
        <LibrarySection key={name} category={name} parts={list}
          preview={compact && !search.trim() && category === "All parts" ? PREVIEW : Infinity} />
      ))}
      {!matches.length && parts.length > 0 && (
        <p>No parts match this search.</p>
      )}
    </main>
  );
}
