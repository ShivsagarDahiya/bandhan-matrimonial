import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Check,
  Edit2,
  Phone,
  Pin,
  Reply,
  Search,
  Send,
  Smile,
  Star,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MessageWithMeta, Profile } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useDeleteMessage,
  useEditMessage,
  useMarkMessageRead,
  useMessages,
  useReactToMessage,
  useSendGiftBackend,
  useSendMessage,
  useSetTyping,
  useTypingStatus,
} from "../hooks/useQueries";
import { useStarredMessages } from "../hooks/useStarredMessages";

type ExtMessage = MessageWithMeta;

interface GiftMessage {
  id: string;
  gift: string;
  giftEmoji: string;
  text: string;
  timestamp: number;
  isMine: true;
}

const GIFTS = [
  { name: "Rose", emoji: "🌹", points: 10 },
  { name: "Diamond", emoji: "💎", points: 50 },
  { name: "Chocolate", emoji: "🍫", points: 20 },
  { name: "Love Letter", emoji: "💌", points: 5 },
];

interface Props {
  profile: Profile;
  onBack: () => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  readReceiptsEnabled?: boolean;
}

interface ContextMenu {
  msgId: string;
  msgIdBigint: bigint;
  msgText: string;
  isMine: boolean;
  x: number;
  y: number;
}

type ReplyTo = { id: string; text: string; senderName: string };

type MsgStatus = "sent" | "delivered" | "seen";

interface MsgStatusEntry {
  status: MsgStatus;
  seenAt?: number;
}

const REACTIONS = ["❤️", "😂", "😮", "👍", "😢"];

function matchedAgoLabel(createdAt: bigint): string {
  const nowMs = Date.now();
  const createdMs = Number(createdAt) / 1_000_000;
  const diffMs = nowMs - createdMs;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Matched today";
  if (diffDays === 1) return "Matched yesterday";
  return `Matched ${diffDays} days ago`;
}

/** Checkmark receipt icon for sender messages */
function MsgReceipt({ entry }: { entry?: MsgStatusEntry }) {
  const status = entry?.status ?? "sent";
  if (status === "seen") {
    const seenLabel = entry?.seenAt
      ? `Seen at ${new Date(entry.seenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : "Seen";
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="flex items-center cursor-pointer"
            data-ocid="conversation.tooltip"
            aria-label={seenLabel}
          >
            <Check className="w-3 h-3" style={{ color: "#3b82f6" }} />
            <Check className="w-3 h-3 -ml-1.5" style={{ color: "#3b82f6" }} />
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="text-xs py-1 px-2"
          style={{
            background: "oklch(0.14 0.06 330)",
            border: "1px solid oklch(0.28 0.07 330)",
            color: "white",
          }}
        >
          {seenLabel}
        </TooltipContent>
      </Tooltip>
    );
  }
  if (status === "delivered") {
    return (
      <span className="flex items-center">
        <Check className="w-3 h-3 text-white/50" />
        <Check className="w-3 h-3 -ml-1.5 text-white/50" />
      </span>
    );
  }
  // sent
  return <Check className="w-3 h-3 text-white/30" />;
}

export default function ConversationPage({
  profile,
  onBack,
  onVoiceCall,
  onVideoCall,
  readReceiptsEnabled,
}: Props) {
  // Read receipt privacy: default from prop, fallback to localStorage chat_settings
  const readReceiptsOn =
    readReceiptsEnabled ??
    (() => {
      try {
        const raw = localStorage.getItem("chat_settings");
        if (raw) return JSON.parse(raw).readReceipts !== false;
      } catch {}
      return true;
    })();
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();
  const { data: rawMessages = [] } = useMessages(profile.userId, true);
  const messages = rawMessages as ExtMessage[];

  // Compute last seen from message timestamps (simple online status)
  const isRecentlyActive = (() => {
    const theirMsgs = messages.filter(
      (m) => m.fromUserId.toString() === profile.userId.toString(),
    );
    if (theirMsgs.length === 0) return false;
    const last = theirMsgs[theirMsgs.length - 1];
    const tsMs = Number(last.timestamp) / 1_000_000;
    return Date.now() - tsMs < 15 * 60 * 1000;
  })();
  const sendMessage = useSendMessage();
  const markRead = useMarkMessageRead();
  const setTypingMutation = useSetTyping();
  const { data: remoteIsTyping } = useTypingStatus(profile.userId);
  const reactToMessage = useReactToMessage();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const sendGiftBackend = useSendGiftBackend();
  const { isStarred, toggleStar } = useStarredMessages();

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markedReadRef = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local typing state — true while I am actively typing (for immediate UI feedback)
  const [selfIsTyping, setSelfIsTyping] = useState(false);
  // Combine remote backend typing status with local immediate state
  const showTypingBubble = remoteIsTyping === true;

  // Delivery receipt map: msgId -> {status, seenAt}
  const [msgStatusMap, setMsgStatusMap] = useState<Map<string, MsgStatusEntry>>(
    new Map(),
  );

  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [localReactions, setLocalReactions] = useState<Map<string, string>>(
    new Map(),
  );
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [pinnedMessage, setPinnedMessage] = useState<{
    id: string;
    text: string;
  } | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [localEdits, setLocalEdits] = useState<Map<string, string>>(new Map());

  // Gift state
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [giftMessages, setGiftMessages] = useState<GiftMessage[]>([]);

  // Message search
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearch, setMsgSearch] = useState("");

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, giftMessages]);

  // Mark incoming messages as read + update delivery status for outgoing msgs
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional stable refs
  useEffect(() => {
    const updates = new Map<string, MsgStatusEntry>();
    for (const msg of messages) {
      const key = msg.id.toString();
      // Mark incoming unread msgs as read
      if (
        msg.toUserId.toString() === myPrincipal &&
        !msg.read &&
        !markedReadRef.current.has(key)
      ) {
        markedReadRef.current.add(key);
        markRead.mutate(msg.id);
      }
      // Update delivery status for my outgoing messages
      if (msg.fromUserId.toString() === myPrincipal) {
        const existing = msgStatusMap.get(key);
        if (msg.read && existing?.status !== "seen") {
          updates.set(key, { status: "seen", seenAt: Date.now() });
        } else if (!msg.read && !existing) {
          updates.set(key, { status: "delivered" });
        }
      }
    }
    if (updates.size > 0) {
      setMsgStatusMap((prev) => {
        const next = new Map(prev);
        for (const [k, v] of updates) next.set(k, v);
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, myPrincipal]);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  const handleTyping = useCallback(
    (val: string) => {
      setInputValue(val);

      // Immediately show typing state locally
      setSelfIsTyping(true);
      setTypingMutation.mutate({ toUserId: profile.userId, isTyping: true });

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setSelfIsTyping(false);
        setTypingMutation.mutate({ toUserId: profile.userId, isTyping: false });
      }, 2000);
    },
    [profile.userId, setTypingMutation],
  );

  const handleSend = async () => {
    const rawText = inputValue.trim();
    if (!rawText) return;

    // Stop typing indicator immediately on send
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setSelfIsTyping(false);
    setTypingMutation.mutate({ toUserId: profile.userId, isTyping: false });

    if (editingMsgId) {
      setLocalEdits((prev) => new Map(prev).set(editingMsgId, rawText));
      const idBigint = messages.find(
        (m) => m.id.toString() === editingMsgId,
      )?.id;
      if (idBigint !== undefined) {
        editMessage.mutate({ messageId: idBigint, newText: rawText });
      }
      setEditingMsgId(null);
      setInputValue("");
      return;
    }

    let text = rawText;
    if (replyTo) {
      const quoted =
        replyTo.text.length > 50
          ? `${replyTo.text.slice(0, 50)}…`
          : replyTo.text;
      text = `↩ ${replyTo.senderName}: ${quoted}\n${rawText}`;
    }

    setInputValue("");
    setReplyTo(null);
    try {
      await sendMessage.mutateAsync({
        toUserId: profile.userId,
        text,
      });
    } catch {}
  };

  const handleSendGift = (gift: {
    name: string;
    emoji: string;
    points: number;
  }) => {
    const giftMsg: GiftMessage = {
      id: `gift_${Date.now()}`,
      gift: gift.name,
      giftEmoji: gift.emoji,
      text: `sent you a ${gift.emoji} ${gift.name}!`,
      timestamp: Date.now(),
      isMine: true,
    };
    setGiftMessages((prev) => [...prev, giftMsg]);
    setShowGiftPicker(false);
    sendGiftBackend.mutate({
      toUserId: profile.userId,
      giftName: gift.name,
      giftEmoji: gift.emoji,
    });
  };

  const openContextMenu = (
    e: React.MouseEvent | React.TouchEvent,
    msgId: string,
    msgIdBigint: bigint,
    msgText: string,
    isMine: boolean,
  ) => {
    e.preventDefault();
    let x = 0;
    let y = 0;
    if ("touches" in e) {
      x = e.touches[0]?.clientX ?? 0;
      y = e.touches[0]?.clientY ?? 0;
    } else {
      x = (e as React.MouseEvent).clientX;
      y = (e as React.MouseEvent).clientY;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    const relX = x - (rect?.left ?? 0);
    const relY = y - (rect?.top ?? 0);
    setContextMenu({
      msgId,
      msgIdBigint,
      msgText,
      isMine,
      x: Math.min(relX, (rect?.width ?? 300) - 180),
      y: relY,
    });
  };

  const startLongPress =
    (msgId: string, msgIdBigint: bigint, msgText: string, isMine: boolean) =>
    (e: React.TouchEvent) => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressTimer.current = setTimeout(
        () => openContextMenu(e, msgId, msgIdBigint, msgText, isMine),
        500,
      );
    };

  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleReact = (emoji: string) => {
    if (!contextMenu) return;
    setLocalReactions((prev) => new Map(prev).set(contextMenu.msgId, emoji));
    reactToMessage.mutate({ messageId: contextMenu.msgIdBigint, emoji });
    setContextMenu(null);
  };

  const handleReply = () => {
    if (!contextMenu) return;
    setReplyTo({
      id: contextMenu.msgId,
      text: contextMenu.msgText,
      senderName: contextMenu.isMine ? "You" : profile.name,
    });
    setContextMenu(null);
  };

  const handleEdit = () => {
    if (!contextMenu) return;
    const currentText =
      localEdits.get(contextMenu.msgId) ?? contextMenu.msgText;
    setInputValue(currentText);
    setEditingMsgId(contextMenu.msgId);
    setContextMenu(null);
  };

  const handleDelete = () => {
    if (!contextMenu) return;
    setDeletedIds((prev) => new Set(prev).add(contextMenu.msgId));
    deleteMessage.mutate(contextMenu.msgIdBigint);
    setContextMenu(null);
  };

  const handlePin = () => {
    if (!contextMenu) return;
    const text = localEdits.get(contextMenu.msgId) ?? contextMenu.msgText;
    setPinnedMessage({ id: contextMenu.msgId, text });
    setContextMenu(null);
  };

  const handleStar = () => {
    if (!contextMenu) return;
    const text = localEdits.get(contextMenu.msgId) ?? contextMenu.msgText;
    toggleStar({
      id: contextMenu.msgId,
      conversationId: profile.userId.toString(),
      contactName: profile.name,
      contactAvatar: profile.photoUrl ?? "",
      text,
      timestamp: Date.now(),
      senderId: contextMenu.isMine ? "me" : profile.userId.toString(),
    });
    setContextMenu(null);
  };

  const visibleMessages = useMemo(() => {
    const base = messages.filter(
      (m) => !deletedIds.has(m.id.toString()) && !m.isDeleted,
    );
    if (!msgSearch.trim()) return base;
    const q = msgSearch.toLowerCase();
    return base.filter((m) => m.text.toLowerCase().includes(q));
  }, [messages, deletedIds, msgSearch]);

  // Void to suppress unused warning
  void selfIsTyping;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        ref={containerRef}
        className="flex flex-col h-screen relative"
        style={{ background: "oklch(0.08 0.03 300)" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 pt-12 pb-4 flex-shrink-0"
          style={{
            background:
              "linear-gradient(180deg,oklch(0.14 0.07 340) 0%,oklch(0.1 0.04 320) 100%)",
            borderBottom: "1px solid oklch(0.22 0.06 330 / 0.5)",
          }}
        >
          <button
            type="button"
            onClick={onBack}
            data-ocid="conversation.button"
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "oklch(0.2 0.06 330)" }}
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="flex-1 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                padding: 2,
              }}
            >
              <div
                className="w-full h-full rounded-full overflow-hidden"
                style={{ background: "#1a0a1e" }}
              >
                {profile.photoUrl ? (
                  <img
                    src={profile.photoUrl}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                    {profile.name.charAt(0)}
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{profile.name}</p>
              <p
                className="text-[10px] transition-all duration-300"
                style={{ color: showTypingBubble ? "#ec4899" : "#4ade80" }}
              >
                {showTypingBubble ? (
                  <span className="inline-flex items-center gap-1">
                    typing
                    <span className="inline-flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1 h-1 rounded-full bg-pink-400 inline-block"
                          style={{
                            animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite`,
                          }}
                        />
                      ))}
                    </span>
                  </span>
                ) : isRecentlyActive ? (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                    Online
                  </span>
                ) : (
                  "Active recently"
                )}
              </p>
              <p className="text-[10px] text-white/30 mt-0.5">
                {matchedAgoLabel(profile.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onVoiceCall}
              data-ocid="conversation.secondary_button"
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background: "oklch(0.65 0.22 10 / 0.2)",
                border: "1px solid oklch(0.65 0.22 10 / 0.4)",
              }}
            >
              <Phone
                className="w-4 h-4"
                style={{ color: "oklch(0.75 0.18 10)" }}
              />
            </button>
            <button
              type="button"
              onClick={onVideoCall}
              data-ocid="conversation.secondary_button"
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background: "oklch(0.55 0.22 280 / 0.2)",
                border: "1px solid oklch(0.55 0.22 280 / 0.4)",
              }}
            >
              <Video
                className="w-4 h-4"
                style={{ color: "oklch(0.75 0.18 280)" }}
              />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMsgSearch((v) => !v);
                setMsgSearch("");
              }}
              data-ocid="conversation.toggle"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{
                background: showMsgSearch
                  ? "linear-gradient(135deg,#e11d48,#7c3aed)"
                  : "oklch(0.2 0.06 330)",
                border: "1px solid oklch(0.3 0.08 330)",
              }}
            >
              <Search className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Message search bar */}
        {showMsgSearch && (
          <div
            className="px-4 py-2 flex items-center gap-2 flex-shrink-0"
            style={{
              background: "oklch(0.12 0.05 320)",
              borderBottom: "1px solid oklch(0.2 0.06 330 / 0.4)",
            }}
          >
            <Search className="w-4 h-4 text-white/40 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search messages..."
              value={msgSearch}
              onChange={(e) => setMsgSearch(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              data-ocid="conversation.search_input"
            />
            {msgSearch && (
              <button
                type="button"
                onClick={() => setMsgSearch("")}
                className="text-white/40 hover:text-white/70"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Pinned Message Banner */}
        {pinnedMessage && (
          <div
            data-ocid="conversation.pinned_banner"
            className="flex items-center gap-2.5 px-4 py-2.5 flex-shrink-0"
            style={{
              background: "oklch(0.13 0.05 320)",
              borderBottom: "1px solid oklch(0.22 0.06 330 / 0.4)",
              borderLeft: "3px solid",
              borderImage: "linear-gradient(180deg,#e11d48,#7c3aed) 1",
            }}
          >
            <Pin
              className="w-3.5 h-3.5 flex-shrink-0"
              style={{ color: "#f59e0b" }}
            />
            <p className="flex-1 text-white/75 text-xs truncate">
              {pinnedMessage.text.length > 60
                ? `${pinnedMessage.text.slice(0, 60)}…`
                : pinnedMessage.text}
            </p>
            <button
              type="button"
              data-ocid="conversation.unpin_button"
              onClick={() => setPinnedMessage(null)}
              className="flex-shrink-0 text-white/40 hover:text-white/70 transition-colors"
              aria-label="Unpin message"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {visibleMessages.length === 0 && giftMessages.length === 0 && (
            <div
              className="text-center py-12"
              data-ocid="conversation.empty_state"
            >
              <p className="text-4xl mb-3">💬</p>
              <p className="text-white/50 text-sm">
                Start a conversation with {profile.name}
              </p>
            </div>
          )}
          {visibleMessages.map((msg) => {
            const isMine = msg.fromUserId.toString() === myPrincipal;
            const msgId = msg.id.toString();
            const displayText = localEdits.get(msgId) ?? msg.text;
            const highlightText = (text: string) => {
              if (!msgSearch.trim()) return <span>{text}</span>;
              const q = msgSearch.toLowerCase();
              const idx = text.toLowerCase().indexOf(q);
              if (idx === -1) return <span>{text}</span>;
              return (
                <span>
                  {text.slice(0, idx)}
                  <mark
                    style={{
                      background: "rgba(225,29,72,0.5)",
                      color: "white",
                      borderRadius: "2px",
                      padding: "0 1px",
                    }}
                  >
                    {text.slice(idx, idx + q.length)}
                  </mark>
                  {text.slice(idx + q.length)}
                </span>
              );
            };
            const reaction = localReactions.get(msgId) ?? msg.reaction;
            const time = new Date(
              Number(msg.timestamp) / 1_000_000,
            ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const isEdited = localEdits.has(msgId);
            // Get delivery status for my messages
            const statusEntry = isMine ? msgStatusMap.get(msgId) : undefined;
            return (
              <div
                key={msgId}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[75%]">
                  {!isMine && (
                    <div
                      className="w-6 h-6 rounded-full overflow-hidden mb-1 flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                      }}
                    >
                      {profile.photoUrl ? (
                        <img
                          src={profile.photoUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-xs font-bold">
                          {profile.name.charAt(0)}
                        </span>
                      )}
                    </div>
                  )}
                  <div
                    className="px-4 py-2.5 rounded-2xl text-sm cursor-pointer select-none active:scale-95 transition-transform"
                    style={
                      isMine
                        ? {
                            background:
                              "linear-gradient(135deg,#e11d48,#7c3aed)",
                            color: "white",
                          }
                        : { background: "oklch(0.18 0.05 320)", color: "white" }
                    }
                    onContextMenu={(e) =>
                      openContextMenu(e, msgId, msg.id, displayText, isMine)
                    }
                    onTouchStart={startLongPress(
                      msgId,
                      msg.id,
                      displayText,
                      isMine,
                    )}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                  >
                    {highlightText(displayText)}
                    {isEdited && (
                      <span className="text-white/50 text-[9px] ml-1">
                        (edited)
                      </span>
                    )}
                    {isStarred(msgId) && (
                      <span className="ml-1 text-[11px]" title="Starred">
                        ⭐
                      </span>
                    )}
                  </div>
                  {reaction && (
                    <div
                      className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-sm ${
                        isMine ? "float-right" : "float-left"
                      }`}
                      style={{
                        background: "oklch(0.18 0.05 320)",
                        border: "1px solid oklch(0.28 0.07 330)",
                      }}
                    >
                      {reaction}
                    </div>
                  )}
                  <div
                    className={`flex items-center gap-1 mt-0.5 clear-both ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <p className="text-[10px] text-white/40">{time}</p>
                    {isMine && <MsgReceipt entry={statusEntry} />}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Gift messages */}
          {giftMessages.map((gm) => (
            <div key={gm.id} className="flex justify-end">
              <div
                className="max-w-[65%] px-5 py-4 rounded-3xl flex flex-col items-center gap-1.5"
                style={{
                  background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                  boxShadow: "0 4px 20px rgba(225,29,72,0.4)",
                }}
              >
                <span className="text-3xl">{gm.giftEmoji}</span>
                <p className="text-white text-sm font-semibold text-center italic">
                  {gm.text}
                </p>
                <p className="text-white/60 text-[10px]">
                  {new Date(gm.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Seen indicator — Messenger-style avatar below last read sent message */}
          {readReceiptsOn &&
            (() => {
              const lastReadSent = [...visibleMessages]
                .reverse()
                .find((m) => m.fromUserId.toString() === myPrincipal && m.read);
              if (!lastReadSent) return null;
              return (
                <div
                  key={`seen_${lastReadSent.id}`}
                  className="flex justify-end pr-1 -mt-2 mb-1"
                >
                  <div
                    className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                    title={`Seen by ${profile.name}`}
                    style={{
                      background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                    }}
                  >
                    {profile.photoUrl ? (
                      <img
                        src={profile.photoUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-[8px] font-bold">
                        {profile.name.charAt(0)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

          {/* Remote typing bubble */}
          {showTypingBubble && (
            <div className="flex justify-start">
              <div
                className="px-4 py-3 rounded-2xl flex gap-1 items-center"
                style={{ background: "oklch(0.18 0.05 320)" }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: "oklch(0.65 0.22 10)",
                      animation: `bounce 1s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="absolute z-50 rounded-2xl overflow-hidden"
            style={{
              left: contextMenu.x,
              top: contextMenu.y - 10,
              background: "oklch(0.14 0.06 330 / 0.97)",
              border: "1px solid oklch(0.3 0.1 330 / 0.6)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px oklch(0.05 0.03 330 / 0.8)",
              minWidth: 180,
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div
              className="flex gap-1 px-3 py-3 border-b"
              style={{ borderColor: "oklch(0.25 0.07 330 / 0.4)" }}
            >
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleReact(emoji)}
                  className="text-xl hover:scale-125 transition-transform active:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleReply}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 transition-colors"
            >
              <Reply className="w-4 h-4" style={{ color: "#ec4899" }} />
              Reply
            </button>
            {contextMenu.isMine && (
              <>
                <button
                  type="button"
                  onClick={handleEdit}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 transition-colors"
                >
                  <Edit2 className="w-4 h-4" style={{ color: "#a855f7" }} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  data-ocid="conversation.delete_button"
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handlePin}
              data-ocid="conversation.pin_button"
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 transition-colors"
            >
              <Pin className="w-4 h-4" style={{ color: "#f59e0b" }} />
              {pinnedMessage?.id === contextMenu.msgId ? "Unpin" : "Pin"}
            </button>
            <button
              type="button"
              onClick={handleStar}
              data-ocid="conversation.toggle"
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 transition-colors"
            >
              <Star
                className="w-4 h-4"
                style={{ color: "#f59e0b" }}
                fill={isStarred(contextMenu.msgId) ? "#f59e0b" : "none"}
              />
              {isStarred(contextMenu.msgId) ? "Unstar" : "Star"}
            </button>
          </div>
        )}

        {/* Input area */}
        <div
          className="flex-shrink-0"
          style={{
            borderTop: "1px solid oklch(0.22 0.06 330 / 0.5)",
            background: "oklch(0.1 0.04 320)",
          }}
        >
          {replyTo && (
            <div
              className="flex items-center gap-2 px-4 py-2"
              style={{
                borderBottom: "1px solid oklch(0.22 0.06 330 / 0.4)",
                background: "oklch(0.13 0.05 320)",
              }}
            >
              <Reply className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-pink-400 font-semibold">
                  {replyTo.senderName}
                </p>
                <p className="text-xs text-white/50 truncate">
                  {replyTo.text.length > 50
                    ? `${replyTo.text.slice(0, 50)}…`
                    : replyTo.text}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-white/40 hover:text-white/70 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {editingMsgId && (
            <div
              className="flex items-center gap-2 px-4 py-1.5"
              style={{
                borderBottom: "1px solid oklch(0.22 0.06 330 / 0.4)",
                background: "oklch(0.13 0.05 320)",
              }}
            >
              <Edit2 className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] text-purple-400 font-semibold flex-1">
                Editing message
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditingMsgId(null);
                  setInputValue("");
                }}
                className="text-white/40 hover:text-white/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="px-4 py-3 flex items-center gap-2">
            <Input
              value={inputValue}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                editingMsgId
                  ? "Edit message..."
                  : replyTo
                    ? "Reply..."
                    : "Type a message..."
              }
              data-ocid="conversation.input"
              className="flex-1 h-11 rounded-2xl text-sm"
              style={{
                background: "oklch(0.16 0.05 320)",
                border: "1px solid oklch(0.26 0.07 330)",
                color: "white",
              }}
            />
            {/* Gift button */}
            <button
              type="button"
              data-ocid="conversation.secondary_button"
              onClick={() => setShowGiftPicker(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
              style={{ background: "oklch(0.18 0.05 320)" }}
              title="Send a gift"
            >
              🎁
            </button>
            {/* Emoji button */}
            <button
              type="button"
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "oklch(0.18 0.05 320)" }}
            >
              <Smile
                className="w-4 h-4"
                style={{ color: "oklch(0.65 0.15 60)" }}
              />
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sendMessage.isPending}
              data-ocid="conversation.submit_button"
              className="w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-transform flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Gift Picker Sheet */}
        <Sheet open={showGiftPicker} onOpenChange={setShowGiftPicker}>
          <SheetContent
            side="bottom"
            data-ocid="conversation.sheet"
            className="rounded-t-3xl border-0 px-6 pb-10"
            style={{
              background: "oklch(0.11 0.05 300)",
              borderTop: "1px solid oklch(0.22 0.07 300)",
            }}
          >
            <SheetHeader className="mb-4">
              <SheetTitle className="text-white font-bold">
                🎁 Send a Gift
              </SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-3">
              {GIFTS.map((gift) => (
                <button
                  key={gift.name}
                  type="button"
                  data-ocid="conversation.secondary_button"
                  onClick={() => handleSendGift(gift)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95"
                  style={{
                    background: "oklch(0.16 0.06 300)",
                    border: "1px solid oklch(0.28 0.08 300)",
                  }}
                >
                  <span className="text-4xl">{gift.emoji}</span>
                  <p className="text-white font-semibold text-sm">
                    {gift.name}
                  </p>
                  <p className="text-white/50 text-xs">{gift.points} pts</p>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
