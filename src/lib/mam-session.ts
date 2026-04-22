import { promises as fs } from "fs";
import path from "path";
import { SearchResponse } from "@/types";

type SessionFile = {
  token: string | null;
  lastPingAt: string | null;
  lastPingOk: boolean | null;
  lastMessage: string | null;
  lastError: string | null;
};

export type KeepaliveStatus = {
  tokenPresent: boolean;
  lastPingAt: string | null;
  lastPingOk: boolean | null;
  lastMessage: string | null;
  lastError: string | null;
  nextPingAt: string | null;
  intervalMinutes: number;
};

const INTERVAL_MS = 30 * 60 * 1000;
const BROWSE_CACHE_TTL_MS = 60 * 1000;
const DYNAMIC_SEEDBOX_URL = "https://t.myanonamouse.net/json/dynamicSeedbox.php";

const empty: SessionFile = {
  token: null,
  lastPingAt: null,
  lastPingOk: null,
  lastMessage: null,
  lastError: null,
};

// Module-level singleton. Guarded against Next.js dev hot-reload via globalThis.
type GlobalState = {
  session: SessionFile;
  intervalId: NodeJS.Timeout | null;
  loaded: boolean;
  browseCache: Map<string, { at: number; data: SearchResponse }>;
};

const g = globalThis as unknown as { __bookgrabSession?: GlobalState };
if (!g.__bookgrabSession) {
  g.__bookgrabSession = {
    session: { ...empty },
    intervalId: null,
    loaded: false,
    browseCache: new Map(),
  };
}
const state = g.__bookgrabSession;

function dataDir(): string {
  return process.env.DATA_DIR || path.resolve(process.cwd(), ".data");
}

function sessionPath(): string {
  return path.join(dataDir(), "session.json");
}

async function loadFromDisk(): Promise<void> {
  if (state.loaded) return;
  state.loaded = true;
  let fileExisted = false;
  try {
    const raw = await fs.readFile(sessionPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<SessionFile>;
    state.session = { ...empty, ...parsed };
    fileExisted = true;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error("[mam-session] failed to read session.json:", err);
    }
  }
  // Env bootstrap only applies on first boot (no session file yet). Once the
  // user has managed the token via the UI — including explicitly clearing it
  // — the on-disk state is authoritative so the env var can't resurrect it.
  if (!fileExisted && !state.session.token && process.env.MAM_TOKEN) {
    state.session.token = process.env.MAM_TOKEN;
  }
}

async function persist(): Promise<void> {
  const dir = dataDir();
  await fs.mkdir(dir, { recursive: true });
  const tmp = sessionPath() + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(state.session, null, 2), {
    mode: 0o600,
  });
  await fs.rename(tmp, sessionPath());
}

export async function getToken(): Promise<string | null> {
  await loadFromDisk();
  return state.session.token;
}

export async function setToken(token: string): Promise<void> {
  await loadFromDisk();
  state.session.token = token.trim() || null;
  state.session.lastPingAt = null;
  state.session.lastPingOk = null;
  state.session.lastMessage = null;
  state.session.lastError = null;
  await persist();
  // Immediate ping, then (re)start the loop.
  void pingMam();
  startKeepaliveLoop();
}

export async function clearToken(): Promise<void> {
  await loadFromDisk();
  state.session = { ...empty };
  await persist();
  stopKeepaliveLoop();
}

export async function getStatus(): Promise<KeepaliveStatus> {
  await loadFromDisk();
  const nextPingAt = state.session.lastPingAt
    ? new Date(
        new Date(state.session.lastPingAt).getTime() + INTERVAL_MS,
      ).toISOString()
    : null;
  return {
    tokenPresent: !!state.session.token,
    lastPingAt: state.session.lastPingAt,
    lastPingOk: state.session.lastPingOk,
    lastMessage: state.session.lastMessage,
    lastError: state.session.lastError,
    nextPingAt,
    intervalMinutes: INTERVAL_MS / 60000,
  };
}

export async function pingMam(): Promise<KeepaliveStatus> {
  await loadFromDisk();
  const token = state.session.token;
  const now = new Date().toISOString();

  if (!token) {
    state.session.lastPingAt = now;
    state.session.lastPingOk = false;
    state.session.lastMessage = null;
    state.session.lastError = "No MAM token configured";
    await persist();
    return getStatus();
  }

  try {
    const res = await fetch(DYNAMIC_SEEDBOX_URL, {
      method: "GET",
      headers: {
        Cookie: `mam_id=${token}`,
        "User-Agent": "BookGrab/1.0",
      },
    });
    const text = await res.text();

    // MAM's dynamicSeedbox.php returns JSON like:
    //   {"Success":true,"msg":"Completed"}    - IP updated
    //   {"Success":true,"msg":"No change"}    - IP already current
    //   {"Success":false,"msg":"Invalid session - Other"}
    //   {"Success":false,"msg":"Incorrect session type"}
    // Primary truth is the Success boolean; fall back to substring match for
    // older/plaintext responses.
    let isSuccess = false;
    try {
      const parsed = JSON.parse(text) as { Success?: boolean; msg?: string };
      if (typeof parsed.Success === "boolean") {
        isSuccess = res.ok && parsed.Success;
      }
    } catch {
      isSuccess =
        res.ok && /\b(Completed|No change)\b/i.test(text);
    }

    state.session.lastPingAt = now;
    state.session.lastPingOk = isSuccess;
    state.session.lastMessage = text.slice(0, 500);
    state.session.lastError = isSuccess ? null : text.slice(0, 500);
    await persist();

    if (isSuccess) {
      console.log("[mam-session] ping ok:", text.trim());
    } else {
      console.warn("[mam-session] ping failed:", text.trim());
    }
  } catch (err) {
    state.session.lastPingAt = now;
    state.session.lastPingOk = false;
    state.session.lastMessage = null;
    state.session.lastError =
      err instanceof Error ? err.message : "Network error";
    await persist();
    console.error("[mam-session] ping error:", err);
  }

  return getStatus();
}

export function startKeepaliveLoop(): void {
  stopKeepaliveLoop();
  state.intervalId = setInterval(() => {
    void pingMam();
  }, INTERVAL_MS);
  // Node's default keeps the process alive for unref'd intervals; we want this
  // interval to hold the event loop open for the life of the server, so no unref.
  console.log(
    `[mam-session] keepalive loop started (interval ${INTERVAL_MS / 60000}m)`,
  );
}

export function stopKeepaliveLoop(): void {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
}

export async function bootKeepalive(): Promise<void> {
  await loadFromDisk();
  if (state.session.token) {
    startKeepaliveLoop();
    // Run one ping on boot so status is fresh.
    void pingMam();
  } else {
    console.log("[mam-session] no token on disk — keepalive idle");
  }
}

// --- Browse row cache ----------------------------------------------------

export function getCachedBrowse(key: string): SearchResponse | null {
  const hit = state.browseCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > BROWSE_CACHE_TTL_MS) {
    state.browseCache.delete(key);
    return null;
  }
  return hit.data;
}

export function setCachedBrowse(key: string, data: SearchResponse): void {
  state.browseCache.set(key, { at: Date.now(), data });
}
