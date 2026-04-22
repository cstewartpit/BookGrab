"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatWhen(isoString: string | null): string {
  if (!isoString) return "Never";
  const d = new Date(isoString);
  const now = Date.now();
  const diffMs = now - d.getTime();
  if (diffMs < 0) {
    const ahead = Math.round(-diffMs / 60000);
    return `in ${ahead} min (${d.toLocaleTimeString()})`;
  }
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return `just now (${d.toLocaleTimeString()})`;
  if (diffMin < 60) return `${diffMin} min ago (${d.toLocaleTimeString()})`;
  return d.toLocaleString();
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    status,
    saveToken,
    clearToken,
    pingNow,
    pingInFlight,
    setPollOn,
    refreshStatus,
  } = useSettings();
  const [tokenInput, setTokenInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPollOn(true);
    void refreshStatus();
    return () => setPollOn(false);
  }, [isOpen, setPollOn, refreshStatus]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!tokenInput.trim()) return;
    setSaving(true);
    setSaveError(null);
    const result = await saveToken(tokenInput.trim());
    setSaving(false);
    if (result.success) {
      setTokenInput("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setSaveError(result.error || "Failed to save");
    }
  };

  const handleClear = async () => {
    if (!confirm("Remove the saved MAM token from the server?")) return;
    await clearToken();
  };

  const statusBadge = (() => {
    if (!status) return { bg: "#374151", fg: "#9ca3af", label: "Loading" };
    if (!status.tokenPresent)
      return { bg: "#374151", fg: "#9ca3af", label: "No token" };
    if (status.lastPingOk === null)
      return { bg: "#374151", fg: "#9ca3af", label: "Unknown" };
    if (status.lastPingOk)
      return { bg: "#065f46", fg: "#6ee7b7", label: "Active" };
    return { bg: "#7f1d1d", fg: "#fca5a5", label: "Error" };
  })();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1e293b",
          padding: "24px",
          borderRadius: "12px",
          maxWidth: "520px",
          width: "92%",
          border: "1px solid #334155",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: "700",
              color: "#e5e7eb",
            }}
          >
            Settings
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label
              style={{
                fontWeight: "600",
                fontSize: "14px",
                color: "#e5e7eb",
              }}
            >
              MAM Token
            </label>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={
                status?.tokenPresent
                  ? "Token is stored — enter a new one to replace"
                  : "Paste your MAM session token"
              }
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#e5e7eb",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "#94a3b8",
                lineHeight: "1.5",
              }}
            >
              MAM → Preferences → Security → create a new session with
              <strong> “Allow session to set dynamic seedbox IP” </strong>
              enabled, then paste the <code>mam_id</code> cookie value here. The
              token lives on the server (persisted to disk) and keepalive runs
              even when this tab is closed.
            </p>
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "4px",
              }}
            >
              <button
                onClick={handleSave}
                disabled={saving || !tokenInput.trim()}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: "#3b82f6",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor:
                    saving || !tokenInput.trim() ? "not-allowed" : "pointer",
                  opacity: saving || !tokenInput.trim() ? 0.5 : 1,
                }}
              >
                {saving ? "Saving..." : "Save token"}
              </button>
              {status?.tokenPresent && (
                <button
                  onClick={handleClear}
                  style={{
                    padding: "10px 16px",
                    background: "transparent",
                    border: "1px solid #7f1d1d",
                    borderRadius: "8px",
                    color: "#fca5a5",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            {saved && (
              <div
                style={{
                  color: "#6ee7b7",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                Token saved — keepalive restarted.
              </div>
            )}
            {saveError && (
              <div
                style={{
                  color: "#fca5a5",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                {saveError}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              padding: "14px",
              background: "#0f172a",
              borderRadius: "8px",
              border: "1px solid #334155",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#e5e7eb",
                }}
              >
                Session Status
              </span>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  background: statusBadge.bg,
                  color: statusBadge.fg,
                }}
              >
                {statusBadge.label}
              </span>
            </div>

            <div style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6 }}>
              <div>
                Token stored:{" "}
                <strong style={{ color: "#e5e7eb" }}>
                  {status?.tokenPresent ? "Yes" : "No"}
                </strong>
              </div>
              <div>
                Last ping:{" "}
                <strong style={{ color: "#e5e7eb" }}>
                  {formatWhen(status?.lastPingAt ?? null)}
                </strong>
              </div>
              <div>
                Next ping:{" "}
                <strong style={{ color: "#e5e7eb" }}>
                  {formatWhen(status?.nextPingAt ?? null)}
                </strong>{" "}
                <span style={{ color: "#64748b" }}>
                  (every {status?.intervalMinutes ?? 30} min)
                </span>
              </div>
              {status?.lastMessage && status.lastPingOk && (
                <div
                  style={{
                    color: "#6ee7b7",
                    marginTop: "6px",
                    wordBreak: "break-word",
                  }}
                >
                  MAM response: {status.lastMessage}
                </div>
              )}
              {status?.lastError && (
                <div
                  style={{
                    color: "#fca5a5",
                    marginTop: "6px",
                    wordBreak: "break-word",
                  }}
                >
                  MAM error: {status.lastError}
                  {status.lastError.toLowerCase().includes("session") && (
                    <div
                      style={{
                        color: "#fde68a",
                        marginTop: "4px",
                        fontSize: "12px",
                      }}
                    >
                      Hint: create your MAM session with “Allow session to set
                      dynamic seedbox IP” enabled.
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={pingNow}
              disabled={pingInFlight || !status?.tokenPresent}
              style={{
                padding: "10px 14px",
                background: "#374151",
                border: "1px solid #4b5563",
                borderRadius: "8px",
                color: "#e5e7eb",
                fontSize: "13px",
                fontWeight: "600",
                cursor:
                  pingInFlight || !status?.tokenPresent
                    ? "not-allowed"
                    : "pointer",
                opacity: pingInFlight || !status?.tokenPresent ? 0.5 : 1,
              }}
            >
              {pingInFlight ? "Pinging MAM..." : "Ping now"}
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              style={{
                padding: "10px 20px",
                background: "transparent",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#94a3b8",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
