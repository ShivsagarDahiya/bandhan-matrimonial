import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Film,
  GraduationCap,
  Heart,
  MessageCircle,
  Music,
  Phone,
  Share2,
  Star,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Profile } from "../backend";
import GalleryLightbox from "../components/GalleryLightbox";
import StoryViewerModal from "../components/StoryViewerModal";
import {
  useCallerProfile,
  useHasSuperLiked,
  useRecordProfileView,
  useSendMatchRequest,
  useStories,
  useSuperLikeUser,
  useUnsuperLikeUser,
} from "../hooks/useQueries";

const ZODIACS = [
  "♈",
  "♉",
  "♊",
  "♋",
  "♌",
  "♍",
  "♎",
  "♏",
  "♐",
  "♑",
  "♒",
  "♓",
];

interface Props {
  profile: Profile;
  onBack: () => void;
  onChat: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
}

interface IcebreakerEntry {
  q: string;
  a: string;
}

// --- Compatibility Score Component ---
function CompatibilityScore({
  myProfile,
  theirProfile,
}: { myProfile: Profile; theirProfile: Profile }) {
  const sharedInterests = theirProfile.interests.filter((i) =>
    myProfile.interests.includes(i),
  ).length;
  const maxInterests = Math.max(
    theirProfile.interests.length,
    myProfile.interests.length,
    1,
  );
  const interestScore = Math.min(sharedInterests / maxInterests, 1) * 40;
  const religionScore =
    myProfile.religion &&
    theirProfile.religion &&
    myProfile.religion.toLowerCase() === theirProfile.religion.toLowerCase()
      ? 20
      : 0;
  const cityScore =
    myProfile.location &&
    theirProfile.location &&
    myProfile.location.toLowerCase().split(",")[0].trim() ===
      theirProfile.location.toLowerCase().split(",")[0].trim()
      ? 20
      : 0;
  const ageDiff = Math.abs(Number(myProfile.age) - Number(theirProfile.age));
  const ageScore = ageDiff <= 5 ? 20 : ageDiff <= 10 ? 10 : 0;
  const score = Math.round(
    interestScore + religionScore + cityScore + ageScore,
  );

  const [animatedScore, setAnimatedScore] = useState(0);
  const frameRef = useRef<number | null>(null);
  useEffect(() => {
    let start: number | null = null;
    const duration = 1000;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      setAnimatedScore(Math.round(progress * score));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [score]);

  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference * (1 - animatedScore / 100);
  const label =
    score >= 80
      ? "Excellent Match"
      : score >= 60
        ? "Great Match"
        : score >= 40
          ? "Good Match"
          : "Potential Match";

  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4"
      style={{ background: "oklch(0.13 0.05 300)" }}
    >
      <div className="relative w-20 h-20 flex-shrink-0">
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          aria-label="Compatibility score ring"
          role="img"
        >
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="oklch(0.2 0.05 300)"
            strokeWidth="6"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="url(#compatGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "center",
              transition: "stroke-dashoffset 0.05s linear",
            }}
          />
          <defs>
            <linearGradient id="compatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-lg">{animatedScore}%</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="font-bold text-base"
          style={{
            background: "linear-gradient(135deg,#e11d48,#7c3aed)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Compatibility
        </p>
        <p className="text-white/70 text-sm mt-0.5">{label}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {religionScore > 0 && <ScorePill label="Same Religion" />}
          {cityScore > 0 && <ScorePill label="Same City" />}
          {ageScore === 20 && <ScorePill label="Similar Age" />}
          {sharedInterests > 0 && (
            <ScorePill label={`${sharedInterests} shared interests`} />
          )}
        </div>
      </div>
    </div>
  );
}

function ScorePill({ label }: { label: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] text-white font-medium"
      style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
    >
      {label}
    </span>
  );
}

function ShareButton({ profile }: { profile: Profile }) {
  const [copied, setCopied] = useState(false);
  const handleShare = async () => {
    const url = `${window.location.origin}?profile=${profile.userId.toString()}`;
    const shareData = {
      title: profile.name,
      text: `Check out ${profile.name}'s profile on Bandhan`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={handleShare}
      data-ocid="viewprofile.secondary_button"
      className="w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all active:scale-90 relative"
      style={{
        background: "oklch(0.18 0.05 300)",
        border: "1px solid oklch(0.3 0.07 300)",
      }}
    >
      <Share2 className="w-5 h-5 text-white" />
      {copied && (
        <span
          className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] text-white px-2 py-0.5 rounded-full whitespace-nowrap"
          style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
        >
          Copied!
        </span>
      )}
    </button>
  );
}

export default function ViewProfilePage({
  profile,
  onBack,
  onChat,
  onVoiceCall,
  onVideoCall,
}: Props) {
  const sendRequest = useSendMatchRequest();
  const recordProfileView = useRecordProfileView();
  const superLikeMutation = useSuperLikeUser();
  const unsuperLikeMutation = useUnsuperLikeUser();
  const { data: hasSuperLikedData = false } = useHasSuperLiked(profile.userId);
  const { data: myProfile } = useCallerProfile();
  const { data: allStories = [] } = useStories();
  const [liked, setLiked] = useState(false);
  const [superLiked, setSuperLiked] = useState(false);
  const [mediaIdx, setMediaIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);

  // New feature states from localStorage
  const [theirMood, setTheirMood] = useState("");
  const [theirGoal, setTheirGoal] = useState("");
  const [theirIcebreakers, setTheirIcebreakers] = useState<IcebreakerEntry[]>(
    [],
  );

  useEffect(() => {
    const uid = profile.userId.toString();
    setTheirMood(localStorage.getItem(`bandhan_mood_${uid}`) || "");
    setTheirGoal(localStorage.getItem(`bandhan_goal_${uid}`) || "");
    try {
      const ib = localStorage.getItem(`bandhan_icebreakers_${uid}`);
      if (ib) setTheirIcebreakers(JSON.parse(ib));
      else setTheirIcebreakers([]);
    } catch {
      setTheirIcebreakers([]);
    }
  }, [profile.userId]);

  // Zodiac from age
  const zodiac = ZODIACS[Number(profile.age) % 12];
  const showBirthdayFlag =
    Number(profile.age) >= 22 && Number(profile.age) <= 28;

  // Fallback: derive mood from interests count if not set
  const derivedMood =
    profile.interests.length > 5 ? "💍 Ready for marriage" : "🌟 Exploring";
  const displayMood = theirMood || derivedMood;

  useEffect(() => {
    setSuperLiked(hasSuperLikedData);
  }, [hasSuperLikedData]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: fire-once on mount
  useEffect(() => {
    recordProfileView.mutate(profile.userId);
  }, [profile.userId]);

  const mutualInterests = myProfile
    ? profile.interests.filter((i) => myProfile.interests.includes(i))
    : [];

  const profileHighlights = allStories.filter((s) => {
    if (s.userId.toString() !== profile.userId.toString()) return false;
    try {
      const key = `story_highlights_${s.userId.toString()}`;
      const stored = localStorage.getItem(key);
      if (!stored) return false;
      const ids: string[] = JSON.parse(stored);
      return ids.includes(s.id.toString());
    } catch {
      return false;
    }
  });

  const handleSuperLike = async () => {
    try {
      if (superLiked) {
        await unsuperLikeMutation.mutateAsync(profile.userId);
        setSuperLiked(false);
      } else {
        await superLikeMutation.mutateAsync(profile.userId);
        setSuperLiked(true);
      }
    } catch {}
  };

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

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0a0010" }}
    >
      {/* Hero */}
      <div className="relative h-[55vh] flex-shrink-0">
        {allMedia.length > 0 ? (
          <button
            type="button"
            className="w-full h-full cursor-pointer"
            onClick={() => openLightbox(mediaIdx)}
            data-ocid="viewprofile.canvas_target"
          >
            <img
              src={allMedia[mediaIdx]}
              alt={profile.name}
              className="w-full h-full object-cover"
            />
          </button>
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
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to top, #0a0010 30%, transparent 70%)",
          }}
        />
        {allMedia.length > 1 && (
          <div className="absolute top-4 left-0 right-0 flex justify-center gap-1">
            {allMedia.map((mediaUrl, i) => (
              <button
                key={mediaUrl || String(i)}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMediaIdx(i);
                }}
                data-ocid="profile.toggle"
                className="h-1 rounded-full transition-all"
                style={{
                  width: i === mediaIdx ? 24 : 8,
                  background:
                    i === mediaIdx ? "white" : "rgba(255,255,255,0.4)",
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
        <div className="absolute bottom-4 left-5 right-5 pointer-events-none">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold text-white">
              {profile.name}, {Number(profile.age)}
            </h1>
            <span className="text-2xl" title="Zodiac sign">
              {zodiac}
            </span>
          </div>
          <p className="text-white/70 text-sm mt-0.5">📍 {profile.location}</p>
          {profile.occupation && (
            <p className="text-white/60 text-xs mt-0.5">
              💼 {profile.occupation}
            </p>
          )}
          {showBirthdayFlag && (
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs text-white font-semibold mt-1.5 mr-1.5"
              style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
            >
              🎂 Birthday coming up!
            </span>
          )}
          {theirGoal && (
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs text-white font-semibold mt-1.5 mr-1.5"
              style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)" }}
            >
              💍 {theirGoal}
            </span>
          )}
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs text-white mt-1.5"
            style={{
              background: "oklch(0.65 0.22 10 / 0.5)",
              backdropFilter: "blur(4px)",
            }}
          >
            {displayMood}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {myProfile &&
          myProfile.userId.toString() !== profile.userId.toString() && (
            <CompatibilityScore myProfile={myProfile} theirProfile={profile} />
          )}

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
          <Section title="Life Philosophy">
            &ldquo;{profile.thoughts}&rdquo;
          </Section>
        )}

        {/* Icebreakers from local storage */}
        {theirIcebreakers.some((ib) => ib.q && ib.a) && (
          <div>
            <SectionTitle>🧠 Icebreakers</SectionTitle>
            <div className="space-y-2 mt-2">
              {theirIcebreakers
                .filter((ib) => ib.q && ib.a)
                .map((ib, i) => (
                  <div
                    key={ib.q || String(i)}
                    className="rounded-2xl p-4"
                    style={{
                      background: "oklch(0.14 0.05 300)",
                      border: "1px solid oklch(0.22 0.07 300)",
                    }}
                  >
                    <p className="text-white/50 text-xs mb-1">{ib.q}</p>
                    <p className="text-white text-sm font-medium">{ib.a}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Mutual Interests Badge */}
        {mutualInterests.length > 0 && (
          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{
              background:
                "linear-gradient(135deg,oklch(0.18 0.08 10 / 0.4),oklch(0.18 0.08 280 / 0.4))",
              border: "1px solid oklch(0.35 0.12 10 / 0.4)",
            }}
          >
            <span className="text-2xl">💞</span>
            <div>
              <p className="text-white font-semibold text-sm">
                {mutualInterests.length} mutual interest
                {mutualInterests.length > 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {mutualInterests.map((i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full text-xs text-white font-medium"
                    style={{
                      background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                    }}
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Story Highlights */}
        {profileHighlights.length > 0 && (
          <div>
            <SectionTitle>Highlights</SectionTitle>
            <div className="flex gap-3 mt-2 overflow-x-auto pb-1">
              {profileHighlights.map((story, i) => (
                <button
                  key={story.id.toString()}
                  type="button"
                  data-ocid={`viewprofile.item.${i + 1}`}
                  onClick={() => {
                    const idx = allStories.findIndex((s) => s.id === story.id);
                    setStoryViewerIndex(idx >= 0 ? idx : 0);
                    setStoryViewerOpen(true);
                  }}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5"
                >
                  <div
                    className="w-14 h-14 rounded-full overflow-hidden"
                    style={{ border: "2px solid", borderColor: "#e11d48" }}
                  >
                    <img
                      src={story.imageUrl}
                      alt={story.caption}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-white/50 text-[9px] truncate w-14 text-center">
                    {story.caption || "Story"}
                  </span>
                </button>
              ))}
            </div>
          </div>
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
                <button
                  key={url || `media-${i}`}
                  type="button"
                  data-ocid={`viewprofile.item.${i + 1}`}
                  onClick={() => openLightbox(i + 1)}
                  className="aspect-square rounded-xl overflow-hidden active:scale-95 transition-transform"
                >
                  <img
                    src={url}
                    alt={`media ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
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
          onClick={handleSuperLike}
          disabled={
            superLikeMutation.isPending || unsuperLikeMutation.isPending
          }
          data-ocid="viewprofile.secondary_button"
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: superLiked
              ? "linear-gradient(135deg,#f59e0b,#d97706)"
              : "oklch(0.18 0.05 300)",
            border: superLiked ? "none" : "1px solid oklch(0.3 0.07 300)",
            boxShadow: superLiked
              ? "0 4px 16px rgba(245,158,11,0.5)"
              : undefined,
          }}
        >
          <Star
            className={`w-5 h-5 ${superLiked ? "fill-white text-white" : "text-yellow-400"}`}
          />
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
        <ShareButton profile={profile} />
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

      {lightboxOpen && allMedia.length > 0 && (
        <GalleryLightbox
          images={allMedia}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
      {storyViewerOpen && allStories.length > 0 && (
        <StoryViewerModal
          stories={allStories}
          initialIndex={storyViewerIndex}
          onClose={() => setStoryViewerOpen(false)}
        />
      )}
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
