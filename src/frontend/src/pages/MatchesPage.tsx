import { MessageCircle } from "lucide-react";
import type { Profile } from "../backend";
import { useMutualMatches } from "../hooks/useQueries";

interface Props {
  onOpenChat: (p: Profile) => void;
}

export default function MatchesPage({ onOpenChat }: Props) {
  const { data: matches = [], isLoading } = useMutualMatches();

  return (
    <div className="min-h-screen pt-14 pb-4" style={{ background: "#0a0010" }}>
      <div className="px-5 py-4">
        <h1 className="text-2xl font-bold text-white">Your Matches</h1>
        <p className="text-white/50 text-sm mt-1">
          {matches.length} mutual matches
        </p>
      </div>
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
      {!isLoading && matches.length === 0 && (
        <div className="text-center py-16" data-ocid="matches.empty_state">
          <p className="text-5xl mb-4">⭐</p>
          <p className="text-white/60 font-medium">No matches yet</p>
          <p className="text-white/40 text-sm mt-1">Keep exploring!</p>
        </div>
      )}
      <div className="px-5 grid grid-cols-2 gap-3">
        {matches.map((profile, i) => (
          <div
            key={profile.userId.toString()}
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
              {profile.interests.slice(0, 2).map((i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full text-white mr-1 mb-1 inline-block"
                  style={{ background: "oklch(0.65 0.22 10 / 0.2)" }}
                >
                  {i}
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
        ))}
      </div>
    </div>
  );
}
