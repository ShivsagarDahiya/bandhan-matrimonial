import { MessageCircle } from "lucide-react";
import { useState } from "react";
import type { Profile } from "../backend";
import { useMutualMatches, useSuperLikedBy } from "../hooks/useQueries";

interface Props {
  onOpenChat: (p: Profile) => void;
  onViewProfile?: (p: Profile) => void;
}

function matchAnniversaryBadge(profile: Profile): string | null {
  const createdMs = Number(profile.createdAt) / 1_000_000;
  const diffMs = Date.now() - createdMs;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  // Use deterministic offset based on userId chars to simulate varied match times
  let hash = 0;
  const uid = profile.userId.toString();
  for (let i = 0; i < Math.min(uid.length, 4); i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) & 0xffff;
  }
  const simulatedDays = diffDays + (hash % 60);
  if (simulatedDays > 30) return `🎉 ${simulatedDays} days together`;
  if (simulatedDays > 7) return `❤️ ${simulatedDays} days matched`;
  return null;
}

export default function MatchesPage({ onOpenChat, onViewProfile }: Props) {
  const { data: matches = [], isLoading } = useMutualMatches();
  const { data: superLikedBy = [] } = useSuperLikedBy();
  const [superLikedExpanded, setSuperLikedExpanded] = useState(true);

  return (
    <div className="min-h-screen pt-14 pb-4" style={{ background: "#0a0010" }}>
      <div className="px-5 py-4">
        <h1 className="text-2xl font-bold text-white">Your Matches</h1>
        <p className="text-white/50 text-sm mt-1">
          {matches.length} mutual matches
        </p>
      </div>

      {/* Super Liked You section */}
      {superLikedBy.length > 0 && (
        <div className="px-5 mb-4">
          <button
            type="button"
            onClick={() => setSuperLikedExpanded((v) => !v)}
            data-ocid="matches.toggle"
            className="w-full flex items-center justify-between p-3 rounded-2xl transition-all active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg,oklch(0.18 0.1 60 / 0.3),oklch(0.18 0.08 300 / 0.3))",
              border: "1px solid oklch(0.35 0.12 60 / 0.3)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <span className="text-white font-semibold text-sm">
                Super Liked You
              </span>
              <span
                className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                style={{
                  background: "linear-gradient(135deg,#f59e0b,#d97706)",
                }}
              >
                {superLikedBy.length}
              </span>
            </div>
            <span className="text-white/50 text-sm">
              {superLikedExpanded ? "▲" : "▼"}
            </span>
          </button>
          {superLikedExpanded && (
            <div className="mt-3 space-y-2">
              {superLikedBy.map((profile, i) => (
                <div
                  key={profile.userId.toString()}
                  data-ocid={`matches.item.${i + 1}`}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: "oklch(0.13 0.05 300)" }}
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden"
                      style={{ border: "2px solid", borderColor: "#f59e0b" }}
                    >
                      {profile.photoUrl ? (
                        <img
                          src={profile.photoUrl}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-white font-bold"
                          style={{
                            background:
                              "linear-gradient(135deg,#f59e0b,#d97706)",
                          }}
                        >
                          {profile.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 text-xs">
                      ⭐
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">
                      {profile.name}
                    </p>
                    <p className="text-white/50 text-xs">
                      {Number(profile.age)} • {profile.location}
                    </p>
                  </div>
                  {onViewProfile && (
                    <button
                      type="button"
                      onClick={() => onViewProfile(profile)}
                      data-ocid={`matches.secondary_button.${i + 1}`}
                      className="px-3 py-1.5 rounded-xl text-xs text-white font-medium flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg,#f59e0b,#d97706)",
                      }}
                    >
                      View
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div
          className="flex justify-center py-12"
          data-ocid="matches.loading_state"
        >
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{
              borderColor: "oklch(0.65 0.22 10/0.3)",
              borderTopColor: "oklch(0.65 0.22 10)",
            }}
          />
        </div>
      )}
      {!isLoading && matches.length === 0 && superLikedBy.length === 0 && (
        <div className="text-center py-16" data-ocid="matches.empty_state">
          <p className="text-5xl mb-4">⭐</p>
          <p className="text-white/60 font-medium">No matches yet</p>
          <p className="text-white/40 text-sm mt-1">Keep exploring!</p>
        </div>
      )}
      <div className="px-5 grid grid-cols-2 gap-3">
        {matches.map((profile, i) => {
          const badge = matchAnniversaryBadge(profile);
          return (
            <div key={profile.userId.toString()}>
              <div
                data-ocid={`matches.item.${i + 1}`}
                className="rounded-2xl overflow-hidden"
                style={{ background: "oklch(0.13 0.05 300)" }}
              >
                <div className="relative h-48">
                  {profile.photoUrl ? (
                    <img
                      src={profile.photoUrl}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-4xl font-bold text-white"
                      style={{
                        background: "linear-gradient(160deg,#e11d48,#7c3aed)",
                      }}
                    >
                      {profile.name.charAt(0)}
                    </div>
                  )}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top,rgba(10,0,16,0.8) 0%,transparent 60%)",
                    }}
                  />
                  <div className="absolute bottom-2 left-3">
                    <p className="text-white font-semibold text-sm">
                      {profile.name}
                    </p>
                    <p className="text-white/60 text-xs">
                      {Number(profile.age)} • {profile.location}
                    </p>
                  </div>
                </div>
                <div className="p-3">
                  {profile.interests.slice(0, 2).map((interest) => (
                    <span
                      key={interest}
                      className="text-xs px-2 py-0.5 rounded-full text-white mr-1 mb-1 inline-block"
                      style={{ background: "oklch(0.65 0.22 10 / 0.2)" }}
                    >
                      {interest}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => onOpenChat(profile)}
                    data-ocid={`matches.secondary_button.${i + 1}`}
                    className="w-full mt-2 h-8 rounded-xl flex items-center justify-center gap-2 text-xs text-white font-medium"
                    style={{
                      background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                    }}
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Chat
                  </button>
                </div>
              </div>
              {/* Anniversary badge */}
              {badge && (
                <div
                  className="mt-1.5 mx-1 px-3 py-1 rounded-full text-center text-[11px] font-semibold text-white"
                  style={{
                    background: badge.startsWith("🎉")
                      ? "linear-gradient(135deg,#f59e0b,#d97706)"
                      : "linear-gradient(135deg,#e11d48 0%,#7c3aed 100%)",
                    opacity: 0.9,
                  }}
                >
                  {badge}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
