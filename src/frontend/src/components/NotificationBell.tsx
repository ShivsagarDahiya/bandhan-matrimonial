import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Profile } from "../backend";
import { useMatchRequests, useMutualMatches } from "../hooks/useQueries";

interface Notification {
  id: string;
  type: "match_request" | "mutual_match";
  profile: Profile;
  text: string;
  timestamp: number;
}

const SEEN_KEY = "bandhan_seen_notifications";

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
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
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(getSeenIds);
  const [notifTimestamps, setNotifTimestamps] = useState<
    Record<string, number>
  >({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: matchRequests = [], refetch: refetchRequests } =
    useMatchRequests();
  const { data: mutualMatches = [], refetch: refetchMatches } =
    useMutualMatches();

  // Poll every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchRequests();
      refetchMatches();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetchRequests, refetchMatches]);

  // Build notifications
  const notifications: Notification[] = [
    ...matchRequests
      .filter(([, status]) => status === "pending")
      .map(([profile]) => ({
        id: `req_${profile.userId.toString()}`,
        type: "match_request" as const,
        profile,
        text: `${profile.name} wants to connect 💕`,
        timestamp:
          notifTimestamps[`req_${profile.userId.toString()}`] ?? Date.now(),
      })),
    ...mutualMatches.map((profile) => ({
      id: `match_${profile.userId.toString()}`,
      type: "mutual_match" as const,
      profile,
      text: `You matched with ${profile.name}! 🎉`,
      timestamp:
        notifTimestamps[`match_${profile.userId.toString()}`] ?? Date.now(),
    })),
  ];

  // Track when new notifications appear
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - only re-run on matchRequests/mutualMatches changes
  useEffect(() => {
    setNotifTimestamps((prev) => {
      const updated = { ...prev };
      let changed = false;
      for (const n of notifications) {
        if (!updated[n.id]) {
          updated[n.id] = Date.now();
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
  }, [matchRequests, mutualMatches]);

  const unreadCount = notifications.filter((n) => !seenIds.has(n.id)).length;

  const handleOpen = () => {
    setOpen((prev) => !prev);
    // Mark all as seen when opening
    const newSeen = new Set([...seenIds, ...notifications.map((n) => n.id)]);
    setSeenIds(newSeen);
    saveSeenIds(newSeen);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleOpen}
        data-ocid="notifications.button"
        className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
        style={{
          background: open ? "oklch(0.2 0.06 300)" : "oklch(0.15 0.05 300)",
          border: "1px solid oklch(0.28 0.07 300)",
        }}
      >
        <Bell
          className="w-4.5 h-4.5 text-white/80"
          style={{ width: 18, height: 18 }}
        />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1"
            style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
            data-ocid="notifications.toast"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 w-80 rounded-2xl overflow-hidden z-50 shadow-2xl"
          style={{
            background: "oklch(0.12 0.05 300)",
            border: "1px solid oklch(0.22 0.07 300)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          }}
          data-ocid="notifications.panel"
        >
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: "oklch(0.2 0.06 300)" }}
          >
            <p className="text-white font-semibold text-sm">Notifications</p>
          </div>

          {notifications.length === 0 ? (
            <div
              className="py-10 text-center"
              data-ocid="notifications.empty_state"
            >
              <p className="text-3xl mb-2">🔔</p>
              <p className="text-white/40 text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n, idx) => (
                <div
                  key={n.id}
                  data-ocid={`notifications.item.${idx + 1}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors"
                  style={{
                    background: seenIds.has(n.id)
                      ? "transparent"
                      : "oklch(0.16 0.07 300 / 0.5)",
                    borderBottom: "1px solid oklch(0.18 0.05 300)",
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                    style={{
                      background: n.profile.photoUrl
                        ? undefined
                        : `linear-gradient(135deg,hsl(${(n.profile.name.charCodeAt(0) * 10) % 360},70%,40%),hsl(${(n.profile.name.charCodeAt(0) * 10 + 120) % 360},70%,30%))`,
                    }}
                  >
                    {n.profile.photoUrl ? (
                      <img
                        src={n.profile.photoUrl}
                        alt={n.profile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getInitials(n.profile.name)
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 text-sm leading-snug">
                      {n.text}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {timeAgo(notifTimestamps[n.id] ?? Date.now())}
                    </p>
                  </div>

                  {/* Dot for unread */}
                  {!seenIds.has(n.id) && (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: "oklch(0.65 0.22 10)" }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
