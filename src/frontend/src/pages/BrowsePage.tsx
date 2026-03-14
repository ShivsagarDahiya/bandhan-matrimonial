import { Input } from "@/components/ui/input";
import { Heart, Search, X } from "lucide-react";
import { useState } from "react";
import type { Profile } from "../backend";
import {
  useAllProfiles,
  useCallerProfile,
  useSendMatchRequest,
} from "../hooks/useQueries";
import { playMatchSentSound } from "../hooks/useSound";

interface Props {
  onViewProfile: (p: Profile) => void;
}

// Deterministically marks first ~30% of profiles as premium based on name hash
function isPremiumProfile(p: Profile): boolean {
  let hash = 0;
  for (let i = 0; i < p.name.length; i++) {
    hash = (hash * 31 + p.name.charCodeAt(i)) & 0xffff;
  }
  return hash % 3 === 0;
}

export default function BrowsePage({ onViewProfile }: Props) {
  const { data: allProfiles = [], isLoading } = useAllProfiles();
  const { data: myProfile } = useCallerProfile();
  const sendRequest = useSendMatchRequest();
  const [searchTerm, setSearchTerm] = useState("");

  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const myId = myProfile?.userId.toString();
  const filtered = allProfiles.filter((p) => {
    if (p.userId.toString() === myId) return false;
    if (liked.has(p.userId.toString()) || skipped.has(p.userId.toString()))
      return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(s) ||
        p.location.toLowerCase().includes(s) ||
        p.religion.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const currentProfile = filtered[0];

  const handleLike = async (p: Profile) => {
    setLiked((prev) => new Set([...prev, p.userId.toString()]));
    playMatchSentSound();
    try {
      await sendRequest.mutateAsync(p.userId);
    } catch {}
  };

  const handleSkip = (p: Profile) => {
    setSkipped((prev) => new Set([...prev, p.userId.toString()]));
  };

  return (
    <div className="min-h-screen pb-4" style={{ background: "#0a0010" }}>
      {/* Auto-scroll keyframe */}
      <style>{`
        @keyframes scroll-rtl {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .browse-scroll-track {
          animation: scroll-rtl 18s linear infinite;
        }
        .browse-scroll-track:hover,
        .browse-scroll-track:active {
          animation-play-state: paused;
        }
      `}</style>

      <div className="px-5 pt-14 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Discover</h1>
          <p className="text-white/50 text-xs mt-0.5">
            {filtered.length} people nearby
          </p>
        </div>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
        >
          <span className="text-white text-lg">💍</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 mb-4 relative">
        <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, location..."
          data-ocid="browse.search_input"
          className="pl-10 h-10 rounded-2xl text-sm"
          style={{
            background: "oklch(0.15 0.05 300)",
            border: "1px solid oklch(0.25 0.06 300)",
            color: "white",
          }}
        />
      </div>

      {isLoading && (
        <div
          className="flex justify-center py-20"
          data-ocid="browse.loading_state"
        >
          <button
            type="button"
            className="w-10 h-10 rounded-full border-2 animate-spin"
            style={{
              borderColor: "oklch(0.65 0.22 10/0.3)",
              borderTopColor: "oklch(0.65 0.22 10)",
            }}
          />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 px-8" data-ocid="browse.empty_state">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-white/60 font-medium">No profiles found</p>
          <p className="text-white/40 text-sm mt-1">
            Try adjusting your search
          </p>
        </div>
      )}

      {!isLoading && currentProfile && (
        <div className="px-5">
          {/* Card */}
          <button
            type="button"
            onKeyDown={(e) =>
              e.key === "Enter" && onViewProfile(currentProfile)
            }
            className="relative rounded-3xl overflow-hidden mb-4 w-full text-left cursor-pointer active:scale-[0.98] transition-transform"
            style={{
              height: "55vh",
              boxShadow: "0 20px 60px rgba(225,29,72,0.2)",
            }}
            onClick={() => onViewProfile(currentProfile)}
            data-ocid="browse.card"
          >
            {currentProfile.photoUrl ? (
              <img
                src={currentProfile.photoUrl}
                alt={currentProfile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-8xl font-bold text-white"
                style={{
                  background: `linear-gradient(160deg,hsl(${(currentProfile.name.charCodeAt(0) * 10) % 360},70%,35%),hsl(${(currentProfile.name.charCodeAt(0) * 10 + 120) % 360},70%,25%))`,
                }}
              >
                {currentProfile.name.charAt(0)}
              </div>
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top,rgba(10,0,16,0.95) 0%,transparent 60%)",
              }}
            />
            {/* Premium badge */}
            {isPremiumProfile(currentProfile) && (
              <div
                className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{
                  background: "linear-gradient(135deg,#f59e0b,#d97706)",
                  boxShadow: "0 2px 10px rgba(245,158,11,0.5)",
                }}
              >
                <span>👑</span>
                <span className="text-white">Premium</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h2 className="text-2xl font-bold text-white">
                {currentProfile.name}, {Number(currentProfile.age)}
              </h2>
              <p className="text-white/70 text-sm mt-0.5">
                📍 {currentProfile.location}
              </p>
              {currentProfile.occupation && (
                <p className="text-white/50 text-xs mt-0.5">
                  💼 {currentProfile.occupation}
                </p>
              )}
              {currentProfile.interests.length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {currentProfile.interests.slice(0, 3).map((i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full text-xs text-white font-medium"
                      style={{
                        background: "oklch(0.65 0.22 10 / 0.3)",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      {i}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </button>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => handleSkip(currentProfile)}
              data-ocid="browse.secondary_button"
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                background: "oklch(0.18 0.05 300)",
                border: "2px solid oklch(0.3 0.06 300)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              }}
            >
              <X className="w-6 h-6 text-white/60" />
            </button>
            <button
              type="button"
              onClick={() => onViewProfile(currentProfile)}
              data-ocid="browse.button"
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: "oklch(0.18 0.05 300)",
                border: "1px solid oklch(0.28 0.06 300)",
              }}
            >
              <span className="text-xl">👁</span>
            </button>
            <button
              type="button"
              onClick={() => handleLike(currentProfile)}
              data-ocid="browse.primary_button"
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                boxShadow: "0 8px 24px oklch(0.65 0.22 10 / 0.5)",
              }}
            >
              <Heart className="w-6 h-6 text-white fill-white" />
            </button>
          </div>

          {/* More profiles - auto-scrolling horizontal strip */}
          {filtered.length > 1 && (
            <div className="mt-5">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-3">
                More Profiles
              </p>
              {/* Overflow container */}
              <div
                className="overflow-hidden"
                style={{
                  WebkitMaskImage:
                    "linear-gradient(to right,transparent,black 8%,black 92%,transparent)",
                }}
              >
                {/* Scrolling track — duplicated for seamless loop */}
                <div
                  className="browse-scroll-track flex gap-2"
                  style={{ width: "max-content" }}
                >
                  {[...filtered.slice(1, 9), ...filtered.slice(1, 9)].map(
                    (p, i) => (
                      <button
                        key={`${p.userId.toString()}_${i}`}
                        type="button"
                        onClick={() => onViewProfile(p)}
                        data-ocid={`browse.item.${(i % 8) + 1}`}
                        className="relative rounded-2xl overflow-hidden flex-shrink-0 active:scale-95 transition-transform"
                        style={{ width: 110, height: 146 }}
                      >
                        {p.photoUrl ? (
                          <img
                            src={p.photoUrl}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                            style={{
                              background: `linear-gradient(160deg,hsl(${(p.name.charCodeAt(0) * 10) % 360},70%,35%),hsl(${(p.name.charCodeAt(0) * 10 + 120) % 360},70%,25%))`,
                            }}
                          >
                            {p.name.charAt(0)}
                          </div>
                        )}
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(to top,rgba(10,0,16,0.85) 0%,transparent 55%)",
                          }}
                        />
                        {isPremiumProfile(p) && (
                          <div
                            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{
                              background:
                                "linear-gradient(135deg,#f59e0b,#d97706)",
                              boxShadow: "0 1px 6px rgba(245,158,11,0.6)",
                              fontSize: "10px",
                            }}
                          >
                            👑
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2">
                          <p className="text-white text-xs font-semibold truncate max-w-[90px]">
                            {p.name}
                          </p>
                          <p className="text-white/60 text-[10px]">
                            {Number(p.age)}
                          </p>
                        </div>
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
