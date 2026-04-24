"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Book } from "@/types";
import { useTransmission, TorrentSnapshot } from "@/contexts/TransmissionContext";
import BookRow from "./BookRow";

type GrabEntry = {
  at: string;
  title: string;
  category: "audiobook" | "ebook";
  torrentUrl: string;
  book?: Book;
};

const RECENT_ON_HOME = 5;

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
  const [grabs, setGrabs] = useState<GrabEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/recent-grabs?limit=${RECENT_ON_HOME}`);
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
  // Only grabs that have the full Book snapshot can be rendered as a
  // full BookRow. Older entries missing `.book` are silently skipped
  // here; they still show up on the dedicated /activity page as a
  // compact fallback.
  const recentWithBook = grabs.filter((g) => g.book);

  if (downloading.length === 0 && recentWithBook.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        marginBottom: "18px",
      }}
    >
      {downloading.length > 0 && (
        <div>
          <SectionHeader label="Downloading now" count={downloading.length} accent="#3b82f6" />
          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              paddingBottom: "4px",
              scrollbarWidth: "thin",
            }}
          >
            {downloading.map((t) => {
              const dir = t.downloadDir || "";
              const category: "audiobook" | "ebook" | undefined = dir.includes(
                "audiobook",
              )
                ? "audiobook"
                : dir.includes("ebook")
                  ? "ebook"
                  : undefined;
              return (
                <Chip
                  key={`${dir}-${t.name}`}
                  title={t.name}
                  subtitle={downloadingLabel(t)}
                  accent="#3b82f6"
                  category={category}
                />
              );
            })}
          </div>
        </div>
      )}

      {recentWithBook.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "6px",
            }}
          >
            <SectionHeader label="Recently added" count={recentWithBook.length} accent="#10b981" />
            <Link
              href="/activity"
              style={{
                fontSize: "12px",
                color: "#60a5fa",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              See all →
            </Link>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {recentWithBook.map((g) => (
              <BookRow key={`${g.at}-${g.category}-${g.title}`} book={g.book!} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  label,
  count,
  accent,
}: {
  label: string;
  count: number;
  accent: string;
}) {
  return (
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
  );
}

function Chip({
  title,
  subtitle,
  accent,
  category,
}: {
  title: string;
  subtitle: string;
  accent: string;
  category?: "audiobook" | "ebook";
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          minWidth: 0,
        }}
      >
        {category && (
          <span
            style={{
              flex: "0 0 auto",
              padding: "1px 5px",
              borderRadius: "3px",
              fontSize: "9.5px",
              fontWeight: 700,
              letterSpacing: "0.3px",
              background: category === "audiobook" ? "#1e3a8a" : "#065f46",
              color: category === "audiobook" ? "#93c5fd" : "#6ee7b7",
            }}
          >
            {category === "audiobook" ? "AUD" : "EBK"}
          </span>
        )}
        <span
          style={{
            color: "#e2e8f0",
            fontSize: "12.5px",
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
          }}
        >
          {title}
        </span>
      </div>
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
