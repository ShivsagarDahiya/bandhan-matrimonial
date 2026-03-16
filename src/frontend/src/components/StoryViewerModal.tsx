import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  Pin,
  Reply,
  Send,
  Share2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Story } from "../backend";
import {
  useAddStoryComment,
  useAddStoryReaction,
  useCallerProfile,
  useCallerStoryReaction,
  useDeleteStory,
  useHasLikedStory,
  useLikeStory,
  useRecordStoryView,
  useReplyToStoryComment,
  useStoryComments,
  useStoryReactions,
  useStoryViewCount,
  useStoryViewers,
  useUnlikeStory,
} from "../hooks/useQueries";

interface StoryViewerModalProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}

const STORY_DURATION = 5000;
const REACTION_EMOJIS = ["❤️", "🔥", "😂", "😮", "😢"];

function timeAgo(timestamp: bigint): string {
  const ms = Number(timestamp) / 1_000_000;
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ViewersSheet({
  storyId,
  onClose,
}: {
  storyId: bigint;
  onClose: () => void;
}) {
  const { data: viewers = [] } = useStoryViewers(storyId);
  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Close viewers"
      />
      <motion.div
        className="relative w-full max-w-sm rounded-t-3xl overflow-hidden"
        style={{ background: "oklch(0.13 0.05 300)", maxHeight: "60vh" }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="text-white font-semibold">
            Viewers ({viewers.length})
          </h3>
          <button
            type="button"
            onClick={onClose}
            data-ocid="story_viewers.close_button"
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <div
          className="overflow-y-auto px-5 pb-6 space-y-3"
          style={{ maxHeight: "45vh" }}
        >
          {viewers.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-8">
              No viewers yet
            </p>
          ) : (
            viewers.map((v, i) => (
              <div
                key={v.userId.toString()}
                data-ocid={`story_viewers.item.${i + 1}`}
                className="flex items-center gap-3"
              >
                <div
                  className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                  }}
                >
                  {v.photoUrl ? (
                    <img
                      src={v.photoUrl}
                      alt={v.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-sm">
                      {v.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{v.name}</p>
                  <p className="text-white/40 text-xs">{v.location}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function StoryContent({
  story,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  progress,
}: {
  story: Story;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  progress: number;
}) {
  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<bigint | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showViewers, setShowViewers] = useState(false);
  const [showLikedBy, setShowLikedBy] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(() => {
    try {
      const key = `story_highlights_${story.userId.toString()}`;
      const stored: bigint[] = JSON.parse(localStorage.getItem(key) || "[]");
      return stored.some((id) => String(id) === String(story.id));
    } catch {
      return false;
    }
  });
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const { data: callerProfile } = useCallerProfile();
  const { data: comments = [], isLoading: commentsLoading } = useStoryComments(
    story.id,
  );
  const { data: hasLiked = false } = useHasLikedStory(story.id);
  const { data: reactions = [] } = useStoryReactions(story.id);
  const { data: callerReaction = null } = useCallerStoryReaction(story.id);
  const { data: viewCount = BigInt(0) } = useStoryViewCount(story.id);

  const likeStory = useLikeStory();
  const unlikeStory = useUnlikeStory();
  const addComment = useAddStoryComment();
  const replyComment = useReplyToStoryComment();
  const addReaction = useAddStoryReaction();
  const deleteStory = useDeleteStory();
  const recordView = useRecordStoryView();

  const isOwner =
    callerProfile &&
    story.userId.toString() === callerProfile.userId.toString();

  // biome-ignore lint/correctness/useExhaustiveDependencies: record view only when story changes
  useEffect(() => {
    recordView.mutate(story.id);
  }, [story.id]);

  const handleLike = async () => {
    try {
      if (hasLiked) {
        await unlikeStory.mutateAsync(story.id);
      } else {
        await likeStory.mutateAsync(story.id);
      }
    } catch {}
  };

  const handleReaction = async (emoji: string) => {
    try {
      // Toggle off if same emoji, otherwise set new
      const newEmoji = callerReaction === emoji ? "" : emoji;
      await addReaction.mutateAsync({ storyId: story.id, emoji: newEmoji });
    } catch {}
  };

  const handleShare = async () => {
    const text = `Check out ${story.authorName}'s story on Bandhan Matrimonial!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Bandhan Matrimonial", text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(text);
      } catch {}
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    try {
      await addComment.mutateAsync({ storyId: story.id, text: comment.trim() });
      setComment("");
      setTimeout(
        () => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    } catch {}
  };

  const handleReply = async () => {
    if (!replyText.trim() || replyingTo === null) return;
    try {
      await replyComment.mutateAsync({
        storyId: story.id,
        parentCommentId: replyingTo,
        text: replyText.trim(),
      });
      setReplyText("");
      setReplyingTo(null);
    } catch {}
  };

  const handleDeleteStory = async () => {
    if (!confirm("Delete this story?")) return;
    try {
      await deleteStory.mutateAsync(story.id);
      onClose();
    } catch {}
  };

  const handleToggleHighlight = () => {
    try {
      const key = `story_highlights_${story.userId.toString()}`;
      const stored: string[] = JSON.parse(localStorage.getItem(key) || "[]");
      const storyIdStr = String(story.id);
      let updated: string[];
      if (isHighlighted) {
        updated = stored.filter((id) => id !== storyIdStr);
      } else {
        updated = [...stored, storyIdStr];
      }
      localStorage.setItem(key, JSON.stringify(updated));
      setIsHighlighted(!isHighlighted);
    } catch {}
  };

  const topLevelComments = comments.filter((c) => !c.parentCommentId);
  const getReplies = (commentId: bigint) =>
    comments.filter(
      (c) => c.parentCommentId && c.parentCommentId === commentId,
    );

  const isTyping = comment.length > 0 || replyText.length > 0;

  const reactionMap = new Map(reactions.map(([e, c]) => [e, c]));

  // Parse stickers/music encoded in caption
  const { cleanCaption, stickers, musicLabel } = (() => {
    const cap = story.caption || "";
    const sepIdx = cap.indexOf("|||");
    if (sepIdx === -1)
      return {
        cleanCaption: cap,
        stickers: [] as string[],
        musicLabel: null as string | null,
      };
    try {
      const meta = JSON.parse(cap.slice(sepIdx + 3));
      return {
        cleanCaption: cap.slice(0, sepIdx),
        stickers: (meta.stickers || []) as string[],
        musicLabel: (meta.music || null) as string | null,
      };
    } catch {
      return {
        cleanCaption: cap,
        stickers: [] as string[],
        musicLabel: null as string | null,
      };
    }
  })();

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Full-screen background image */}
      {story.imageUrl ? (
        story.imageUrl.match(/\.(mp4|webm|ogg)$/i) ? (
          <video
            src={story.imageUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <track kind="captions" />
          </video>
        ) : (
          <img
            src={story.imageUrl}
            alt="story"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
        />
      )}

      {/* Top gradient overlay */}
      <div
        className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
        }}
      />
      {/* Bottom gradient overlay */}
      <div
        className="absolute bottom-0 left-0 right-0 h-80 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)",
        }}
      />

      {/* Sticker overlays */}
      {stickers.length > 0 && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {stickers.map((s, i) => {
            const positions = [
              { top: "20%", left: "15%" },
              { top: "30%", right: "12%" },
              { top: "50%", left: "10%" },
              { top: "45%", right: "15%" },
              { top: "65%", left: "20%" },
              { top: "25%", left: "50%" },
              { top: "55%", right: "8%" },
              { top: "70%", right: "18%" },
            ];
            const pos = positions[i % positions.length];
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: sticker positions are fixed
                key={s + i}
                className="absolute text-3xl drop-shadow-lg"
                style={{
                  ...pos,
                  transform: `rotate(${((i % 3) - 1) * 12}deg)`,
                }}
              >
                {s}
              </div>
            );
          })}
        </div>
      )}

      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-3 pt-3">
        <div
          className="flex-1 h-0.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.3)" }}
        >
          <div
            className="h-full rounded-full transition-none"
            style={{
              width: `${progress * 100}%`,
              background: "white",
              transitionProperty: isTyping ? "none" : "width",
              transitionDuration: "0ms",
            }}
          />
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4 pt-2">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg,#e11d48,#7c3aed)",
              padding: 2,
            }}
          >
            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-black">
              {story.authorPhoto ? (
                <img
                  src={story.authorPhoto}
                  alt={story.authorName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-sm">
                  {story.authorName.charAt(0)}
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="text-white font-semibold text-sm drop-shadow">
              {story.authorName}
            </p>
            <p className="text-white/60 text-[10px]">
              {timeAgo(story.timestamp)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Owner actions */}
          {isOwner && (
            <>
              <button
                type="button"
                data-ocid="story_viewer.viewers_button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowViewers(true);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)" }}
                title="View viewers"
              >
                <Users className="w-4 h-4 text-white" />
              </button>
              <button
                type="button"
                data-ocid="story_viewer.toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleHighlight();
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: isHighlighted
                    ? "linear-gradient(135deg,#f59e0b,#d97706)"
                    : "rgba(255,255,255,0.15)",
                }}
                title={isHighlighted ? "Remove highlight" : "Pin to highlights"}
              >
                <Pin className="w-4 h-4 text-white" />
              </button>
              <button
                type="button"
                data-ocid="story_viewer.delete_button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteStory();
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(225,29,72,0.3)" }}
                title="Delete story"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </>
          )}
          <button
            type="button"
            data-ocid="story_viewer.close_button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.4)" }}
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Tap areas for prev/next */}
      <div className="absolute inset-0 z-10 flex pointer-events-none">
        <button
          type="button"
          data-ocid="story_viewer.secondary_button"
          className="w-1/3 h-full pointer-events-auto flex items-center justify-start pl-2 opacity-0"
          onClick={(e) => {
            e.stopPropagation();
            if (hasPrev) onPrev();
          }}
          aria-label="Previous story"
        >
          {hasPrev && <ChevronLeft className="w-7 h-7 text-white/60" />}
        </button>
        <div className="flex-1" />
        <button
          type="button"
          data-ocid="story_viewer.primary_button"
          className="w-1/3 h-full pointer-events-auto flex items-center justify-end pr-2 opacity-0"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Next story"
        >
          {hasNext && <ChevronRight className="w-7 h-7 text-white/60" />}
        </button>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-24 flex flex-col gap-2">
        {cleanCaption && (
          <p className="text-white/90 text-sm text-center drop-shadow">
            {cleanCaption}
          </p>
        )}
        {/* Music badge */}
        {musicLabel && (
          <div
            className="absolute bottom-36 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm"
            style={{ background: "rgba(0,0,0,0.55)", zIndex: 25 }}
          >
            <span className="text-base animate-pulse">🎵</span>
            <span className="text-white/90 text-xs font-medium">
              {musicLabel}
            </span>
          </div>
        )}

        {/* Like + View count + Share row */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-ocid="story_viewer.toggle"
            onClick={handleLike}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
            style={{
              background: hasLiked
                ? "linear-gradient(135deg,#e11d48,#db2777)"
                : "rgba(255,255,255,0.12)",
            }}
          >
            <Heart
              className={`w-4 h-4 ${hasLiked ? "fill-white text-white" : "text-white/70"}`}
            />
            <span className="text-white text-xs font-medium">
              {Number(story.likesCount)}
            </span>
          </button>
          {isOwner && Number(story.likesCount) > 0 && (
            <button
              type="button"
              data-ocid="story_viewer.secondary_button"
              onClick={(e) => {
                e.stopPropagation();
                setShowLikedBy(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-white text-xs">Who liked</span>
            </button>
          )}
          {/* View count */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <Eye className="w-4 h-4 text-white/70" />
            <span className="text-white text-xs">{Number(viewCount)}</span>
          </div>
          <button
            type="button"
            data-ocid="story_viewer.share_button"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <Share2 className="w-4 h-4 text-white/70" />
            <span className="text-white text-xs">Share</span>
          </button>
          <span className="text-white/40 text-xs ml-auto">
            {commentsLoading ? "..." : `${comments.length} comments`}
          </span>
        </div>

        {/* Emoji reactions row */}
        <div className="flex items-center gap-1.5">
          {REACTION_EMOJIS.map((emoji) => {
            const count = reactionMap.get(emoji) ?? BigInt(0);
            const isActive = callerReaction === emoji;
            return (
              <button
                key={emoji}
                type="button"
                data-ocid="story_viewer.toggle"
                onClick={() => handleReaction(emoji)}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all"
                style={{
                  background: isActive
                    ? "linear-gradient(135deg,#e11d48,#7c3aed)"
                    : "rgba(255,255,255,0.1)",
                  border: isActive
                    ? "1px solid rgba(255,255,255,0.3)"
                    : "1px solid transparent",
                }}
              >
                <span>{emoji}</span>
                {count > BigInt(0) && (
                  <span className="text-white text-[10px] font-medium">
                    {Number(count)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Comments list */}
        {comments.length > 0 && (
          <div
            className="max-h-24 overflow-y-auto space-y-1.5"
            style={{ scrollbarWidth: "none" }}
          >
            {topLevelComments.map((c) => (
              <div key={c.id.toString()}>
                <div className="flex items-start gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                    }}
                  >
                    {c.authorName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white/90 text-xs font-semibold">
                      {c.authorName}
                    </span>
                    <span className="text-white/70 text-xs ml-1.5">
                      {c.text}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setReplyingTo(replyingTo === c.id ? null : c.id)
                      }
                      data-ocid="story_viewer.secondary_button"
                      className="ml-2 text-white/40 text-[10px] hover:text-white/70 inline-flex items-center gap-0.5"
                    >
                      <Reply className="w-2.5 h-2.5" /> Reply
                    </button>
                  </div>
                </div>
                {getReplies(c.id).map((r) => (
                  <div
                    key={r.id.toString()}
                    className="flex items-start gap-2 ml-8 mt-1"
                  >
                    <div
                      className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
                      style={{
                        background: "linear-gradient(135deg,#7c3aed,#2563eb)",
                      }}
                    >
                      {r.authorName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white/80 text-[10px] font-semibold">
                        {r.authorName}
                      </span>
                      <span className="text-white/60 text-[10px] ml-1">
                        {r.text}
                      </span>
                    </div>
                  </div>
                ))}
                {replyingTo === c.id && (
                  <div className="flex items-center gap-2 ml-8 mt-1.5">
                    <Input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to ${c.authorName}...`}
                      data-ocid="story_viewer.input"
                      className="h-7 text-xs rounded-full border-white/20 text-white placeholder:text-white/40 flex-1"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                      onKeyDown={(e) => e.key === "Enter" && handleReply()}
                    />
                    <button
                      type="button"
                      onClick={handleReply}
                      data-ocid="story_viewer.submit_button"
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg,#7c3aed,#2563eb)",
                      }}
                    >
                      <Send className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>
        )}

        {/* Comment input */}
        <div className="flex items-center gap-2">
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={`Comment on ${story.authorName}'s story...`}
            data-ocid="story_viewer.comment_input"
            className="h-10 rounded-full text-sm border-white/20 text-white placeholder:text-white/40 flex-1"
            style={{ background: "rgba(255,255,255,0.1)" }}
            onKeyDown={(e) => e.key === "Enter" && handleComment()}
          />
          <button
            type="button"
            data-ocid="story_viewer.submit_button"
            onClick={handleComment}
            disabled={addComment.isPending}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#e11d48,#db2777)" }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Liked By sheet */}
      <AnimatePresence>
        {showLikedBy && isOwner && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowLikedBy(false)}
              aria-label="Close"
            />
            <motion.div
              className="relative w-full max-w-sm rounded-t-3xl overflow-hidden"
              style={{ background: "oklch(0.13 0.05 300)", maxHeight: "60vh" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="flex items-center justify-between px-5 py-4">
                <h3 className="text-white font-semibold">
                  ❤️ Liked by ({Number(story.likesCount)})
                </h3>
                <button
                  type="button"
                  onClick={() => setShowLikedBy(false)}
                  data-ocid="story_viewer.close_button"
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              <div
                className="overflow-y-auto px-5 pb-6 space-y-3"
                style={{ maxHeight: "45vh" }}
              >
                {reactions.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-8">
                    No reactions yet
                  </p>
                ) : (
                  reactions.map(([emoji, count], i) => (
                    <div
                      key={emoji}
                      data-ocid={`story_viewer.item.${i + 1}`}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-2xl">{emoji}</span>
                      <span className="text-white/70 text-sm">
                        {Number(count)} people
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Viewers sheet */}
      <AnimatePresence>
        {showViewers && isOwner && (
          <ViewersSheet
            storyId={story.id}
            onClose={() => setShowViewers(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StoryViewerModal({
  stories,
  initialIndex,
  onClose,
}: StoryViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const progressRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const story = stories[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
      progressRef.current = 0;
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
      progressRef.current = 0;
    }
  }, [currentIndex]);

  // Auto-advance timer using rAF
  useEffect(() => {
    progressRef.current = 0;
    setProgress(0);
    lastTickRef.current = null;

    const tick = (ts: number) => {
      if (lastTickRef.current === null) lastTickRef.current = ts;
      const delta = ts - lastTickRef.current;
      lastTickRef.current = ts;

      if (!paused) {
        progressRef.current = Math.min(
          1,
          progressRef.current + delta / STORY_DURATION,
        );
        setProgress(progressRef.current);
        if (progressRef.current >= 1) {
          goNext();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [paused, goNext]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  if (!story) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.97)" }}
        data-ocid="story_viewer.modal"
      >
        {/* Story card container - max width like mobile */}
        <div
          className="relative w-full max-w-sm h-full max-h-screen overflow-hidden"
          style={{ touchAction: "none" }}
          onPointerDown={(_e) => {
            // Long press to pause
            longPressRef.current = setTimeout(() => setPaused(true), 200);
          }}
          onPointerUp={() => {
            if (longPressRef.current) clearTimeout(longPressRef.current);
            setPaused(false);
          }}
          onPointerLeave={() => {
            if (longPressRef.current) clearTimeout(longPressRef.current);
            setPaused(false);
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <StoryContent
                story={story}
                onClose={onClose}
                onPrev={goPrev}
                onNext={goNext}
                hasPrev={currentIndex > 0}
                hasNext={currentIndex < stories.length - 1}
                progress={progress}
              />
            </motion.div>
          </AnimatePresence>

          {/* Story index dots */}
          {stories.length > 1 && (
            <div className="absolute top-2 left-0 right-0 z-30 flex gap-1 px-3">
              {stories.map((s, i) => (
                <div
                  key={s.id.toString()}
                  className="flex-1 h-0.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.3)" }}
                >
                  <div
                    className="h-full rounded-full bg-white"
                    style={{
                      width:
                        i < currentIndex
                          ? "100%"
                          : i === currentIndex
                            ? `${progress * 100}%`
                            : "0%",
                      transition:
                        i === currentIndex && !paused ? "none" : "none",
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prev/Next side buttons for desktop */}
        {currentIndex > 0 && (
          <button
            type="button"
            data-ocid="story_viewer.secondary_button"
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center hidden md:flex"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}
        {currentIndex < stories.length - 1 && (
          <button
            type="button"
            data-ocid="story_viewer.primary_button"
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center hidden md:flex"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
