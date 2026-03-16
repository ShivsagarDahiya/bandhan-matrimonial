import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Heart, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Profile } from "../backend";
import { useAppActor as useActor } from "../hooks/useAppActor";
import { useSendMatchRequest, useSuperLikeUser } from "../hooks/useQueries";

interface DailySuggestionsPageProps {
  onBack: () => void;
}

const SWIPE_THRESHOLD = 80;

export default function DailySuggestionsPage({
  onBack,
}: DailySuggestionsPageProps) {
  const { actor } = useActor();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [swiped, setSwiped] = useState<"left" | "right" | "super" | null>(null);
  const startX = useRef(0);
  const sendRequest = useSendMatchRequest();
  const superLike = useSuperLikeUser();

  useEffect(() => {
    if (!actor) return;
    actor
      .getDailySuggestions()
      .then((ps) => {
        setProfiles(ps);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [actor]);

  const current = profiles[index];

  const advance = (dir: "left" | "right" | "super") => {
    setSwiped(dir);
    setTimeout(() => {
      setIndex((i) => i + 1);
      setDragX(0);
      setSwiped(null);
    }, 350);
  };

  const handleLike = async () => {
    if (!current) return;
    advance("right");
    try {
      await sendRequest.mutateAsync(current.userId);
    } catch {}
  };

  const handlePass = () => {
    if (!current) return;
    advance("left");
  };

  const handleSuperLike = async () => {
    if (!current) return;
    advance("super");
    try {
      await superLike.mutateAsync(current.userId);
    } catch {}
  };

  // Drag handling
  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    startX.current = e.clientX;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setDragX(e.clientX - startX.current);
  };
  const onMouseUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) handleLike();
    else if (dragX < -SWIPE_THRESHOLD) handlePass();
    else setDragX(0);
  };
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    setDragX(e.touches[0].clientX - startX.current);
  };
  const onTouchEnd = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) handleLike();
    else if (dragX < -SWIPE_THRESHOLD) handlePass();
    else setDragX(0);
  };

  const rotate = dragging
    ? `${(dragX / 300) * 15}deg`
    : swiped === "left"
      ? "-30deg"
      : swiped === "right"
        ? "30deg"
        : "0deg";
  const translateX = dragging
    ? dragX
    : swiped === "left"
      ? -500
      : swiped === "right"
        ? 500
        : 0;
  const opacity = swiped ? 0 : 1;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0a0010" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{
          background: "rgba(10,0,16,0.95)",
          borderBottom: "1px solid oklch(0.2 0.07 300)",
        }}
      >
        <button
          type="button"
          data-ocid="suggestions.back_button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70"
          style={{ background: "oklch(0.15 0.05 300)" }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-white font-bold text-lg">Daily Suggestions</h1>
          <p className="text-white/50 text-xs">Based on shared interests</p>
        </div>
        <div className="ml-auto text-white/40 text-sm">
          {profiles.length - index > 0 ? `${profiles.length - index} left` : ""}
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {loading ? (
          <div
            className="flex flex-col items-center gap-4"
            data-ocid="suggestions.loading_state"
          >
            <div
              className="w-12 h-12 rounded-full border-2 animate-spin"
              style={{
                borderColor: "oklch(0.3 0.1 300)",
                borderTopColor: "oklch(0.65 0.22 10)",
              }}
            />
            <p className="text-white/50 text-sm">Finding your matches...</p>
          </div>
        ) : !current ? (
          <div
            className="flex flex-col items-center gap-5 text-center"
            data-ocid="suggestions.empty_state"
          >
            <div className="text-6xl">💝</div>
            <h2 className="text-white font-bold text-xl">
              That's all for today!
            </h2>
            <p className="text-white/50 text-sm max-w-xs">
              Come back tomorrow for new suggestions. New matches refresh at
              midnight.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            {/* Card */}
            <div
              data-ocid="suggestions.card"
              className="relative rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
              style={{
                height: 480,
                transform: `translateX(${translateX}px) rotate(${rotate})`,
                opacity,
                transition: dragging
                  ? "none"
                  : "all 0.35s cubic-bezier(0.25,0.46,0.45,0.94)",
                boxShadow: "0 30px 80px rgba(0,0,0,0.8)",
                userSelect: "none",
              }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {current.photoUrl ? (
                <img
                  src={current.photoUrl}
                  alt={current.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    background: `linear-gradient(160deg,hsl(${(current.name.charCodeAt(0) * 11) % 360},60%,25%),hsl(${(current.name.charCodeAt(0) * 11 + 90) % 360},60%,10%))`,
                  }}
                >
                  <span className="text-8xl font-bold text-white/30">
                    {current.name.charAt(0)}
                  </span>
                </div>
              )}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top,rgba(0,0,0,0.9) 0%,rgba(0,0,0,0.2) 50%,transparent 100%)",
                }}
              />

              {/* Swipe indicators */}
              {dragX > 40 && (
                <div className="absolute top-8 left-8 px-4 py-2 rounded-xl border-2 border-green-400 rotate-[-15deg]">
                  <span className="text-green-400 font-black text-xl">
                    LIKE
                  </span>
                </div>
              )}
              {dragX < -40 && (
                <div className="absolute top-8 right-8 px-4 py-2 rounded-xl border-2 border-red-400 rotate-[15deg]">
                  <span className="text-red-400 font-black text-xl">PASS</span>
                </div>
              )}

              {/* Profile info */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <h2 className="text-white font-black text-2xl">
                      {current.name}, {Number(current.age)}
                    </h2>
                    <p className="text-white/70 text-sm">{current.location}</p>
                  </div>
                  {current.interests.length > 0 && (
                    <div
                      className="px-2.5 py-1 rounded-full text-xs font-bold text-amber-300"
                      style={{
                        background: "rgba(245,158,11,0.2)",
                        border: "1px solid rgba(245,158,11,0.4)",
                      }}
                    >
                      ⭐ {current.interests.length} shared
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {current.interests.slice(0, 4).map((interest) => (
                    <span
                      key={interest}
                      className="px-2.5 py-0.5 rounded-full text-xs text-white/80"
                      style={{
                        background: "rgba(124,58,237,0.3)",
                        border: "1px solid rgba(124,58,237,0.4)",
                      }}
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-5 mt-8">
              <button
                type="button"
                data-ocid="suggestions.secondary_button"
                onClick={handlePass}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "2px solid rgba(239,68,68,0.5)",
                }}
              >
                <X className="w-7 h-7 text-red-400" />
              </button>
              <button
                type="button"
                data-ocid="suggestions.toggle"
                onClick={handleSuperLike}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg"
                style={{
                  background: "rgba(245,158,11,0.15)",
                  border: "2px solid rgba(245,158,11,0.5)",
                }}
              >
                <Star className="w-6 h-6 text-amber-400" />
              </button>
              <button
                type="button"
                data-ocid="suggestions.primary_button"
                onClick={handleLike}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg"
                style={{
                  background: "rgba(225,29,72,0.15)",
                  border: "2px solid rgba(225,29,72,0.5)",
                }}
              >
                <Heart className="w-7 h-7 text-pink-500" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
