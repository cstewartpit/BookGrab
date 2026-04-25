"use client";

import { useEffect, useState } from "react";
import { DiscoverBook, DiscoverList } from "@/lib/discover";
import DiscoverBookModal from "./DiscoverBookModal";

type ListMeta = { id: string; label: string; source: "nyt" | "openlibrary" };

export default function DiscoverGrid() {
  const [lists, setLists] = useState<ListMeta[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [data, setData] = useState<DiscoverList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openBook, setOpenBook] = useState<DiscoverBook | null>(null);

  // Load the catalogue of available lists once.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/discover")
      .then((r) => r.json())
      .then((d: { lists: ListMeta[] }) => {
        if (cancelled) return;
        setLists(d.lists);
        if (d.lists.length > 0) setActiveListId(d.lists[0].id);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load lists");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch the active list's books whenever the tab changes.
  useEffect(() => {
    if (!activeListId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/discover?list=${encodeURIComponent(activeListId)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        return j as DiscoverList;
      })
      .then((d) => {
        if (cancelled) return;
        setData(d);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load");
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeListId]);

  if (lists.length === 0 && !error) {
    return (
      <div style={{ padding: "20px", color: "#94a3b8", fontSize: "13px" }}>
        Loading lists...
      </div>
    );
  }

  return (
    <div>
      <div
        className="bg-tab-strip"
        style={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          marginBottom: "16px",
          paddingBottom: "4px",
        }}
      >
        {lists.map((l) => {
          const active = l.id === activeListId;
          return (
            <button
              key={l.id}
              onClick={() => setActiveListId(l.id)}
              style={{
                flex: "0 0 auto",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 600,
                background: active ? "#3b82f6" : "#1e293b",
                color: active ? "#fff" : "#cbd5e1",
                border: `1px solid ${active ? "#3b82f6" : "#334155"}`,
                borderRadius: "999px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {l.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          style={{
            padding: "16px",
            background: "#1e293b",
            border: "1px solid #7f1d1d",
            borderRadius: "8px",
            color: "#fda4af",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "20px", color: "#94a3b8", fontSize: "13px" }}>
          Loading...
        </div>
      ) : data ? (
        <div
          className="bg-discover-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "14px",
          }}
        >
          {data.books.map((b) => (
            <DiscoverCard
              key={`${b.source}-${b.externalId}`}
              book={b}
              onClick={() => setOpenBook(b)}
            />
          ))}
        </div>
      ) : null}

      {openBook && (
        <DiscoverBookModal book={openBook} onClose={() => setOpenBook(null)} />
      )}
    </div>
  );
}

function DiscoverCard({
  book,
  onClick,
}: {
  book: DiscoverBook;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: "8px",
        padding: "8px",
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        color: "#e2e8f0",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "2/3",
          background: "#0f172a",
          borderRadius: "4px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverUrl}
            alt=""
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              color: "#475569",
              fontSize: "11px",
              textAlign: "center",
              padding: "8px",
            }}
          >
            No cover
          </div>
        )}
        {typeof book.rank === "number" && (
          <span
            style={{
              position: "absolute",
              top: "6px",
              left: "6px",
              background: "rgba(15,23,42,0.92)",
              color: "#fde68a",
              fontSize: "11px",
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: "4px",
              border: "1px solid rgba(234,179,8,0.4)",
            }}
          >
            #{book.rank}
          </span>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: "#f1f5f9",
            fontSize: "12.5px",
            fontWeight: 600,
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
          }}
        >
          {book.title}
        </div>
        <div
          style={{
            color: "#94a3b8",
            fontSize: "11.5px",
            marginTop: "2px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {book.author}
        </div>
      </div>
    </button>
  );
}
