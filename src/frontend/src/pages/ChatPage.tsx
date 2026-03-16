import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  BellOff,
  ChevronRight,
  Edit,
  Inbox,
  Plus,
  Search,
  Settings,
  Star,
} from "lucide-react";
import React from "react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { Profile } from "../backend";
import StoryViewerModal from "../components/StoryViewerModal";
import { useAddStory, useMutualMatches, useStories } from "../hooks/useQueries";
import { useStarredMessages } from "../hooks/useStarredMessages";
import { useStorageUpload } from "../hooks/useStorageUpload";

const STORY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface Props {
  onOpenConversation: (p: Profile) => void;
  onMessageRequests?: () => void;
  onStarredMessages?: () => void;
}

interface ChatSettings {
  whoCanMessage: "everyone" | "matches" | "nobody";
  whoCanAddToGroup: "everyone" | "matches" | "nobody";
  readReceipts: boolean;
  showOnlineStatus: boolean;
  messageRequests: boolean;
}

const DEFAULT_SETTINGS: ChatSettings = {
  whoCanMessage: "everyone",
  whoCanAddToGroup: "matches",
  readReceipts: true,
  showOnlineStatus: true,
  messageRequests: true,
};

function loadSettings(): ChatSettings {
  try {
    const raw = localStorage.getItem("chat_settings");
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(s: ChatSettings) {
  localStorage.setItem("chat_settings", JSON.stringify(s));
}

function loadBlockedUsers(): string[] {
  try {
    const raw = localStorage.getItem("blockedUsers");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveBlockedUsers(users: string[]) {
  localStorage.setItem("blockedUsers", JSON.stringify(users));
}

function loadIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function loadMutedConversations(): Set<string> {
  try {
    const raw = localStorage.getItem("muted_conversations");
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveMutedConversations(s: Set<string>) {
  localStorage.setItem("muted_conversations", JSON.stringify([...s]));
}

const ALL_MSG_REQUESTS_COUNT = 4;

function getMsgRequestsCount(): number {
  const deleted = loadIds("msgRequestsDeleted");
  const accepted = loadIds("msgRequestsAccepted");
  return Math.max(0, ALL_MSG_REQUESTS_COUNT - deleted.length - accepted.length);
}

// Online indicator: show green dot for every 3rd profile (index % 3 === 0)
const OnlineDot = memo(function OnlineDot({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400"
      style={{ border: "2px solid #0a0010" }}
    />
  );
});

const FAKE_TIMES = [
  "2m",
  "15m",
  "1h",
  "3h",
  "now",
  "5m",
  "30m",
  "2h",
  "4h",
  "6m",
];

type MessageOption = "everyone" | "matches" | "nobody";

function OptionButton({
  label,
  active,
  onClick,
  ocid,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  ocid: string;
}) {
  return (
    <button
      type="button"
      data-ocid={ocid}
      onClick={onClick}
      className="flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all"
      style={{
        background: active
          ? "linear-gradient(135deg,#e11d48,#7c3aed)"
          : "oklch(0.18 0.06 300)",
        color: active ? "#fff" : "rgba(255,255,255,0.55)",
        border: active ? "none" : "1px solid oklch(0.25 0.06 300)",
      }}
    >
      {label}
    </button>
  );
}

/** Skeleton rows shown while chat list loads */
function ChatListSkeleton() {
  return (
    <div className="space-y-0" data-ocid="chat.loading_state">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton
            className="w-14 h-14 rounded-full flex-shrink-0"
            style={{ background: "oklch(0.18 0.05 300)" }}
          />
          <div className="flex-1 space-y-2">
            <Skeleton
              className="h-3.5 rounded-full"
              style={{
                background: "oklch(0.18 0.05 300)",
                width: `${55 + (i % 3) * 15}%`,
              }}
            />
            <Skeleton
              className="h-2.5 rounded-full"
              style={{
                background: "oklch(0.15 0.04 300)",
                width: `${35 + (i % 4) * 10}%`,
              }}
            />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton
              className="h-2.5 w-8 rounded-full"
              style={{ background: "oklch(0.15 0.04 300)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton circles for stories/active contacts row */
function StoriesSkeletonRow() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none px-4 mb-5">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
          <Skeleton
            className="w-14 h-14 rounded-full"
            style={{ background: "oklch(0.18 0.05 300)" }}
          />
          <Skeleton
            className="h-2 w-10 rounded-full"
            style={{ background: "oklch(0.15 0.04 300)" }}
          />
        </div>
      ))}
    </div>
  );
}

/** Memoized chat row item */
const ChatRowItem = memo(function ChatRowItem({
  profile,
  index,
  onOpen,
  unreadCount = 0,
  isMuted = false,
  onLongPress,
}: {
  profile: Profile;
  index: number;
  onOpen: (p: Profile) => void;
  unreadCount?: number;
  isMuted?: boolean;
  onLongPress?: (profile: Profile) => void;
}) {
  const lpTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const startLp = (e: React.TouchEvent) => {
    e.preventDefault();
    lpTimer.current = setTimeout(() => onLongPress?.(profile), 500);
  };
  const cancelLp = () => {
    if (lpTimer.current) clearTimeout(lpTimer.current);
  };
  const fakeTime = FAKE_TIMES[index % FAKE_TIMES.length];
  const isOnline = index % 3 === 0;
  return (
    <button
      key={profile.userId.toString()}
      type="button"
      onClick={() => onOpen(profile)}
      onTouchStart={startLp}
      onTouchEnd={cancelLp}
      onTouchMove={cancelLp}
      data-ocid={`chat.item.${index + 1}`}
      className="w-full flex items-center gap-3 px-4 py-3 transition-all active:bg-white/5"
    >
      <div className="relative flex-shrink-0">
        <div
          className="w-14 h-14 rounded-full overflow-hidden"
          style={{
            background: "linear-gradient(135deg,#e11d48,#7c3aed)",
            padding: 2,
          }}
        >
          <div
            className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
            style={{ background: "#1a0a1e" }}
          >
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-xl">
                {profile.name.charAt(0)}
              </span>
            )}
          </div>
        </div>
        <OnlineDot show={isOnline} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-white font-semibold text-sm flex items-center gap-1.5">
          {profile.name}
          {isMuted && (
            <BellOff className="w-3 h-3 text-white/40 flex-shrink-0" />
          )}
        </p>
        <p className="text-white/40 text-xs truncate">
          {profile.bio || "Tap to start chatting"}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <p className="text-white/30 text-[10px]">{fakeTime}</p>
        {unreadCount > 0 && (
          <span
            className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1"
            style={{ background: "oklch(0.55 0.22 10)" }}
            data-ocid={`chat.item.${index + 1}`}
          >
            {unreadCount >= 100 ? "99+" : unreadCount}
          </span>
        )}
      </div>
    </button>
  );
});

export default function ChatPage({
  onOpenConversation,
  onMessageRequests,
  onStarredMessages,
}: Props) {
  const { data: matches = [], isLoading } = useMutualMatches();
  const { data: allStories = [], isLoading: storiesLoading } = useStories();
  const addStory = useAddStory();
  const { uploadFile, uploading, progress } = useStorageUpload();
  const [viewingStoryIndex, setViewingStoryIndex] = useState<number | null>(
    null,
  );
  const [chatSearch, setChatSearch] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>(loadSettings);
  const [blockedUsers, setBlockedUsers] = useState<string[]>(loadBlockedUsers);
  const [msgRequestsCount, setMsgRequestsCount] = useState(getMsgRequestsCount);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [mutedConversations, setMutedConversations] = useState<Set<string>>(
    loadMutedConversations,
  );
  const [muteSheetOpen, setMuteSheetOpen] = useState(false);
  const [muteTargetProfile, setMuteTargetProfile] = useState<Profile | null>(
    null,
  );
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(
    () => {
      try {
        const raw = localStorage.getItem("chat_unread_counts");
        if (raw) return JSON.parse(raw);
      } catch {}
      return {};
    },
  );
  const { starred } = useStarredMessages();
  const starredCount = starred.length;
  const storyFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Persist unread counts
  useEffect(() => {
    try {
      localStorage.setItem("chat_unread_counts", JSON.stringify(unreadCounts));
    } catch {}
  }, [unreadCounts]);

  // Seed initial demo unread counts when matches first load
  useEffect(() => {
    if (matches.length === 0) return;
    setUnreadCounts((prev) => {
      const existing = Object.keys(prev).length > 0;
      if (existing) return prev;
      const seed: Record<string, number> = {};
      matches.forEach((m, i) => {
        if (i % 4 === 0)
          seed[m.userId.toString()] = Math.floor(Math.random() * 5) + 1;
        else if (i % 7 === 0)
          seed[m.userId.toString()] = Math.floor(Math.random() * 12) + 1;
      });
      return seed;
    });
  }, [matches]);

  // Refresh count when settings panel closes
  useEffect(() => {
    if (!settingsOpen) {
      setMsgRequestsCount(getMsgRequestsCount());
    }
  }, [settingsOpen]);

  const updateSetting = <K extends keyof ChatSettings>(
    key: K,
    value: ChatSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleMuteToggle = (profile: Profile) => {
    const uid = profile.userId.toString();
    setMutedConversations((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      saveMutedConversations(next);
      return next;
    });
    setMuteSheetOpen(false);
  };

  const openMuteSheet = (profile: Profile) => {
    setMuteTargetProfile(profile);
    setMuteSheetOpen(true);
  };

  const unblockUser = (entry: string) => {
    const updated = blockedUsers.filter((u) => u !== entry);
    setBlockedUsers(updated);
    saveBlockedUsers(updated);
  };

  const stories = useMemo(
    () =>
      allStories.filter(
        (s) => Date.now() - Number(s.timestamp) / 1_000_000 <= STORY_MAX_AGE_MS,
      ),
    [allStories],
  );

  const handleAddStory = () => {
    storyFileRef.current?.click();
  };

  const handleStoryFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file);
      const caption = window.prompt("Add a caption (optional):") ?? "";
      await addStory.mutateAsync({ imageUrl: url, caption });
    } catch {}
    e.target.value = "";
  };

  const filteredMatches = useMemo(
    () =>
      chatSearch.trim()
        ? matches.filter((p) =>
            p.name.toLowerCase().includes(chatSearch.toLowerCase()),
          )
        : matches,
    [matches, chatSearch],
  );

  return (
    <div className="min-h-screen pb-4" style={{ background: "#0a0010" }}>
      <input
        ref={storyFileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleStoryFileChange}
        data-ocid="chat.dropzone"
      />

      {/* Messenger-style Header */}
      <div
        className="flex items-center justify-between px-4 pt-12 pb-3"
        style={{ background: "#0a0010" }}
      >
        <button
          type="button"
          data-ocid="chat.settings_button"
          onClick={() => setSettingsOpen(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "oklch(0.15 0.05 300)" }}
        >
          <Settings className="w-5 h-5 text-white/70" />
        </button>
        <h1 className="text-xl font-bold text-white tracking-tight">Chats</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-ocid="chat.inbox_button"
            onClick={() => onMessageRequests?.()}
            className="w-9 h-9 rounded-full flex items-center justify-center relative"
            style={{ background: "oklch(0.15 0.05 300)" }}
          >
            <Inbox className="w-4 h-4 text-white/70" />
            {msgRequestsCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: "oklch(0.55 0.22 10)" }}
              >
                {msgRequestsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            data-ocid="chat.starred_button"
            onClick={() => onStarredMessages?.()}
            className="w-9 h-9 rounded-full flex items-center justify-center relative"
            style={{ background: "oklch(0.15 0.05 300)" }}
            title="Starred Messages"
          >
            <Star
              className="w-4 h-4"
              style={{
                color: starredCount > 0 ? "#f59e0b" : "rgba(255,255,255,0.5)",
              }}
              fill={starredCount > 0 ? "#f59e0b" : "none"}
            />
            {starredCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: "oklch(0.7 0.18 60)" }}
              >
                {starredCount > 9 ? "9+" : starredCount}
              </span>
            )}
          </button>
          <button
            type="button"
            data-ocid="chat.new_chat_button"
            onClick={() => {
              setNewChatOpen(true);
              setNewChatSearch("");
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "oklch(0.15 0.05 300)" }}
          >
            <Edit className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </div>

      {/* New Chat Sheet */}
      <Sheet open={newChatOpen} onOpenChange={setNewChatOpen}>
        <SheetContent
          side="bottom"
          data-ocid="chat.new_chat.sheet"
          className="rounded-t-3xl border-0 px-0 pb-8"
          style={{ background: "#12001e", maxHeight: "80vh" }}
        >
          <SheetHeader className="px-5 pb-3">
            <SheetTitle className="text-white text-lg font-bold">
              New Chat
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 mb-3">
            <div
              className="flex items-center gap-2 h-10 rounded-full px-4"
              style={{ background: "oklch(0.16 0.05 300)" }}
            >
              <Search className="w-4 h-4 text-white/40 flex-shrink-0" />
              <Input
                type="text"
                placeholder="Search matches..."
                value={newChatSearch}
                onChange={(e) => setNewChatSearch(e.target.value)}
                data-ocid="chat.new_chat.search_input"
                className="flex-1 h-8 text-sm text-white placeholder:text-white/35 bg-transparent border-none shadow-none focus-visible:ring-0 p-0"
              />
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "55vh" }}>
            {matches
              .filter((m) =>
                newChatSearch.trim()
                  ? m.name.toLowerCase().includes(newChatSearch.toLowerCase())
                  : true,
              )
              .map((m, i) => (
                <button
                  key={m.userId.toString()}
                  type="button"
                  data-ocid={`chat.new_chat.item.${i + 1}`}
                  onClick={() => {
                    setNewChatOpen(false);
                    onOpenConversation(m);
                  }}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base overflow-hidden"
                      style={{
                        background: m.photoUrl
                          ? undefined
                          : "linear-gradient(135deg,#e11d48,#7c3aed)",
                      }}
                    >
                      {m.photoUrl ? (
                        <img
                          src={m.photoUrl}
                          alt={m.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        m.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <OnlineDot show={i % 3 === 0} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">
                      {m.name}
                    </p>
                    <p className="text-white/45 text-xs truncate">
                      {m.occupation || m.bio || "Say hello 👋"}
                    </p>
                  </div>
                </button>
              ))}
            {matches.filter((m) =>
              newChatSearch.trim()
                ? m.name.toLowerCase().includes(newChatSearch.toLowerCase())
                : true,
            ).length === 0 && (
              <div className="text-center py-10 text-white/40 text-sm">
                No matches found
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Pill search bar */}
      <div className="px-4 mb-4">
        <div
          className="flex items-center gap-2 h-10 rounded-full px-4"
          style={{ background: "oklch(0.16 0.05 300)" }}
        >
          <Search className="w-4 h-4 text-white/40 flex-shrink-0" />
          <Input
            type="text"
            placeholder="Search or start new chat"
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            data-ocid="chat.search_input"
            className="flex-1 h-8 text-sm text-white placeholder:text-white/35 bg-transparent border-none shadow-none focus-visible:ring-0 p-0"
          />
          {chatSearch && (
            <button
              type="button"
              onClick={() => setChatSearch("")}
              className="text-white/40 hover:text-white/70"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Message Requests row */}
      {settings.messageRequests && (
        <button
          type="button"
          data-ocid="chat.inbox_button"
          onClick={() => onMessageRequests?.()}
          className="w-full flex items-center gap-3 px-4 py-3 mb-2"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg,oklch(0.55 0.22 10),oklch(0.45 0.22 280))",
            }}
          >
            <Inbox className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-white font-bold text-sm">Message Requests</p>
            <p className="text-white/45 text-xs">
              {msgRequestsCount > 0
                ? `${msgRequestsCount} pending`
                : "No pending requests"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {msgRequestsCount > 0 && (
              <span
                className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                style={{ background: "#e11d48" }}
              >
                {msgRequestsCount}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-white/40" />
          </div>
        </button>
      )}

      {/* Active contacts row — skeleton while loading */}
      {storiesLoading || isLoading ? (
        <StoriesSkeletonRow />
      ) : (
        <div className="px-4 mb-5">
          <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none">
            {/* Add story button */}
            <button
              type="button"
              onClick={handleAddStory}
              data-ocid="chat.upload_button"
              className="flex flex-col items-center gap-1 flex-shrink-0"
              disabled={uploading}
            >
              <div
                className="relative w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: "oklch(0.18 0.06 300)",
                  border: "2px dashed oklch(0.35 0.1 300)",
                }}
              >
                {uploading ? (
                  <span className="text-white/70 text-[10px] font-bold">
                    {progress}%
                  </span>
                ) : (
                  <Plus className="w-5 h-5 text-white/60" />
                )}
              </div>
              <span className="text-white/50 text-[10px]">
                {uploading ? "..." : "Story"}
              </span>
            </button>

            {/* Active story contacts */}
            {matches.slice(0, 10).map((profile, i) => {
              const hasStory = stories.some(
                (s) => s.authorName === profile.name,
              );
              const storyIdx = hasStory
                ? stories.findIndex((s) => s.authorName === profile.name)
                : -1;
              return (
                <button
                  key={profile.userId.toString()}
                  type="button"
                  data-ocid={`chat.item.${i + 1}`}
                  className="flex flex-col items-center gap-1 flex-shrink-0"
                  onClick={() =>
                    hasStory && storyIdx >= 0
                      ? setViewingStoryIndex(storyIdx)
                      : onOpenConversation(profile)
                  }
                >
                  <div className="relative" style={{ width: 56, height: 56 }}>
                    {hasStory && (
                      <svg
                        width={56}
                        height={56}
                        viewBox="0 0 56 56"
                        style={{ position: "absolute", top: 0, left: 0 }}
                        aria-hidden="true"
                      >
                        <defs>
                          <linearGradient
                            id={`cg${i}`}
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor="#e11d48" />
                            <stop offset="100%" stopColor="#a855f7" />
                          </linearGradient>
                        </defs>
                        <circle
                          cx={28}
                          cy={28}
                          r={25}
                          fill="none"
                          stroke={`url(#cg${i})`}
                          strokeWidth={2.5}
                        />
                      </svg>
                    )}
                    <div
                      className="absolute rounded-full overflow-hidden"
                      style={{
                        inset: hasStory ? 4 : 2,
                        background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                      }}
                    >
                      {profile.photoUrl ? (
                        <img
                          src={profile.photoUrl}
                          alt={profile.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold">
                          {profile.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    {/* Online dot */}
                    {i % 3 === 0 && (
                      <span
                        className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400"
                        style={{ border: "2px solid #0a0010" }}
                      />
                    )}
                  </div>
                  <span className="text-white/60 text-[10px] w-14 text-center truncate">
                    {profile.name.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      <div
        className="mx-4 mb-3"
        style={{ height: 1, background: "oklch(0.2 0.05 300)" }}
      />

      {/* Chat list — skeleton while loading */}
      {isLoading && <ChatListSkeleton />}

      {!isLoading && matches.length === 0 && (
        <div className="text-center py-16" data-ocid="chat.empty_state">
          <p className="text-5xl mb-4">💬</p>
          <p className="text-white/60">No conversations yet</p>
          <p className="text-white/40 text-sm mt-1">
            Match with someone to start chatting!
          </p>
        </div>
      )}
      {!isLoading && matches.length > 0 && filteredMatches.length === 0 && (
        <div className="text-center py-8" data-ocid="chat.empty_state">
          <p className="text-white/40 text-sm">
            No matches found for "{chatSearch}"
          </p>
        </div>
      )}

      <div className="space-y-0">
        {filteredMatches.map((profile, i) => {
          const uid = profile.userId.toString();
          return (
            <ChatRowItem
              key={uid}
              profile={profile}
              index={i}
              unreadCount={unreadCounts[uid] ?? 0}
              isMuted={mutedConversations.has(uid)}
              onLongPress={openMuteSheet}
              onOpen={(p) => {
                // Reset unread count when opening conversation
                setUnreadCounts((prev) => {
                  const next = { ...prev };
                  delete next[uid];
                  try {
                    localStorage.setItem(
                      "chat_unread_counts",
                      JSON.stringify(next),
                    );
                  } catch {}
                  return next;
                });
                onOpenConversation(p);
              }}
            />
          );
        })}
      </div>

      {/* Story Viewer */}
      {viewingStoryIndex !== null && (
        <StoryViewerModal
          stories={stories}
          initialIndex={viewingStoryIndex}
          onClose={() => setViewingStoryIndex(null)}
        />
      )}

      {/* Mute Conversation Sheet */}
      <Sheet open={muteSheetOpen} onOpenChange={setMuteSheetOpen}>
        <SheetContent
          side="bottom"
          data-ocid="chat.mute.sheet"
          className="rounded-t-3xl border-0 px-0 pb-10"
          style={{ background: "#12001e" }}
        >
          <SheetHeader className="px-5 pb-2 pt-1">
            <SheetTitle className="text-white text-base font-bold">
              {muteTargetProfile?.name}
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 space-y-2 mt-2">
            {muteTargetProfile &&
            mutedConversations.has(muteTargetProfile.userId.toString()) ? (
              <button
                type="button"
                data-ocid="chat.unmute_button"
                onClick={() =>
                  muteTargetProfile && handleMuteToggle(muteTargetProfile)
                }
                className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all active:scale-[0.98]"
                style={{ background: "oklch(0.16 0.05 300)" }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                  }}
                >
                  <BellOff className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-semibold text-sm">
                    Unmute Conversation
                  </p>
                  <p className="text-white/45 text-xs">Resume notifications</p>
                </div>
              </button>
            ) : (
              <button
                type="button"
                data-ocid="chat.mute_button"
                onClick={() =>
                  muteTargetProfile && handleMuteToggle(muteTargetProfile)
                }
                className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all active:scale-[0.98]"
                style={{ background: "oklch(0.16 0.05 300)" }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "oklch(0.2 0.06 300)" }}
                >
                  <BellOff className="w-5 h-5 text-white/70" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-semibold text-sm">
                    Mute Conversation
                  </p>
                  <p className="text-white/45 text-xs">
                    Stop notifications for this chat
                  </p>
                </div>
              </button>
            )}
            <button
              type="button"
              data-ocid="chat.cancel_button"
              onClick={() => setMuteSheetOpen(false)}
              className="w-full py-4 rounded-2xl text-white/70 text-sm font-medium transition-all active:scale-[0.98]"
              style={{ background: "oklch(0.14 0.04 300)" }}
            >
              Cancel
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Chat Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent
          side="bottom"
          data-ocid="chat.settings.sheet"
          className="rounded-t-3xl border-0 max-h-[90vh] overflow-y-auto"
          style={{ background: "#0a0010", color: "#fff" }}
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-white text-lg font-bold">
              Chat Settings
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6 pb-8">
            {/* Who Can Send Me Messages */}
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
                Who Can Send Me Messages
              </p>
              <div className="flex gap-2">
                {(["everyone", "matches", "nobody"] as MessageOption[]).map(
                  (opt) => (
                    <OptionButton
                      key={opt}
                      label={
                        opt === "everyone"
                          ? "Everyone"
                          : opt === "matches"
                            ? "Matches Only"
                            : "Nobody"
                      }
                      active={settings.whoCanMessage === opt}
                      onClick={() => updateSetting("whoCanMessage", opt)}
                      ocid="chat.settings.who_can_message.select"
                    />
                  ),
                )}
              </div>
            </div>

            {/* Who Can Add Me to Group */}
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
                Who Can Add Me to Group Chat
              </p>
              <div className="flex gap-2">
                {(["everyone", "matches", "nobody"] as MessageOption[]).map(
                  (opt) => (
                    <OptionButton
                      key={opt}
                      label={
                        opt === "everyone"
                          ? "Everyone"
                          : opt === "matches"
                            ? "Matches Only"
                            : "Nobody"
                      }
                      active={settings.whoCanAddToGroup === opt}
                      onClick={() => updateSetting("whoCanAddToGroup", opt)}
                      ocid="chat.settings.who_can_group.select"
                    />
                  ),
                )}
              </div>
            </div>

            {/* Read Receipts */}
            <div
              className="flex items-center justify-between py-3 px-4 rounded-2xl"
              style={{ background: "oklch(0.15 0.05 300)" }}
            >
              <div>
                <p className="text-white text-sm font-medium">Read Receipts</p>
                <p className="text-white/40 text-xs mt-0.5">
                  {settings.readReceipts
                    ? "Others can see when you've read messages"
                    : "Others can't see when you've read messages"}
                </p>
              </div>
              <Switch
                checked={settings.readReceipts}
                onCheckedChange={(v) => updateSetting("readReceipts", v)}
                data-ocid="chat.settings.read_receipts.switch"
              />
            </div>

            {/* Online Status */}
            <div
              className="flex items-center justify-between py-3 px-4 rounded-2xl"
              style={{ background: "oklch(0.15 0.05 300)" }}
            >
              <div>
                <p className="text-white text-sm font-medium">Online Status</p>
                <p className="text-white/40 text-xs mt-0.5">
                  {settings.showOnlineStatus
                    ? "Others can see you're online"
                    : "You appear offline to others"}
                </p>
              </div>
              <Switch
                checked={settings.showOnlineStatus}
                onCheckedChange={(v) => updateSetting("showOnlineStatus", v)}
                data-ocid="chat.settings.online_status.switch"
              />
            </div>

            {/* Message Requests */}
            <div
              className="flex items-center justify-between py-3 px-4 rounded-2xl"
              style={{ background: "oklch(0.15 0.05 300)" }}
            >
              <div>
                <p className="text-white text-sm font-medium">
                  Message Requests
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  {settings.messageRequests
                    ? "Non-match messages go to Requests folder"
                    : "Non-match messages are blocked"}
                </p>
              </div>
              <Switch
                checked={settings.messageRequests}
                onCheckedChange={(v) => updateSetting("messageRequests", v)}
                data-ocid="chat.settings.message_requests.switch"
              />
            </div>

            {/* Blocked Users */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                  Blocked Users
                </p>
                {blockedUsers.length > 0 && (
                  <span
                    className="text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "#e11d48" }}
                  >
                    {blockedUsers.length}
                  </span>
                )}
              </div>
              {blockedUsers.length === 0 ? (
                <div
                  className="py-4 px-4 rounded-2xl text-center"
                  style={{ background: "oklch(0.15 0.05 300)" }}
                >
                  <p className="text-white/40 text-sm">No blocked users</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {blockedUsers.map((entry, idx) => {
                    const name = entry.includes("|")
                      ? entry.split("|")[1]
                      : entry;
                    return (
                      <div
                        key={entry}
                        className="flex items-center justify-between py-3 px-4 rounded-2xl"
                        style={{ background: "oklch(0.15 0.05 300)" }}
                        data-ocid={`chat.item.${idx + 1}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{
                              background:
                                "linear-gradient(135deg,#e11d48,#7c3aed)",
                            }}
                          >
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-white text-sm font-medium">
                            {name}
                          </p>
                        </div>
                        <button
                          type="button"
                          data-ocid={`chat.settings.unblock_button.${idx + 1}`}
                          onClick={() => unblockUser(entry)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full"
                          style={{
                            background:
                              "linear-gradient(135deg,#e11d48,#7c3aed)",
                            color: "#fff",
                          }}
                        >
                          Unblock
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
