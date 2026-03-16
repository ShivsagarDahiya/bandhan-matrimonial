import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Star, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { StarredMessage } from "../hooks/useStarredMessages";
import { useStarredMessages } from "../hooks/useStarredMessages";

interface Props {
  onBack: () => void;
  onOpenConversation?: (conversationId: string, contactName: string) => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function groupByContact(items: StarredMessage[]): Array<{
  contactName: string;
  contactAvatar: string;
  conversationId: string;
  messages: StarredMessage[];
}> {
  const map = new Map<
    string,
    {
      contactName: string;
      contactAvatar: string;
      conversationId: string;
      messages: StarredMessage[];
    }
  >();
  for (const item of items) {
    const key = item.conversationId;
    if (!map.has(key)) {
      map.set(key, {
        contactName: item.contactName,
        contactAvatar: item.contactAvatar,
        conversationId: item.conversationId,
        messages: [],
      });
    }
    map.get(key)!.messages.push(item);
  }
  return Array.from(map.values());
}

export default function StarredMessagesPage({
  onBack,
  onOpenConversation,
}: Props) {
  const { starred, unstarMessage } = useStarredMessages();
  const groups = groupByContact(starred);

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: "oklch(0.08 0.03 300)" }}
      data-ocid="starred.page"
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
          data-ocid="starred.button"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "oklch(0.2 0.06 330)" }}
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <Star className="w-5 h-5" style={{ color: "#f59e0b" }} />
          <h1 className="text-lg font-bold text-white">Starred Messages</h1>
          {starred.length > 0 && (
            <span
              className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
            >
              {starred.length}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {starred.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 px-8 text-center"
            data-ocid="starred.empty_state"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
              style={{ background: "oklch(0.15 0.06 330)" }}
            >
              <Star
                className="w-9 h-9"
                style={{ color: "oklch(0.65 0.18 60)" }}
              />
            </div>
            <p className="text-white font-semibold text-lg mb-2">
              No starred messages yet
            </p>
            <p className="text-white/40 text-sm">
              Long-press any message to star it and save it here
            </p>
          </motion.div>
        ) : (
          <div className="pb-8">
            <AnimatePresence initial={false}>
              {groups.map((group, gi) => (
                <motion.div
                  key={group.conversationId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: gi * 0.05 }}
                  className="mb-2"
                  data-ocid={`starred.item.${gi + 1}`}
                >
                  {/* Contact header */}
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                    onClick={() =>
                      onOpenConversation?.(
                        group.conversationId,
                        group.contactName,
                      )
                    }
                    data-ocid={"starred.panel"}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                      style={{
                        background: group.contactAvatar
                          ? undefined
                          : "linear-gradient(135deg,#e11d48,#7c3aed)",
                      }}
                    >
                      {group.contactAvatar ? (
                        <img
                          src={group.contactAvatar}
                          alt={group.contactName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        group.contactName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-semibold text-sm">
                        {group.contactName}
                      </p>
                      <p className="text-white/40 text-xs">
                        {group.messages.length} starred{" "}
                        {group.messages.length === 1 ? "message" : "messages"}
                      </p>
                    </div>
                  </button>

                  {/* Messages */}
                  <div className="px-4 pb-2">
                    <AnimatePresence>
                      {group.messages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          className="flex items-start gap-3 mb-2"
                        >
                          <div
                            className="flex-1 px-3.5 py-2.5 rounded-xl text-sm text-white"
                            style={{
                              background: "oklch(0.15 0.05 320)",
                              border: "1px solid oklch(0.25 0.07 330 / 0.4)",
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="flex-1 leading-relaxed">
                                {msg.text}
                              </p>
                              <span className="text-[10px] text-white/30 flex-shrink-0 mt-0.5">
                                {formatTime(msg.timestamp)}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => unstarMessage(msg.id)}
                            data-ocid="starred.delete_button"
                            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-red-500/20 transition-colors mt-1"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Separator */}
                  {gi < groups.length - 1 && (
                    <div
                      className="mx-4 h-px"
                      style={{ background: "oklch(0.2 0.05 330 / 0.4)" }}
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
