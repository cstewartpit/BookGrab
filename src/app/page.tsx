"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import BrowseCategoryPage from "@/components/BrowseCategoryPage";
import SettingsModal from "@/components/SettingsModal";
import RecentActivityDrawer from "@/components/RecentActivityDrawer";
import AppHeader from "@/components/AppHeader";

function HomeContent() {
  const sp = useSearchParams();
  const rawCat = sp.get("cat");
  const cat: "audiobook" | "ebook" | "all" =
    rawCat === "audiobook" || rawCat === "ebook" || rawCat === "all"
      ? rawCat
      : "all";
  const sort = sp.get("sort") || "seedersDesc";
  const tag = sp.get("tag") || undefined;
  const query = sp.get("q") || undefined;
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
        onSettingsClick={() => setSettingsOpen(true)}
        onActivityClick={() => setActivityOpen(true)}
      />

      <BrowseCategoryPage
        category={cat}
        initialSort={sort}
        initialTag={tag}
        initialQuery={query}
        onShowActivity={() => setActivityOpen(true)}
      />


      <footer
        style={{
          borderTop: "1px solid #334155",
          padding: "24px 16px",
          textAlign: "center",
          background: "#1e293b",
          color: "#64748b",
          fontSize: "13px",
        }}
      >
        BookGrab &copy; {new Date().getFullYear()}
      </footer>

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

export default function Home() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "#0f172a",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Loading...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
