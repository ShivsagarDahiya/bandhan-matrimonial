import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Reply,
  Send,
  Share2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Story } from "../backend";
import {
  useAddStoryComment,
  useHasLikedStory,
  useLikeStory,
  useReplyToStoryComment,
  useStoryComments,
  useUnlikeStory,
} from "../hooks/useQueries";

interface StoryViewerModalProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}

const STORY_DURATION = 5000;

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
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const { data: comments = [], isLoading: commentsLoading } = useStoryComments(
    story.id,
  );
  const { data: hasLiked = false } = useHasLikedStory(story.id);
  const likeStory = useLikeStory();
  const unlikeStory = useUnlikeStory();
  const addComment = useAddStoryComment();
  const replyComment = useReplyToStoryComment();

  const handleLike = async () => {
    try {
      if (hasLiked) {
        await unlikeStory.mutateAsync(story.id);
      } else {
        await likeStory.mutateAsync(story.id);
      }
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

  const topLevelComments = comments.filter((c) => !c.parentCommentId);
  const getReplies = (commentId: bigint) =>
    comments.filter(
      (c) => c.parentCommentId && c.parentCommentId === commentId,
    );

  const isTyping = comment.length > 0 || replyText.length > 0;

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
        className="absolute bottom-0 left-0 right-0 h-72 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)",
        }}
      />

      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-3 pt-3">
        {/* single progress bar since we just cycle stories */}
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
      <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6">
        {story.caption && (
          <p className="text-white/90 text-sm text-center mb-3 drop-shadow">
            {story.caption}
          </p>
        )}

        {/* Like + Share row */}
        <div className="flex items-center gap-2 mb-3">
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
          <button
            type="button"
            data-ocid="story_viewer.secondary_button"
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

        {/* Comments list */}
        {comments.length > 0 && (
          <div
            className="max-h-28 overflow-y-auto space-y-1.5 mb-2"
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
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center hidden md:flex"
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
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center hidden md:flex"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
