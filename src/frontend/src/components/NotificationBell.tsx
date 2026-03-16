import { Bell, Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  Profile,
  StoryNotification,
  SuperLikeNotification,
} from "../backend";
import {
  useMatchRequests,
  useMutualMatches,
  useStoryNotifications,
  useSuperLikeNotifications,
} from "../hooks/useQueries";
import {
  NOTIF_HISTORY_KEY,
  getNotificationHistory,
  saveNotificationHistory,
} from "../pages/NotificationHistoryPage";
import type { StoredNotification } from "../pages/NotificationHistoryPage";

interface Notification {
  id: string;
  type: "match_request" | "mutual_match";
  profile: Profile;
  text: string;
  timestamp: number;
}

interface StoryNotifItem {
  id: string;
  type: "story_like" | "story_comment" | "story_reply";
  profileName: string;
  profilePhoto?: string;
  text: string;
  timestamp: number;
}

interface SuperLikeItem {
  id: string;
  name: string;
  photo?: string;
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

function appendToHistory(
  notifs: Notification[],
  storyNotifs: StoryNotifItem[],
  seenIds: Set<string>,
) {
  const existing = getNotificationHistory();
  const existingIds = new Set(existing.map((n) => n.id));
  const toAdd: StoredNotification[] = [
    ...notifs
      .filter((n) => !existingIds.has(n.id))
      .map((n) => ({
        id: n.id,
        type: n.type,
        profileName: n.profile.name,
        profilePhoto: n.profile.photoUrl ?? undefined,
        text: n.text,
        timestamp: n.timestamp,
        read: seenIds.has(n.id),
      })),
    ...storyNotifs
      .filter((n) => !existingIds.has(n.id))
      .map((n) => ({
        id: n.id,
        type: n.type,
        profileName: n.profileName,
        profilePhoto: n.profilePhoto,
        text: n.text,
        timestamp: n.timestamp,
        read: seenIds.has(n.id),
      })),
  ];
  if (toAdd.length > 0) {
    saveNotificationHistory([...toAdd, ...existing]);
  }
}

function storyNotifType(
  n: StoryNotification,
): "story_like" | "story_comment" | "story_reply" {
  if (n.notifType === "like") return "story_like";
  if (n.notifType === "reply") return "story_reply";
  return "story_comment";
}

interface NotificationBellProps {
  useHeartIcon?: boolean;
  onViewAll?: () => void;
}

export default function NotificationBell({
  onViewAll,
  useHeartIcon,
}: NotificationBellProps) {
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
  const { data: storyNotificationsRaw = [], refetch: refetchStoryNotifs } =
    useStoryNotifications();
  const { data: superLikeNotifsRaw = [], refetch: refetchSuperLikes } =
    useSuperLikeNotifications();

  // Poll every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchRequests();
      refetchMatches();
      refetchStoryNotifs();
      refetchSuperLikes();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetchRequests, refetchMatches, refetchStoryNotifs, refetchSuperLikes]);

  // Build match/mutual notifications
  const notifications: Notification[] = [
    ...matchRequests
      .filter(([, status]) => status === "pending")
      .map(([profile]) => ({
        id: `req_${profile.userId.toString()}`,
        type: "match_request" as const,
        profile,
        text: `${profile.name} wants to connect \uD83D\uDC95`,
        timestamp:
          notifTimestamps[`req_${profile.userId.toString()}`] ?? Date.now(),
      })),
    ...mutualMatches.map((profile) => ({
      id: `match_${profile.userId.toString()}`,
      type: "mutual_match" as const,
      profile,
      text: `You matched with ${profile.name}! \uD83C\uDF89`,
      timestamp:
        notifTimestamps[`match_${profile.userId.toString()}`] ?? Date.now(),
    })),
  ];

  // Build story notification items
  const storyNotifItems: StoryNotifItem[] = storyNotificationsRaw.map((n) => ({
    id: `story_${n.id.toString()}`,
    type: storyNotifType(n),
    profileName: n.actorName,
    profilePhoto: Array.isArray(n.actorPhoto)
      ? (n.actorPhoto[0] ?? undefined)
      : (n.actorPhoto ?? undefined),
    text: n.text,
    timestamp: Number(n.timestamp / 1_000_000n),
  }));

  // Build super like items
  const superLikeItems: SuperLikeItem[] = (
    superLikeNotifsRaw as SuperLikeNotification[]
  ).map((n) => ({
    id: `superlike_${n.fromProfile.userId.toString()}`,
    name: n.fromProfile.name,
    photo: n.fromProfile.photoUrl ?? undefined,
    text: `\u2B50 ${n.fromProfile.name} Super Liked you!`,
    timestamp: Number(n.timestamp / 1_000_000n),
  }));

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

  // Persist new notifications to history
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (notifications.length > 0 || storyNotifItems.length > 0) {
      appendToHistory(notifications, storyNotifItems, seenIds);
    }
  }, [matchRequests, mutualMatches, storyNotificationsRaw]);

  const matchUnread = notifications.filter((n) => !seenIds.has(n.id)).length;
  const storyUnread = storyNotifItems.filter((n) => !seenIds.has(n.id)).length;
  const superLikeUnread = superLikeItems.filter(
    (n) => !seenIds.has(n.id),
  ).length;
  const unreadCount = matchUnread + storyUnread + superLikeUnread;

  const handleOpen = () => {
    setOpen((prev) => !prev);
    // Mark all as seen when opening
    const allIds = [
      ...notifications.map((n) => n.id),
      ...storyNotifItems.map((n) => n.id),
      ...superLikeItems.map((n) => n.id),
    ];
    const newSeen = new Set([...seenIds, ...allIds]);
    setSeenIds(newSeen);
    saveSeenIds(newSeen);
    // Also mark as read in history
    try {
      const hist = getNotificationHistory();
      const updated = hist.map((h) =>
        allIds.includes(h.id) ? { ...h, read: true } : h,
      );
      localStorage.setItem(NOTIF_HISTORY_KEY, JSON.stringify(updated));
    } catch {}
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

  // Combined list for dropdown (sorted by timestamp descending, max 5)
  type DropdownItem = {
    id: string;
    name: string;
    photo?: string;
    text: string;
    timestamp: number;
    emoji: string;
    isSuperLike?: boolean;
  };

  const allDropdownItems: DropdownItem[] = [
    ...notifications.map((n) => ({
      id: n.id,
      name: n.profile.name,
      photo: n.profile.photoUrl ?? undefined,
      text: n.text,
      timestamp: notifTimestamps[n.id] ?? Date.now(),
      emoji: n.type === "match_request" ? "\uD83D\uDC95" : "\uD83C\uDF89",
      isSuperLike: false,
    })),
    ...storyNotifItems.map((n) => ({
      id: n.id,
      name: n.profileName,
      photo: n.profilePhoto,
      text: n.text,
      timestamp: n.timestamp,
      emoji: n.type === "story_like" ? "\u2764\uFE0F" : "\uD83D\uDCAC",
      isSuperLike: false,
    })),
    ...superLikeItems.map((n) => ({
      id: n.id,
      name: n.name,
      photo: n.photo,
      text: n.text,
      timestamp: n.timestamp,
      emoji: "\u2B50",
      isSuperLike: true,
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

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
        {useHeartIcon ? (
          <Heart
            className="w-4.5 h-4.5 text-white/80"
            style={{
              width: 18,
              height: 18,
              fill: unreadCount > 0 ? "rgba(255,255,255,0.8)" : "none",
            }}
          />
        ) : (
          <Bell
            className="w-4.5 h-4.5 text-white/80"
            style={{ width: 18, height: 18 }}
          />
        )}
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

          {allDropdownItems.length === 0 ? (
            <div
              className="py-10 text-center"
              data-ocid="notifications.empty_state"
            >
              <p className="text-3xl mb-2">\uD83D\uDD14</p>
              <p className="text-white/40 text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {allDropdownItems.map((n, idx) => (
                <div
                  key={n.id}
                  data-ocid={`notifications.item.${idx + 1}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors"
                  style={{
                    background: n.isSuperLike
                      ? seenIds.has(n.id)
                        ? "rgba(245,158,11,0.05)"
                        : "rgba(245,158,11,0.15)"
                      : seenIds.has(n.id)
                        ? "transparent"
                        : "oklch(0.16 0.07 300 / 0.5)",
                    borderBottom: "1px solid oklch(0.18 0.05 300)",
                    borderLeft: n.isSuperLike
                      ? "3px solid #f59e0b"
                      : "3px solid transparent",
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                    style={{
                      background: n.photo
                        ? undefined
                        : `linear-gradient(135deg,hsl(${(n.name.charCodeAt(0) * 10) % 360},70%,40%),hsl(${(n.name.charCodeAt(0) * 10 + 120) % 360},70%,30%))`,
                    }}
                  >
                    {n.photo ? (
                      <img
                        src={n.photo}
                        alt={n.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getInitials(n.name)
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm leading-snug"
                      style={{
                        color: n.isSuperLike
                          ? "#fbbf24"
                          : "rgba(255,255,255,0.9)",
                      }}
                    >
                      {n.text}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {timeAgo(n.timestamp)}
                    </p>
                  </div>

                  {/* Emoji + unread dot */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-base">{n.emoji}</span>
                    {!seenIds.has(n.id) && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: n.isSuperLike
                            ? "#f59e0b"
                            : "oklch(0.65 0.22 10)",
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* See all button */}
          {onViewAll && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onViewAll();
              }}
              data-ocid="notifications.view_all_button"
              className="w-full py-3 text-sm font-medium transition-colors"
              style={{
                borderTop: "1px solid oklch(0.2 0.06 300)",
                color: "oklch(0.72 0.18 10)",
                background: "oklch(0.10 0.04 300)",
              }}
            >
              See all notifications →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
