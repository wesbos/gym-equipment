import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { loadGym, loadGyms } from "../gyms/gyms.ts";
import { gymPreviewUrl, sourceName, type GymEntry } from "../gyms/types.ts";
import { GYM_PARAM } from "../gyms/useOpenGym.ts";
import "../gyms/gyms.css";

const GYM_RADAR = "https://gymradar.com";

function OpenInBuilder({ gym, className = "gym-open" }: { gym: GymEntry; className?: string }) {
  return (
    <Link className={className} to="/" search={{ [GYM_PARAM]: gym.slug } as never}>
      Open in builder
    </Link>
  );
}

function OwnerCredit({ gym }: { gym: GymEntry }) {
  return (
    <p className="gym-credit">
      by <strong>{gym.owner}</strong> ·{" "}
      <a href={gym.sourceUrl} target="_blank" rel="noreferrer">
        on {sourceName(gym.sourceUrl)} ↗
      </a>
    </p>
  );
}

function Highlights({ gym }: { gym: GymEntry }) {
  return (
    <ul className="gym-highlights" aria-label="Highlights">
      {gym.highlights.map((highlight) => (
        <li key={highlight}>{highlight}</li>
      ))}
    </ul>
  );
}

/** Room footprint and piece counts, read straight off the document. */
function gymStats(gym: GymEntry) {
  const { room, floorItems = [], wallItems = [], hangItems = [], accessories } = gym.doc;
  const stats: string[] = [];
  if (room) {
    const m = (mm: number) => (mm / 1000).toFixed(1);
    stats.push(`${m(room.left + room.right)} × ${m(room.back + room.front)} m room`);
  }
  stats.push(`${accessories.length} rack attachments`);
  if (floorItems.length) stats.push(`${floorItems.length} floor pieces`);
  if (wallItems.length + hangItems.length) stats.push(`${wallItems.length + hangItems.length} on the walls`);
  return stats;
}

function useGyms() {
  const [gyms, setGyms] = useState<GymEntry[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    loadGyms().then(
      (loaded) => live && setGyms(loaded),
      (reason) => live && setError(String(reason)),
    );
    return () => {
      live = false;
    };
  }, []);
  return { gyms, error };
}

function PageHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="gyms-header">
      <div className="gyms-header-copy">
        <p className="eyebrow">BOS STRENGTH / GYM GALLERY</p>
        {children}
      </div>
      <nav>
        <Link to="/gyms">All gyms</Link>
        <Link to="/library">Parts library</Link>
        <Link className="gyms-header-primary" to="/">
          Build a rack ↗
        </Link>
      </nav>
    </header>
  );
}

export default function GymsPage() {
  const { gyms, error } = useGyms();
  return (
    <main className="gyms-page">
      <PageHeader>
        <h1>Pre-built gyms</h1>
        <p>
          Real home and garage gyms from{" "}
          <a href={GYM_RADAR} target="_blank" rel="noreferrer">
            Gym Radar
          </a>{" "}
          and gym tours, recreated piece by piece with the builder's catalog. Open one to remix it; your own design stays saved.
        </p>
      </PageHeader>
      <p role="status" className="gyms-status">
        {error || (gyms ? `${gyms.length} gyms` : "Loading gyms…")}
      </p>
      <div className="gyms-grid">
        {gyms?.map((gym) => (
          <article className="gym-card" key={gym.slug}>
            <Link className="gym-card-image" to="/gyms/$slug" params={{ slug: gym.slug }} aria-label={`${gym.title} details`}>
              <img src={gymPreviewUrl(gym.slug)} alt={`3D render of ${gym.title}`} loading="lazy" width={1200} height={800} />
            </Link>
            <div className="gym-card-body">
              <h2>
                <Link to="/gyms/$slug" params={{ slug: gym.slug }}>
                  {gym.title}
                </Link>
              </h2>
              <OwnerCredit gym={gym} />
              <p className="gym-summary">{gym.summary}</p>
              <Highlights gym={gym} />
              <div className="gym-actions">
                <OpenInBuilder gym={gym} />
                <Link className="gym-details" to="/gyms/$slug" params={{ slug: gym.slug }}>
                  Equipment list
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
      <GalleryFooter />
    </main>
  );
}

function GalleryFooter() {
  return (
    <footer className="gyms-footer">
      Gyms and equipment lists belong to their owners and are shared on{" "}
      <a href={GYM_RADAR} target="_blank" rel="noreferrer">
        Gym Radar
      </a>{" "}
      or in the owners' own tours. Previews are our own renders of each recreation; where a product isn't in our catalog, the closest match stands in.
    </footer>
  );
}

export function GymDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const [gym, setGym] = useState<GymEntry | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    setGym(undefined);
    loadGym(slug).then(
      (loaded) => live && setGym(loaded),
      () => live && setGym(null),
    );
    return () => {
      live = false;
    };
  }, [slug]);
  if (gym === undefined)
    return (
      <main className="gyms-page">
        <PageHeader />
        <p role="status" className="gyms-status">Loading gym…</p>
      </main>
    );
  if (!gym)
    return (
      <main className="gyms-page">
        <PageHeader>
          <h1>Gym not found</h1>
          <p>
            There's no gym called “{slug}” in the gallery. <Link to="/gyms">See all gyms</Link>.
          </p>
        </PageHeader>
      </main>
    );
  return (
    <main className="gyms-page">
      <PageHeader />
      <article className="gym-detail">
        <img className="gym-detail-image" src={gymPreviewUrl(gym.slug)} alt={`3D render of ${gym.title}`} width={1200} height={800} />
        <div className="gym-detail-body">
          <h1>{gym.title}</h1>
          <OwnerCredit gym={gym} />
          <p className="gym-summary">{gym.summary}</p>
          <Highlights gym={gym} />
          <p className="gym-stats">{gymStats(gym).join(" · ")}</p>
          <div className="gym-actions">
            <OpenInBuilder gym={gym} />
            <a className="gym-details" href={gym.sourceUrl} target="_blank" rel="noreferrer">
              See the real gym ↗
            </a>
          </div>
          <p className="gym-note">Opens as a new unsaved design. Anything unsaved in the builder is kept as a saved configuration. The builder's address stays a shareable link to this gym until you change something.</p>
        </div>
        <section className="gym-equipment" aria-labelledby="equipment-heading">
          <h2 id="equipment-heading">Equipment</h2>
          <ul>
            {gym.equipment.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </article>
      <GalleryFooter />
    </main>
  );
}
