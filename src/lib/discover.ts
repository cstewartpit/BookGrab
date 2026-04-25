import { getServerEnvVariables } from "./env";

/**
 * Discover lists pulled from NYT Bestsellers (when an API key is set) and
 * OpenLibrary (always). Both responses are normalized into the DiscoverBook
 * shape and cached in-memory for 6 hours so we don't hammer either API.
 */

export type DiscoverBook = {
  source: "nyt" | "openlibrary";
  /** Stable id for keys + lazy detail loading. NYT uses primary_isbn13, OL
   *  uses the work key (e.g. "/works/OL12345W"). */
  externalId: string;
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  year?: number;
  description?: string;
  rank?: number;
};

export type DiscoverList = {
  id: string;
  label: string;
  source: "nyt" | "openlibrary";
  books: DiscoverBook[];
};

type CacheEntry = { value: DiscoverList; fetchedAt: number };

const TTL_MS = 6 * 60 * 60 * 1000;

const g = globalThis as unknown as { __bookgrabDiscover?: Map<string, CacheEntry> };
if (!g.__bookgrabDiscover) g.__bookgrabDiscover = new Map();
const cache = g.__bookgrabDiscover;

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// --- NYT --------------------------------------------------------------------

type NytBook = {
  rank?: number;
  title?: string;
  author?: string;
  description?: string;
  primary_isbn13?: string;
  primary_isbn10?: string;
  book_image?: string;
  publisher?: string;
};
type NytResponse = {
  status?: string;
  results?: { books?: NytBook[] };
};

async function fetchNyt(listSlug: string): Promise<DiscoverBook[]> {
  const { NYT_API_KEY } = getServerEnvVariables();
  if (!NYT_API_KEY) return [];
  const url = `https://api.nytimes.com/svc/books/v3/lists/current/${listSlug}.json?api-key=${encodeURIComponent(
    NYT_API_KEY,
  )}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`NYT ${listSlug} → ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as NytResponse;
  const items = data.results?.books ?? [];
  return items
    .filter((b) => b.title && b.author)
    .map((b) => ({
      source: "nyt" as const,
      externalId: b.primary_isbn13 || b.primary_isbn10 || b.title!,
      title: b.title!.trim(),
      author: b.author!.trim(),
      isbn: b.primary_isbn13 || b.primary_isbn10 || undefined,
      coverUrl: b.book_image || undefined,
      description: b.description || undefined,
      rank: b.rank,
    }));
}

// --- OpenLibrary ------------------------------------------------------------

type OlAuthor = { name?: string; key?: string };
type OlWork = {
  key?: string;
  title?: string;
  author_name?: string[];
  authors?: OlAuthor[];
  cover_i?: number;
  cover_id?: number;
  first_publish_year?: number;
  ia?: string[];
};
type OlTrendingResponse = { works?: OlWork[] };
type OlSubjectResponse = { works?: OlWork[] };

function olCover(w: OlWork): string | undefined {
  const id = w.cover_i ?? w.cover_id;
  if (!id) return undefined;
  return `https://covers.openlibrary.org/b/id/${id}-M.jpg`;
}

function olAuthor(w: OlWork): string {
  if (w.author_name?.length) return w.author_name.join(", ");
  if (w.authors?.length) {
    return w.authors
      .map((a) => a.name)
      .filter((s): s is string => !!s)
      .join(", ");
  }
  return "";
}

async function fetchOpenLibraryWorks(url: string): Promise<DiscoverBook[]> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": CHROME_UA },
  });
  if (!res.ok) {
    throw new Error(`OpenLibrary ${url} → ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as OlTrendingResponse | OlSubjectResponse;
  const works = data.works ?? [];
  return works
    .filter((w) => w.title && (w.author_name?.length || w.authors?.length))
    .map((w) => ({
      source: "openlibrary" as const,
      externalId: w.key || w.title!,
      title: w.title!.trim(),
      author: olAuthor(w),
      coverUrl: olCover(w),
      year: w.first_publish_year,
    }));
}

const fetchOlTrending = (limit = 24) =>
  fetchOpenLibraryWorks(
    `https://openlibrary.org/trending/weekly.json?limit=${limit}`,
  );

const fetchOlSubject = (subject: string, limit = 20) =>
  fetchOpenLibraryWorks(
    `https://openlibrary.org/subjects/${encodeURIComponent(subject)}.json?limit=${limit}`,
  );

// --- OpenLibrary search by year --------------------------------------------

type OlSearchDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  ratings_count?: number;
};
type OlSearchResponse = { numFound?: number; docs?: OlSearchDoc[] };

function searchDocToBook(d: OlSearchDoc): DiscoverBook | null {
  if (!d.title || !d.author_name?.length) return null;
  return {
    source: "openlibrary",
    externalId: d.key || d.title,
    title: d.title.trim(),
    author: d.author_name.join(", "),
    coverUrl: d.cover_i
      ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
      : undefined,
    year: d.first_publish_year,
  };
}

async function fetchOlSearchByYear(
  year: number,
  limit = 24,
): Promise<DiscoverBook[]> {
  const fields =
    "key,title,author_name,cover_i,first_publish_year,ratings_count";
  // OL's search endpoint rejects `q=*` with 422; use a wildcard field
  // query instead. The `first_publish_year=` filter still narrows to
  // the right year.
  const url =
    `https://openlibrary.org/search.json` +
    `?q=title%3A*&first_publish_year=${year}&sort=rating&limit=${limit * 3}` +
    `&fields=${encodeURIComponent(fields)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": CHROME_UA },
  });
  if (!res.ok) {
    throw new Error(`OpenLibrary search ${year} → ${res.status}`);
  }
  const data = (await res.json()) as OlSearchResponse;
  const docs = data.docs ?? [];
  // OL's `sort=rating` can promote books with one 5★ rating. Prefer
  // entries with a few ratings; fall back to the unfiltered list if
  // that strips it too thin to be useful.
  const popular = docs.filter((d) => (d.ratings_count ?? 0) >= 5);
  const pool = popular.length >= 12 ? popular : docs;
  return pool
    .map(searchDocToBook)
    .filter((b): b is DiscoverBook => b !== null)
    .slice(0, limit);
}

// --- List definitions -------------------------------------------------------

type ListDefinition = {
  id: string;
  label: string;
  source: "nyt" | "openlibrary";
  fetcher: () => Promise<DiscoverBook[]>;
  requiresNyt?: boolean;
};

// Built dynamically so the Top YYYY entries pick up the current year
// without a redeploy when January rolls over.
function getListDefinitions(): ListDefinition[] {
  const currentYear = new Date().getFullYear();
  return [
    {
      id: "trending",
      label: "Trending",
      source: "openlibrary",
      fetcher: () => fetchOlTrending(24),
    },
    {
      id: `top-${currentYear}`,
      label: `Top ${currentYear}`,
      source: "openlibrary",
      fetcher: () => fetchOlSearchByYear(currentYear, 24),
    },
    {
      id: `top-${currentYear - 1}`,
      label: `Top ${currentYear - 1}`,
      source: "openlibrary",
      fetcher: () => fetchOlSearchByYear(currentYear - 1, 24),
    },
    {
      id: "fiction",
      label: "Fiction",
      source: "nyt",
      requiresNyt: true,
      fetcher: () => fetchNyt("combined-print-and-e-book-fiction"),
    },
    {
      id: "nonfiction",
      label: "Nonfiction",
      source: "openlibrary",
      // NYT bestseller list when a key's available, OL subject otherwise.
      fetcher: async () => {
        const { NYT_API_KEY } = getServerEnvVariables();
        return NYT_API_KEY
          ? fetchNyt("combined-print-and-e-book-nonfiction")
          : fetchOlSubject("nonfiction", 24);
      },
    },
    {
      id: "scifi-fantasy",
      label: "Sci-Fi & Fantasy",
      source: "openlibrary",
      fetcher: () => fetchOlSubject("science_fiction", 24),
    },
    {
      id: "mystery",
      label: "Mystery",
      source: "openlibrary",
      fetcher: () => fetchOlSubject("mystery", 24),
    },
    {
      id: "thriller",
      label: "Thriller",
      source: "openlibrary",
      fetcher: () => fetchOlSubject("thriller", 24),
    },
    {
      id: "romance",
      label: "Romance",
      source: "openlibrary",
      fetcher: () => fetchOlSubject("romance", 24),
    },
    {
      id: "biography",
      label: "Biography",
      source: "openlibrary",
      fetcher: () => fetchOlSubject("biography", 24),
    },
    {
      id: "history",
      label: "History",
      source: "openlibrary",
      fetcher: () => fetchOlSubject("history", 24),
    },
    {
      id: "self-help",
      label: "Self-help",
      source: "openlibrary",
      fetcher: () => fetchOlSubject("self-help", 24),
    },
    {
      id: "audio-fiction",
      label: "Audio Fiction",
      source: "nyt",
      requiresNyt: true,
      fetcher: () => fetchNyt("audio-fiction"),
    },
    {
      id: "audio-nonfiction",
      label: "Audio Nonfiction",
      source: "nyt",
      requiresNyt: true,
      fetcher: () => fetchNyt("audio-nonfiction"),
    },
  ];
}

export function availableLists(): ListDefinition[] {
  const { NYT_API_KEY } = getServerEnvVariables();
  return getListDefinitions().filter(
    (l) => !l.requiresNyt || !!NYT_API_KEY,
  );
}

export async function getDiscoverList(id: string): Promise<DiscoverList | null> {
  const def = availableLists().find((l) => l.id === id);
  if (!def) return null;

  const cached = cache.get(id);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.value;
  }

  const books = await def.fetcher();
  const value: DiscoverList = {
    id: def.id,
    label: def.label,
    source: def.source,
    books,
  };
  cache.set(id, { value, fetchedAt: Date.now() });
  return value;
}

// --- OpenLibrary work-detail (lazy) -----------------------------------------

type OlWorkDetail = {
  description?: string | { value?: string; type?: string };
  subjects?: string[];
};

export async function fetchOpenLibraryDescription(
  workKey: string,
): Promise<string | null> {
  // workKey is "/works/OL12345W"; strip any leading slash defensively.
  const path = workKey.startsWith("/") ? workKey : `/${workKey}`;
  const res = await fetch(`https://openlibrary.org${path}.json`, {
    headers: { Accept: "application/json", "User-Agent": CHROME_UA },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as OlWorkDetail;
  if (!data.description) return null;
  if (typeof data.description === "string") return data.description.trim();
  return data.description.value?.trim() ?? null;
}
