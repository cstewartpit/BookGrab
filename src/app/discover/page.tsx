"use client";

import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import SettingsModal from "@/components/SettingsModal";
import RecentActivityDrawer from "@/components/RecentActivityDrawer";
import DiscoverGrid from "@/components/DiscoverGrid";

export default function DiscoverPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e2e8f0",
      }}
    >
      <AppHeader
        tagline="Discover"
        onSettingsClick={() => setSettingsOpen(true)}
        onActivityClick={() => setActivityOpen(true)}
      />

      <main className="bg-page">
        <div style={{ marginBottom: "16px" }}>
          <h1
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#f1f5f9",
              marginBottom: "4px",
            }}
          >
            Hot books right now
          </h1>
          <p style={{ fontSize: "12.5px", color: "#94a3b8" }}>
            Curated lists from NYT and OpenLibrary. Click a cover for details,
            then hit <strong>Find on bookgrab</strong> to see if it&apos;s
            available to download.
          </p>
        </div>

        <DiscoverGrid />
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <RecentActivityDrawer
        isOpen={activityOpen}
        onClose={() => setActivityOpen(false)}
      />
    </div>
  );
}
