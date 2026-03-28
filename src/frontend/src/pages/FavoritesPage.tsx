import { ArrowLeft, Bookmark, MessageCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Profile } from "../backend";
import { useAllProfiles } from "../hooks/useQueries";

interface Props {
  onBack: () => void;
  onViewProfile?: (p: Profile) => void;
  onOpenChat?: (p: Profile) => void;
}

export default function FavoritesPage({
  onBack,
  onViewProfile,
  onOpenChat,
}: Props) {
  const { data: allProfiles = [], isLoading } = useAllProfiles();
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("bandhan_favorites") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const onStorage = () => {
      try {
        setFavoriteIds(
          JSON.parse(localStorage.getItem("bandhan_favorites") || "[]"),
        );
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const favorites = allProfiles.filter((p) =>
    favoriteIds.includes(p.userId.toString()),
  );

  const removeBookmark = (userId: string) => {
    const next = favoriteIds.filter((f) => f !== userId);
    setFavoriteIds(next);
    localStorage.setItem("bandhan_favorites", JSON.stringify(next));
  };

  return (
    <div className="min-h-screen pb-8" style={{ background: "#0a0010" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 pt-14 pb-4"
        style={{
          background:
            "linear-gradient(180deg,oklch(0.14 0.07 340) 0%,oklch(0.1 0.04 320) 100%)",
          borderBottom: "1px solid oklch(0.22 0.06 330 / 0.4)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          data-ocid="favorites.button"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "oklch(0.2 0.06 330)" }}
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Saved Profiles</h1>
          <p className="text-white/40 text-xs">{favorites.length} bookmarks</p>
        </div>
        <Bookmark className="w-5 h-5" style={{ color: "#f59e0b" }} />
      </div>

      <div className="px-5 pt-5 space-y-3">
        {isLoading && (
          <div
            className="flex justify-center py-12"
            data-ocid="favorites.loading_state"
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

        {!isLoading && favorites.length === 0 && (
          <div className="text-center py-20" data-ocid="favorites.empty_state">
            <p className="text-5xl mb-4">🔖</p>
            <p className="text-white/60 font-semibold">No saved profiles yet</p>
            <p className="text-white/40 text-sm mt-1">
              Tap the bookmark icon on any profile to save it
            </p>
          </div>
        )}

        {favorites.map((profile, i) => (
          <div
            key={profile.userId.toString()}
            data-ocid={`favorites.item.${i + 1}`}
            className="flex items-center gap-4 p-4 rounded-2xl transition-all"
            style={{
              background: "oklch(0.13 0.05 300)",
              border: "1px solid oklch(0.22 0.07 300)",
            }}
          >
            {/* Avatar */}
            <button
              type="button"
              onClick={() => onViewProfile?.(profile)}
              className="flex-shrink-0"
            >
              <div
                className="w-16 h-16 rounded-2xl overflow-hidden"
                style={{ border: "2px solid oklch(0.35 0.12 320)" }}
              >
                {profile.photoUrl ? (
                  <img
                    src={profile.photoUrl}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                    }}
                  >
                    {profile.name.charAt(0)}
                  </div>
                )}
              </div>
            </button>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => onViewProfile?.(profile)}
                className="text-left w-full"
              >
                <p className="text-white font-semibold truncate">
                  {profile.name}
                </p>
                <p className="text-white/50 text-xs mt-0.5">
                  {Number(profile.age)} • {profile.location}
                </p>
                {profile.interests.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {profile.interests.slice(0, 2).map((interest) => (
                      <span
                        key={interest}
                        className="text-[10px] px-2 py-0.5 rounded-full text-white"
                        style={{ background: "oklch(0.65 0.22 10 / 0.2)" }}
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              {onOpenChat && (
                <button
                  type="button"
                  onClick={() => onOpenChat(profile)}
                  data-ocid={`favorites.secondary_button.${i + 1}`}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                  }}
                >
                  <MessageCircle className="w-4 h-4 text-white" />
                </button>
              )}
              <button
                type="button"
                onClick={() => removeBookmark(profile.userId.toString())}
                data-ocid={`favorites.delete_button.${i + 1}`}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: "oklch(0.18 0.05 300)",
                  border: "1px solid oklch(0.28 0.07 300)",
                }}
              >
                <Trash2 className="w-4 h-4" style={{ color: "#fb7185" }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
