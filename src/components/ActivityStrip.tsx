"use client";

import { useEffect, useState } from "react";
import { useTransmission, TorrentSnapshot } from "@/contexts/TransmissionContext";
import { useLibrary } from "@/contexts/LibraryContext";

type GrabEntry = {
  at: string;
  title: string;
  category: "audiobook" | "ebook";
  torrentUrl: string;
};

function relative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return "soon";
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  return `${days} d ago`;
}

function downloadingLabel(t: TorrentSnapshot): string {
  const pct = Math.round(t.percentDone * 100);
  if (t.status === 4) {
    const rate =
      t.rateDownload > 0
        ? ` · ${(t.rateDownload / (1024 * 1024)).toFixed(1)} MB/s`
        : "";
    return `↓ ${pct}%${rate}`;
  }
  if (t.status === 1 || t.status === 2) return "⌛ Checking";
  if (t.status === 3 || t.status === 5) return "⌛ Waiting";
  return `${pct}%`;
}

export default function ActivityStrip() {
  const { torrents } = useTransmission();
  const { matchInLibrary } = useLibrary();
  const [grabs, setGrabs] = useState<GrabEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/recent-grabs");
        if (!res.ok) return;
        const data = (await res.json()) as { grabs: GrabEntry[] };
        if (!cancelled) setGrabs(data.grabs || []);
      } catch {
        // non-fatal
      }
    };
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const downloading = torrents.filter(
    (t) =>
      t.status === 4 || t.status === 3 || t.status === 5 || t.status === 1 || t.status === 2,
  );
  const recentlyAdded = grabs
    .filter((g) => {
      const ageMs = Date.now() - new Date(g.at).getTime();
      return ageMs < 7 * 24 * 60 * 60 * 1000;
    })
    .slice(0, 10);

  if (downloading.length === 0 && recentlyAdded.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        marginBottom: "18px",
      }}
    >
      {downloading.length > 0 && (
        <Section
          label="Downloading now"
          count={downloading.length}
          accent="#3b82f6"
        >
          {downloading.map((t) => (
            <Chip
              key={t.name}
              title={t.name}
              subtitle={downloadingLabel(t)}
              accent="#3b82f6"
            />
          ))}
        </Section>
      )}
      {recentlyAdded.length > 0 && (
        <Section
          label="Recently added"
          count={recentlyAdded.length}
          accent="#10b981"
        >
          {recentlyAdded.map((g) => {
            const inLib = matchInLibrary(g.title, g.category);
            const subtitle = inLib
              ? inLib.kind === "audiobook"
                ? "★ Ready to listen"
                : "★ Ready to read"
              : relative(g.at);
            return (
              <Chip
                key={`${g.at}-${g.title}`}
                title={g.title}
                subtitle={subtitle}
                accent={inLib ? "#10b981" : "#64748b"}
              />
            );
          })}
        </Section>
      )}
    </div>
  );
}

function Section({
  label,
  count,
  accent,
  children,
}: {
  label: string;
  count: number;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "6px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: "11px",
            color: accent,
            background: "#1e293b",
            border: `1px solid ${accent}33`,
            padding: "1px 8px",
            borderRadius: "999px",
            fontWeight: 700,
          }}
        >
          {count}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "4px",
          scrollbarWidth: "thin",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Chip({
  title,
  subtitle,
  accent,
}: {
  title: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <div
      title={title}
      style={{
        flex: "0 0 auto",
        minWidth: "180px",
        maxWidth: "240px",
        padding: "8px 12px",
        background: "#1e293b",
        border: "1px solid #334155",
        borderLeft: `3px solid ${accent}`,
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "2px",
      }}
    >
      <span
        style={{
          color: "#e2e8f0",
          fontSize: "12.5px",
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </span>
      <span
        style={{
          color: accent,
          fontSize: "11.5px",
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {subtitle}
      </span>
    </div>
  );
}
