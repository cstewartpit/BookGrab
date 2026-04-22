import { promises as fs } from "fs";
import path from "path";

export type GrabEntry = {
  at: string;
  title: string;
  category: "audiobook" | "ebook";
  torrentUrl: string;
};

const MAX_KEPT = 200;

function dataDir(): string {
  return process.env.DATA_DIR || path.resolve(process.cwd(), ".data");
}

function grabsPath(): string {
  return path.join(dataDir(), "grabs.json");
}

async function readAll(): Promise<GrabEntry[]> {
  try {
    const raw = await fs.readFile(grabsPath(), "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as GrabEntry[];
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error("[grabs-log] failed to read:", err);
    }
  }
  return [];
}

async function writeAll(entries: GrabEntry[]): Promise<void> {
  await fs.mkdir(dataDir(), { recursive: true });
  const tmp = grabsPath() + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(entries, null, 2), { mode: 0o600 });
  await fs.rename(tmp, grabsPath());
}

export async function logGrab(entry: Omit<GrabEntry, "at">): Promise<void> {
  const all = await readAll();
  all.unshift({ ...entry, at: new Date().toISOString() });
  if (all.length > MAX_KEPT) all.length = MAX_KEPT;
  await writeAll(all);
}

export async function getRecentGrabs(limit = 20): Promise<GrabEntry[]> {
  const all = await readAll();
  return all.slice(0, limit);
}
