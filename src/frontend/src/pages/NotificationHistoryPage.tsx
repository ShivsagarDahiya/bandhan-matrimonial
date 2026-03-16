import { ArrowLeft, Bell, Trash2 } from "lucide-react";
import { useState } from "react";

export interface StoredNotification {
  id: string;
  type:
    | "match_request"
    | "mutual_match"
    | "story_like"
    | "story_comment"
    | "story_reply";
  profileName: string;
  profilePhoto?: string;
  text: string;
  timestamp: number;
  read: boolean;
}

export const NOTIF_HISTORY_KEY = "bandhan_notification_history";

export function getNotificationHistory(): StoredNotification[] {
  try {
    const raw = localStorage.getItem(NOTIF_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveNotificationHistory(items: StoredNotification[]) {
  try {
    localStorage.setItem(
      NOTIF_HISTORY_KEY,
      JSON.stringify(items.slice(0, 100)),
    );
  } catch {}
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

function typeBadge(type: StoredNotification["type"]) {
  switch (type) {
    case "story_like":
      return "❤️";
    case "story_comment":
      return "💬";
    case "story_reply":
      return "💬";
    case "match_request":
      return "💕";
    case "mutual_match":
      return "🎉";
    default:
      return "🔔";
  }
}

type FilterTab = "all" | "match_request" | "mutual_match" | "story";

const TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "all" },
  { label: "Match Requests", value: "match_request" },
  { label: "Matches", value: "mutual_match" },
  { label: "Stories", value: "story" },
];

interface NotificationHistoryPageProps {
  onBack: () => void;
}

export default function NotificationHistoryPage({
  onBack,
}: NotificationHistoryPageProps) {
  const [history, setHistory] = useState<StoredNotification[]>(() =>
    getNotificationHistory().sort((a, b) => b.timestamp - a.timestamp),
  );
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filtered =
    activeTab === "all"
      ? history
      : activeTab === "story"
        ? history.filter(
            (n) =>
              n.type === "story_like" ||
              n.type === "story_comment" ||
              n.type === "story_reply",
          )
        : history.filter((n) => n.type === activeTab);

  const handleClearAll = () => {
    saveNotificationHistory([]);
    setHistory([]);
  };

  const emptyText = () => {
    switch (activeTab) {
      case "all":
        return "Matches and requests will appear here";
      case "match_request":
        return "Match requests will appear here";
      case "mutual_match":
        return "Your mutual matches will appear here";
      case "story":
        return "Story interactions will appear here";
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      data-ocid="notification_history.page"
      style={{ background: "oklch(0.08 0.04 300)" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-4"
        style={{
          background: "oklch(0.10 0.05 300)",
          borderBottom: "1px solid oklch(0.18 0.06 300)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            data-ocid="notification_history.back_button"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              background: "oklch(0.16 0.06 300)",
              border: "1px solid oklch(0.24 0.07 300)",
            }}
          >
            <ArrowLeft
              className="text-white/80"
              style={{ width: 18, height: 18 }}
            />
          </button>
          <div className="flex items-center gap-2">
            <Bell className="text-white/70" style={{ width: 18, height: 18 }} />
            <h1 className="text-white font-semibold text-base tracking-wide">
              Notification History
            </h1>
          </div>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            data-ocid="notification_history.clear_button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
            style={{
              background: "oklch(0.18 0.07 10 / 0.4)",
              border: "1px solid oklch(0.35 0.15 10 / 0.5)",
              color: "oklch(0.75 0.18 10)",
            }}
          >
            <Trash2 style={{ width: 13, height: 13 }} />
            Clear all
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div
        className="flex gap-2 px-4 py-3 overflow-x-auto"
        style={{ borderBottom: "1px solid oklch(0.16 0.05 300)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            data-ocid={`notification_history.${tab.value}.tab`}
            className="whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background:
                activeTab === tab.value
                  ? "linear-gradient(135deg,oklch(0.55 0.22 10),oklch(0.45 0.2 300))"
                  : "oklch(0.14 0.05 300)",
              border:
                activeTab === tab.value
                  ? "1px solid transparent"
                  : "1px solid oklch(0.22 0.06 300)",
              color: activeTab === tab.value ? "#fff" : "oklch(0.65 0.05 300)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div
        className="flex-1 overflow-y-auto"
        data-ocid="notification_history.list"
      >
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 gap-4"
            data-ocid="notification_history.empty_state"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
              style={{ background: "oklch(0.14 0.05 300)" }}
            >
              {activeTab === "story" ? "📖" : "🔔"}
            </div>
            <div className="text-center">
              <p className="text-white/70 font-medium text-sm">
                No notifications yet
              </p>
              <p className="text-white/30 text-xs mt-1">{emptyText()}</p>
            </div>
          </div>
        ) : (
          <div
            className="divide-y"
            style={{ borderColor: "oklch(0.15 0.05 300)" }}
          >
            {filtered.map((n, idx) => (
              <div
                key={n.id}
                data-ocid={`notification_history.item.${idx + 1}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors"
                style={{
                  background: !n.read
                    ? "oklch(0.13 0.06 300 / 0.6)"
                    : "transparent",
                }}
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                  style={{
                    background: n.profilePhoto
                      ? undefined
                      : `linear-gradient(135deg,hsl(${(n.profileName.charCodeAt(0) * 10) % 360},70%,40%),hsl(${(n.profileName.charCodeAt(0) * 10 + 120) % 360},70%,30%))`,
                  }}
                >
                  {n.profilePhoto ? (
                    <img
                      src={n.profilePhoto}
                      alt={n.profileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(n.profileName)
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm leading-snug">{n.text}</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {timeAgo(n.timestamp)}
                  </p>
                </div>

                {/* Type badge + unread dot */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-base">{typeBadge(n.type)}</span>
                  {!n.read && (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: "oklch(0.65 0.22 10)" }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
