"use client";

import Link from "next/link";

type Tagline = "Browse & Download Books" | "Recent activity" | "Discover";

export default function AppHeader({
  tagline = "Browse & Download Books",
  onSettingsClick,
  onActivityClick,
}: {
  tagline?: Tagline;
  onSettingsClick: () => void;
  onActivityClick: () => void;
}) {
  return (
    <header
      style={{
        background: "#1e293b",
        borderBottom: "1px solid #334155",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          maxWidth: "100%",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              background: "#3b82f6",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              fill="none"
              viewBox="0 0 24 24"
              stroke="white"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "#f1f5f9",
                lineHeight: "1",
              }}
            >
              BookGrab
            </div>
            <div
              className="bg-header-tagline"
              style={{
                fontSize: "11px",
                color: "#64748b",
                lineHeight: "1.4",
                marginTop: "2px",
              }}
            >
              {tagline}
            </div>
          </div>
        </Link>

        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <Link
            href="/discover"
            aria-label="Discover"
            title="Discover popular books"
            style={{
              color: "#cbd5e1",
              padding: "8px",
              display: "inline-flex",
              textDecoration: "none",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </Link>
          <button
            onClick={onActivityClick}
            aria-label="Recent activity"
            title="Recent activity"
            style={{
              background: "transparent",
              border: "none",
              color: "#cbd5e1",
              padding: "8px",
              cursor: "pointer",
              display: "inline-flex",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          <button
            onClick={onSettingsClick}
            aria-label="Settings"
            style={{
              background: "transparent",
              border: "none",
              color: "#cbd5e1",
              padding: "8px",
              cursor: "pointer",
              display: "inline-flex",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
