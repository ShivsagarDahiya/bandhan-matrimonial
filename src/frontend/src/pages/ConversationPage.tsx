import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Check,
  Edit2,
  Phone,
  Reply,
  Send,
  Smile,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Message, Profile } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useDeleteMessage,
  useEditMessage,
  useMarkMessageRead,
  useMessages,
  useReactToMessage,
  useSendMessage,
  useSetTyping,
  useTypingStatus,
} from "../hooks/useQueries";

// Extended message type with fields added in backend version 9
type ExtMessage = Message & { reaction?: string; isDeleted?: boolean };

interface Props {
  profile: Profile;
  onBack: () => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
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

const REACTIONS = ["❤️", "😂", "😮", "👍", "😢"];

export default function ConversationPage({
  profile,
  onBack,
  onVoiceCall,
  onVideoCall,
}: Props) {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();
  const { data: rawMessages = [] } = useMessages(profile.userId, true);
  const messages = rawMessages as ExtMessage[];
  const sendMessage = useSendMessage();
  const markRead = useMarkMessageRead();
  const setTypingMutation = useSetTyping();
  const { data: isTyping } = useTypingStatus(profile.userId);
  const reactToMessage = useReactToMessage();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markedReadRef = useRef<Set<string>>(new Set());

  // Chat enhancement state (optimistic)
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  // Local optimistic reactions — local takes precedence over backend
  const [localReactions, setLocalReactions] = useState<Map<string, string>>(
    new Map(),
  );
  // Local optimistic deleted ids
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  // Local optimistic edits
  const [localEdits, setLocalEdits] = useState<Map<string, string>>(new Map());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark incoming messages as read
  useEffect(() => {
    for (const msg of messages) {
      const key = msg.id.toString();
      if (
        msg.toUserId.toString() === myPrincipal &&
        !msg.read &&
        !markedReadRef.current.has(key)
      ) {
        markedReadRef.current.add(key);
        markRead.mutate(msg.id);
      }
    }
  }, [messages, myPrincipal, markRead]);

  // Dismiss context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  const handleTyping = useCallback(
    (val: string) => {
      setInputValue(val);
      setTypingMutation.mutate({ toUserId: profile.userId, isTyping: true });
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setTypingMutation.mutate({ toUserId: profile.userId, isTyping: false });
      }, 3000);
    },
    [profile.userId, setTypingMutation],
  );

  const handleSend = async () => {
    const rawText = inputValue.trim();
    if (!rawText) return;

    if (editingMsgId) {
      // Optimistic local edit
      setLocalEdits((prev) => new Map(prev).set(editingMsgId, rawText));
      // Persist to backend
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
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setTypingMutation.mutate({ toUserId: profile.userId, isTyping: false });
    try {
      await sendMessage.mutateAsync({ toUserId: profile.userId, text });
    } catch {}
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
    // Optimistic update
    setLocalReactions((prev) => new Map(prev).set(contextMenu.msgId, emoji));
    // Persist to backend
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
    // Optimistic update
    setDeletedIds((prev) => new Set(prev).add(contextMenu.msgId));
    // Persist to backend
    deleteMessage.mutate(contextMenu.msgIdBigint);
    setContextMenu(null);
  };

  const visibleMessages = messages.filter(
    (m) => !deletedIds.has(m.id.toString()) && !m.isDeleted,
  );

  return (
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
            <p className="text-[10px] text-green-400">
              {isTyping ? "typing..." : "Online"}
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
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {visibleMessages.length === 0 && (
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
          // Local optimistic reaction takes precedence, then backend reaction
          const reaction = localReactions.get(msgId) ?? msg.reaction;
          const time = new Date(
            Number(msg.timestamp) / 1_000_000,
          ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const isEdited = localEdits.has(msgId);
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
                          background: "linear-gradient(135deg,#e11d48,#7c3aed)",
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
                  {displayText}
                  {isEdited && (
                    <span className="text-white/50 text-[9px] ml-1">
                      (edited)
                    </span>
                  )}
                </div>
                {/* Reaction pill */}
                {reaction && (
                  <div
                    className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-sm ${isMine ? "float-right" : "float-left"}`}
                    style={{
                      background: "oklch(0.18 0.05 320)",
                      border: "1px solid oklch(0.28 0.07 330)",
                    }}
                  >
                    {reaction}
                  </div>
                )}
                <div
                  className={`flex items-center gap-1 mt-0.5 clear-both ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <p className="text-[10px] text-white/40">{time}</p>
                  {isMine && (
                    <span
                      className="flex items-center"
                      title={msg.read ? "Read" : "Sent"}
                    >
                      {msg.read ? (
                        <span className="flex" style={{ color: "#3b82f6" }}>
                          <Check className="w-3 h-3" />
                          <Check className="w-3 h-3 -ml-1.5" />
                        </span>
                      ) : (
                        <Check className="w-3 h-3 text-white/30" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
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
          {/* Reaction row */}
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
          {/* Actions */}
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
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
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
        {/* Reply preview */}
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
        {/* Edit indicator */}
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
        <div className="px-4 py-3 flex items-center gap-3">
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
          {/* Emoji picker trigger placeholder */}
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
    </div>
  );
}
