import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import "../../rack-generator/library-gallery.css";
import type {
  CatalogDefinition,
  LibraryWorkerResponse,
} from "../../rack-generator/worker-types.ts";
type CatalogPart = CatalogDefinition & { note?: string };
/** Catalog arrives as serializable metadata; this page never initializes Three. */
export default function LibraryPage() {
  const [parts, setParts] = useState<CatalogPart[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All parts");
  const [error, setError] = useState("");
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
  return (
    <main className="library-gallery">
      <header>
        <div>
          <p className="eyebrow">BOS STRENGTH / LIBRARY</p>
          <h1>Every piece, ready to build.</h1>
          <p>
            Explore the parametric parts, inspect their source models, and
            choose the dimensions for your rack.
          </p>
        </div>
        <Link to="/builder">Build a rack ↗</Link>
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
      </div>
      <div className="gallery-grid">
        {matches.map((part) => (
          <Link
            className="gallery-card"
            key={part.id}
            to="/parts"
            hash={part.id}
          >
            <span className="gallery-category">{part.category}</span>
            <h2>{part.name}</h2>
            <p>
              {part.description ||
                part.note ||
                "Editable Manifold reconstruction with source comparison."}
            </p>
            <span className="gallery-specs">
              {Object.entries(part.defaults)
                .filter(([key]) =>
                  ["height", "length", "width", "diameter"].includes(key)
                )
                .slice(0, 3)
                .map(([key, value]) => `${key} ${Math.round(value)} mm`)
                .join(" · ")}
            </span>
            <strong>Inspect & customize ↗</strong>
          </Link>
        ))}
      </div>
      {!matches.length && parts.length > 0 && (
        <p>No parts match this search.</p>
      )}
    </main>
  );
}
