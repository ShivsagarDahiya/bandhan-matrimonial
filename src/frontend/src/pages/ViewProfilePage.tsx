import {
  ArrowLeft,
  Film,
  GraduationCap,
  Heart,
  MessageCircle,
  Music,
  Phone,
  Video,
} from "lucide-react";
import { useState } from "react";
import type { Profile } from "../backend";
import { useSendMatchRequest } from "../hooks/useQueries";

interface Props {
  profile: Profile;
  onBack: () => void;
  onChat: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
}

export default function ViewProfilePage({
  profile,
  onBack,
  onChat,
  onVoiceCall,
  onVideoCall,
}: Props) {
  const sendRequest = useSendMatchRequest();
  const [liked, setLiked] = useState(false);
  const [mediaIdx, setMediaIdx] = useState(0);

  const allMedia = [profile.photoUrl, ...profile.mediaUrls].filter(
    Boolean,
  ) as string[];

  const handleLike = async () => {
    if (liked) return;
    try {
      await sendRequest.mutateAsync(profile.userId);
      setLiked(true);
    } catch {}
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0a0010" }}
    >
      {/* Hero */}
      <div className="relative h-[55vh] flex-shrink-0">
        {allMedia.length > 0 ? (
          <img
            src={allMedia[mediaIdx]}
            alt={profile.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(160deg,#e11d48,#7c3aed)" }}
          >
            <span className="text-8xl font-bold text-white">
              {profile.name.charAt(0)}
            </span>
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, #0a0010 30%, transparent 70%)",
          }}
        />
        {/* Media dots */}
        {allMedia.length > 1 && (
          <div className="absolute top-4 left-0 right-0 flex justify-center gap-1">
            {allMedia.map((mediaUrl, i) => (
              <button
                key={mediaUrl || String(i)}
                type="button"
                onClick={() => setMediaIdx(i)}
                data-ocid="profile.toggle"
                className="h-1 rounded-full transition-all"
                style={{
                  width: i === mediaIdx ? 24 : 8,
                  background: i === mediaIdx ? "white" : "white/40",
                }}
              />
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={onBack}
          data-ocid="viewprofile.button"
          className="absolute top-12 left-4 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="absolute bottom-4 left-5 right-5">
          <h1 className="text-3xl font-bold text-white">
            {profile.name}, {Number(profile.age)}
          </h1>
          <p className="text-white/70 text-sm mt-0.5">📍 {profile.location}</p>
          {profile.occupation && (
            <p className="text-white/60 text-xs mt-0.5">
              💼 {profile.occupation}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Height", value: profile.height },
            { label: "Religion", value: profile.religion },
            { label: "Mother Tongue", value: profile.motherTongue },
            { label: "Marital Status", value: profile.maritalStatus },
            { label: "Education", value: profile.education },
            { label: "Mood", value: profile.mood },
          ]
            .filter((s) => s.value)
            .map((s) => (
              <div
                key={s.label}
                className="rounded-xl px-3 py-2.5"
                style={{ background: "oklch(0.15 0.05 300)" }}
              >
                <p className="text-white/40 text-[10px]">{s.label}</p>
                <p className="text-white text-xs font-medium mt-0.5 truncate">
                  {s.value}
                </p>
              </div>
            ))}
        </div>

        {/* Bio */}
        {profile.bio && <Section title="About">{profile.bio}</Section>}
        {profile.aboutMe && profile.aboutMe !== profile.bio && (
          <Section title="More About Me">{profile.aboutMe}</Section>
        )}
        {profile.thoughts && (
          <Section title="Life Philosophy">"{profile.thoughts}"</Section>
        )}

        {/* Interests */}
        {profile.interests.length > 0 && (
          <div>
            <SectionTitle>Interests</SectionTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.interests.map((i) => (
                <Tag key={i} grad="135deg,#e11d48,#7c3aed">
                  {i}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* Hobbies */}
        {profile.hobbies.length > 0 && (
          <div>
            <SectionTitle>Hobbies</SectionTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.hobbies.map((h) => (
                <Tag key={h} grad="135deg,#7c3aed,#2563eb">
                  {h}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* Movies & Songs */}
        {profile.favoriteMovies.length > 0 && (
          <div>
            <SectionTitle>
              <Film className="w-4 h-4 inline mr-1" />
              Favorite Movies
            </SectionTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.favoriteMovies.map((m) => (
                <Tag key={m} grad="135deg,#e11d48 0%,#db2777 100%">
                  {m}
                </Tag>
              ))}
            </div>
          </div>
        )}
        {profile.favoriteSongs.length > 0 && (
          <div>
            <SectionTitle>
              <Music className="w-4 h-4 inline mr-1" />
              Favorite Songs
            </SectionTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.favoriteSongs.map((s) => (
                <Tag key={s} grad="135deg,#7c3aed,#4f46e5">
                  {s}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* Media gallery */}
        {profile.mediaUrls.length > 0 && (
          <div>
            <SectionTitle>Gallery</SectionTitle>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {profile.mediaUrls.filter(Boolean).map((url, i) => (
                <div
                  key={url || `media-${i}`}
                  className="aspect-square rounded-xl overflow-hidden"
                >
                  <img
                    src={url}
                    alt={`media ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-28" />
      </div>

      {/* Action bar */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 py-4 flex items-center gap-3"
        style={{
          background: "linear-gradient(to top, #0a0010 70%, transparent)",
          backdropFilter: "blur(4px)",
        }}
      >
        <button
          type="button"
          onClick={onVoiceCall}
          data-ocid="viewprofile.secondary_button"
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: "oklch(0.18 0.05 300)",
            border: "1px solid oklch(0.3 0.07 300)",
          }}
        >
          <Phone className="w-5 h-5 text-white" />
        </button>
        <button
          type="button"
          onClick={onVideoCall}
          data-ocid="viewprofile.secondary_button"
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: "oklch(0.18 0.05 300)",
            border: "1px solid oklch(0.3 0.07 300)",
          }}
        >
          <Video className="w-5 h-5 text-white" />
        </button>
        <button
          type="button"
          onClick={handleLike}
          disabled={liked || sendRequest.isPending}
          data-ocid="viewprofile.primary_button"
          className="flex-1 h-12 rounded-full flex items-center justify-center gap-2 text-white font-semibold transition-all active:scale-95"
          style={
            liked
              ? { background: "oklch(0.3 0.08 10)" }
              : { background: "linear-gradient(135deg,#e11d48,#7c3aed)" }
          }
        >
          <Heart
            className={`w-5 h-5 ${liked ? "fill-red-400 text-red-400" : ""}`}
          />
          {liked ? "Request Sent" : "Send Heart"}
        </button>
        <button
          type="button"
          onClick={onChat}
          data-ocid="viewprofile.secondary_button"
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)" }}
        >
          <MessageCircle className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "oklch(0.13 0.05 300)" }}
    >
      <p className="text-white/50 text-xs uppercase tracking-wider mb-2">
        {title}
      </p>
      <p className="text-white/90 text-sm leading-relaxed">{children}</p>
    </div>
  );
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-white/70 text-sm font-semibold uppercase tracking-wider">
      {children}
    </h3>
  );
}
function Tag({ children, grad }: { children: React.ReactNode; grad: string }) {
  return (
    <span
      className="px-3 py-1.5 rounded-full text-white text-sm font-medium"
      style={{ background: `linear-gradient(${grad})` }}
    >
      {children}
    </span>
  );
}
