import { getServerEnvVariables } from "./env";

type LibraryEntry = {
  title: string;
  author?: string;
  /** Deep-link URL into the library's web UI for this specific book. */
  url?: string;
};

type NormalizedLookup = { normalized: string; url: string | null };

type LibrarySnapshot = {
  calibre: LibraryEntry[];
  abs: LibraryEntry[];
  calibreNormalized: NormalizedLookup[];
  absNormalized: NormalizedLookup[];
  fetchedAt: string | null;
  calibreError: string | null;
  absError: string | null;
};

type GlobalState = {
  snapshot: LibrarySnapshot;
  inFlight: Promise<LibrarySnapshot> | null;
  lastRefreshAt: number;
};

const REFRESH_TTL_MS = 5 * 60 * 1000;

const empty: LibrarySnapshot = {
  calibre: [],
  abs: [],
  calibreNormalized: [],
  absNormalized: [],
  fetchedAt: null,
  calibreError: null,
  absError: null,
};

const g = globalThis as unknown as { __bookgrabLibrary?: GlobalState };
if (!g.__bookgrabLibrary) {
  g.__bookgrabLibrary = { snapshot: empty, inFlight: null, lastRefreshAt: 0 };
}
const state = g.__bookgrabLibrary;

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// --- Calibre-Web ---------------------------------------------------------

async function fetchCalibreTitles(): Promise<LibraryEntry[]> {
  const {
    CALIBRE_WEB_URL,
    CALIBRE_WEB_AUTH_EMAIL,
    CALIBRE_WEB_PUBLIC_URL,
  } = getServerEnvVariables();
  if (!CALIBRE_WEB_URL || !CALIBRE_WEB_AUTH_EMAIL) return [];
  const publicBase = (CALIBRE_WEB_PUBLIC_URL || "").replace(/\/+$/, "");

  const entries: LibraryEntry[] = [];
  const seen = new Set<string>();
  // `/opds/books` is a letter-hub navigation feed (All / A / B / ...); the
  // full book list lives under /opds/books/letter/00 with cursor-style
  // ?offset= pagination advertised via rel="next".
  let pathPart = "/opds/books/letter/00";
  const maxPages = 200;

  for (let i = 0; i < maxPages; i++) {
    if (seen.has(pathPart)) break;
    seen.add(pathPart);

    const res = await fetch(`${CALIBRE_WEB_URL}${pathPart}`, {
      headers: {
        "X-Auth-Username": CALIBRE_WEB_AUTH_EMAIL,
        Accept: "application/atom+xml",
      },
    });
    if (!res.ok) {
      throw new Error(
        `CWA ${pathPart} → ${res.status} ${res.statusText}`,
      );
    }
    const xml = await res.text();

    // Only entries that advertise an acquisition link are real books (letter
    // hubs and other navigation items don't).
    const entryRx = /<entry\b[^>]*>([\s\S]*?)<\/entry>/g;
    let m: RegExpExecArray | null;
    while ((m = entryRx.exec(xml))) {
      const block = m[1];
      if (!/rel="http:\/\/opds-spec\.org\/acquisition"/.test(block)) continue;
      const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/);
      const authorMatch = block.match(
        /<author>\s*<name>([\s\S]*?)<\/name>/,
      );
      // The acquisition link carries the Calibre book id, e.g.
      //   href="/opds/download/123/epub/"
      // The human-facing detail page is /book/{id} on the same host.
      const hrefMatch = block.match(
        /rel="http:\/\/opds-spec\.org\/acquisition"[^>]*href="\/opds\/download\/(\d+)/,
      );
      if (titleMatch) {
        const bookId = hrefMatch ? hrefMatch[1] : null;
        entries.push({
          title: decodeEntities(titleMatch[1]).trim(),
          author: authorMatch ? decodeEntities(authorMatch[1]).trim() : undefined,
          url:
            bookId && publicBase ? `${publicBase}/book/${bookId}` : undefined,
        });
      }
    }

    // rel="next" attributes are often split across newlines (title="Next"
    // between them), so use [\s\S]* to bridge whitespace/line breaks.
    const nextMatch = xml.match(
      /<link[\s\S]*?rel="next"[\s\S]*?href="([^"]+)"/,
    );
    if (!nextMatch) break;
    const href = decodeEntities(nextMatch[1]);
    pathPart = href.startsWith("http")
      ? href.replace(CALIBRE_WEB_URL, "")
      : href;
  }

  return entries;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

// --- Audiobookshelf ------------------------------------------------------

type AbsLibrariesRsp = { libraries: { id: string; mediaType?: string }[] };
type AbsItemsRsp = {
  results: {
    id?: string;
    media?: {
      metadata?: {
        title?: string;
        authorName?: string;
        authors?: { name?: string }[];
      };
    };
  }[];
};

async function fetchAbsTitles(): Promise<LibraryEntry[]> {
  const {
    AUDIOBOOKSHELF_URL,
    AUDIOBOOKSHELF_TOKEN,
    AUDIOBOOKSHELF_PUBLIC_URL,
  } = getServerEnvVariables();
  if (!AUDIOBOOKSHELF_URL || !AUDIOBOOKSHELF_TOKEN) return [];
  const publicBase = (AUDIOBOOKSHELF_PUBLIC_URL || "").replace(/\/+$/, "");

  const auth = { Authorization: `Bearer ${AUDIOBOOKSHELF_TOKEN}` };

  const libsRes = await fetch(`${AUDIOBOOKSHELF_URL}/api/libraries`, {
    headers: auth,
  });
  if (!libsRes.ok) {
    throw new Error(
      `ABS /api/libraries → ${libsRes.status} ${libsRes.statusText}`,
    );
  }
  const libs = (await libsRes.json()) as AbsLibrariesRsp;
  const bookLibs = libs.libraries.filter(
    (l) => !l.mediaType || l.mediaType === "book",
  );

  const entries: LibraryEntry[] = [];
  for (const lib of bookLibs) {
    const url = `${AUDIOBOOKSHELF_URL}/api/libraries/${lib.id}/items?limit=2000`;
    const res = await fetch(url, { headers: auth });
    if (!res.ok) {
      throw new Error(
        `ABS /api/libraries/${lib.id}/items → ${res.status} ${res.statusText}`,
      );
    }
    const data = (await res.json()) as AbsItemsRsp;
    for (const item of data.results || []) {
      const meta = item.media?.metadata;
      if (!meta?.title) continue;
      const author =
        meta.authorName ||
        meta.authors?.map((a) => a.name).filter(Boolean).join(", ") ||
        undefined;
      entries.push({
        title: meta.title,
        author,
        url:
          item.id && publicBase ? `${publicBase}/item/${item.id}` : undefined,
      });
    }
  }
  return entries;
}

// --- Public API ----------------------------------------------------------

async function refreshNow(): Promise<LibrarySnapshot> {
  const [calibreRes, absRes] = await Promise.allSettled([
    fetchCalibreTitles(),
    fetchAbsTitles(),
  ]);

  const calibre = calibreRes.status === "fulfilled" ? calibreRes.value : [];
  const abs = absRes.status === "fulfilled" ? absRes.value : [];

  const snapshot: LibrarySnapshot = {
    calibre,
    abs,
    calibreNormalized: calibre
      .map((e) => ({ normalized: normalize(e.title), url: e.url ?? null }))
      .filter((x) => x.normalized.length > 0),
    absNormalized: abs
      .map((e) => ({ normalized: normalize(e.title), url: e.url ?? null }))
      .filter((x) => x.normalized.length > 0),
    fetchedAt: new Date().toISOString(),
    calibreError:
      calibreRes.status === "rejected"
        ? (calibreRes.reason as Error).message || "Calibre fetch failed"
        : null,
    absError:
      absRes.status === "rejected"
        ? (absRes.reason as Error).message || "ABS fetch failed"
        : null,
  };

  state.snapshot = snapshot;
  state.lastRefreshAt = Date.now();
  return snapshot;
}

export async function getLibrarySnapshot(
  options: { force?: boolean } = {},
): Promise<LibrarySnapshot> {
  const age = Date.now() - state.lastRefreshAt;
  if (!options.force && age < REFRESH_TTL_MS && state.snapshot.fetchedAt) {
    return state.snapshot;
  }
  if (state.inFlight) return state.inFlight;
  state.inFlight = refreshNow().finally(() => {
    state.inFlight = null;
  });
  return state.inFlight;
}
