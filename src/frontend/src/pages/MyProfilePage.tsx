import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera,
  Crown,
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogOut,
  PhoneCall,
  Rocket,
  Save,
  Shield,
  Star,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Gender } from "../backend";
import GalleryLightbox from "../components/GalleryLightbox";
import StoryViewerModal from "../components/StoryViewerModal";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCallerProfile,
  useCreateProfile,
  usePremiumStatus,
  usePrivacyVisibility,
  useProfileViewCount,
  useProfileViewers,
  useSetPremiumStatus,
  useSetPrivacyVisibility,
  useSetShowLastActive,
  useShowLastActive,
  useStories,
  useSuperLikedBy,
} from "../hooks/useQueries";
import type { PrivacyVisibility } from "../hooks/useQueries";
import { useStorageUpload } from "../hooks/useStorageUpload";

const INTERESTS_LIST = [
  "Travel",
  "Music",
  "Cooking",
  "Reading",
  "Fitness",
  "Photography",
  "Art",
  "Movies",
  "Sports",
  "Dancing",
  "Yoga",
  "Gaming",
  "Nature",
  "Fashion",
  "Technology",
];
const HOBBIES_LIST = [
  "Painting",
  "Gardening",
  "Cycling",
  "Swimming",
  "Hiking",
  "Writing",
  "Singing",
  "Guitar",
  "Chess",
  "Baking",
  "Crafting",
  "Meditation",
  "Running",
  "Volunteering",
  "Blogging",
];

const MOOD_OPTIONS = [
  "💕 Looking for love",
  "🌟 Exploring",
  "💍 Ready for marriage",
  "🌸 Just joined",
];

const ICEBREAKER_QUESTIONS = [
  "My love language is...",
  "A perfect date looks like...",
  "I\u2019m passionate about...",
  "The way to my heart is...",
  "My guilty pleasure is...",
];

const GOAL_OPTIONS = [
  "Marriage",
  "Long-term relationship",
  "Friendship",
  "Still figuring out",
];

const UI_TO_BACKEND: Record<string, PrivacyVisibility> = {
  everyone: "everyone",
  matches: "matchesOnly",
  hidden: "hidden",
};
const BACKEND_TO_UI: Record<string, string> = {
  everyone: "everyone",
  matchesOnly: "matches",
  hidden: "hidden",
};

type VisibilityOption = "everyone" | "matches" | "hidden";

interface IcebreakerEntry {
  q: string;
  a: string;
}

interface MyProfilePageProps {
  onCallHistory?: () => void;
  onGoLive?: () => void;
  onSuggestions?: () => void;
  onGiftHistory?: () => void;
}
export default function MyProfilePage({
  onCallHistory,
  onGoLive,
  onSuggestions,
  onGiftHistory,
}: MyProfilePageProps) {
  const { data: profile, isLoading } = useCallerProfile();
  const createProfile = useCreateProfile();
  const { clear: logout } = useInternetIdentity();
  const { uploadFile, uploading } = useStorageUpload();
  const [editing, setEditing] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [showSuperLikedBy, setShowSuperLikedBy] = useState(false);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);

  const { data: profileViewCount = BigInt(0) } = useProfileViewCount();
  const { data: profileViewers = [] } = useProfileViewers();
  const { data: superLikedBy = [] } = useSuperLikedBy();
  const { data: allStories = [] } = useStories();

  // New feature states
  const [localMood, setLocalMood] = useState("");
  const [icebreakers, setIcebreakers] = useState<IcebreakerEntry[]>([
    { q: "", a: "" },
    { q: "", a: "" },
    { q: "", a: "" },
  ]);
  const [relGoal, setRelGoal] = useState("");
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [showBlocked, setShowBlocked] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: profile.userId is sufficient
  useEffect(() => {
    if (!profile) return;
    const uid = profile.userId.toString();
    setLocalMood(localStorage.getItem(`bandhan_mood_${uid}`) || "");
    try {
      const stored = localStorage.getItem(`bandhan_icebreakers_${uid}`);
      if (stored) setIcebreakers(JSON.parse(stored));
    } catch {}
    setRelGoal(localStorage.getItem(`bandhan_goal_${uid}`) || "");
    try {
      const blocked = localStorage.getItem("bandhan_blocked");
      if (blocked) setBlockedUsers(JSON.parse(blocked));
    } catch {}
  }, [profile?.userId]);

  const saveMood = (m: string) => {
    if (!profile) return;
    setLocalMood(m);
    localStorage.setItem(`bandhan_mood_${profile.userId.toString()}`, m);
  };

  const saveGoal = (g: string) => {
    if (!profile) return;
    setRelGoal(g);
    localStorage.setItem(`bandhan_goal_${profile.userId.toString()}`, g);
  };

  const saveIcebreakers = (ibs: IcebreakerEntry[]) => {
    if (!profile) return;
    setIcebreakers(ibs);
    localStorage.setItem(
      `bandhan_icebreakers_${profile.userId.toString()}`,
      JSON.stringify(ibs),
    );
  };

  const handleUnblock = (userId: string) => {
    const next = blockedUsers.filter((u) => u !== userId);
    setBlockedUsers(next);
    localStorage.setItem("bandhan_blocked", JSON.stringify(next));
  };

  // Profile boost state
  const [boostExpiry, setBoostExpiry] = useState<number | null>(() => {
    const stored = localStorage.getItem("bandhan_boost_expiry");
    if (stored) {
      const val = Number(stored);
      return val > Date.now() ? val : null;
    }
    return null;
  });
  const [boostNow, setBoostNow] = useState(Date.now());
  useEffect(() => {
    if (!boostExpiry) return;
    const interval = setInterval(() => {
      setBoostNow(Date.now());
      if (Date.now() >= boostExpiry) {
        setBoostExpiry(null);
        localStorage.removeItem("bandhan_boost_expiry");
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [boostExpiry]);

  const handleBoost = () => {
    const expiry = Date.now() + 30 * 60 * 1000;
    setBoostExpiry(expiry);
    setBoostNow(Date.now());
    localStorage.setItem("bandhan_boost_expiry", String(expiry));
  };

  const boostRemaining = boostExpiry ? Math.max(0, boostExpiry - boostNow) : 0;
  const boostMins = Math.floor(boostRemaining / 60000);
  const boostSecs = Math.floor((boostRemaining % 60000) / 1000);
  const isBoosted = boostExpiry !== null && boostRemaining > 0;

  // Story highlights
  const myHighlights = allStories.filter((s) => {
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

  const photoFileRef = useRef<HTMLInputElement>(null);
  const mediaFileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { data: backendVisibility } = usePrivacyVisibility();
  const setPrivacyVisibilityMutation = useSetPrivacyVisibility();
  const [visibility, setVisibility] = useState<VisibilityOption>("everyone");

  useEffect(() => {
    if (backendVisibility) {
      const uiVal = BACKEND_TO_UI[backendVisibility] as
        | VisibilityOption
        | undefined;
      if (uiVal) setVisibility(uiVal);
    }
  }, [backendVisibility]);

  const { data: backendPremium = false } = usePremiumStatus();
  const { data: backendShowLastActive = true } = useShowLastActive();
  const setPremiumMutation = useSetPremiumStatus();
  const setShowLastActiveMutation = useSetShowLastActive();
  const [showLastActive, setShowLastActive] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    setIsPremium(backendPremium);
  }, [backendPremium]);
  useEffect(() => {
    setShowLastActive(backendShowLastActive);
  }, [backendShowLastActive]);

  const handleVisibilityChange = async (
    val: VisibilityOption,
    _label: string,
  ) => {
    setVisibility(val);
    const backendVal = UI_TO_BACKEND[val];
    try {
      await setPrivacyVisibilityMutation.mutateAsync(backendVal);
    } catch {}
  };

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender>(Gender.male);
  const [religion, setReligion] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [occupation, setOccupation] = useState("");
  const [height, setHeight] = useState("");
  const [motherTongue, setMotherTongue] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [education, setEducation] = useState("");
  const [favoriteMovies, setFavoriteMovies] = useState<string[]>([]);
  const [favoriteSongs, setFavoriteSongs] = useState<string[]>([]);
  const [thoughts, setThoughts] = useState("");
  const [mood, setMood] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>(
    Array(7).fill(""),
  );
  const [uploadingMedia, setUploadingMedia] = useState<boolean[]>(
    Array(7).fill(false),
  );
  const [aboutMe, setAboutMe] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setAge(String(Number(profile.age)));
      setGender(profile.gender);
      setReligion(profile.religion);
      setLocation(profile.location);
      setBio(profile.bio);
      setPhotoUrl(profile.photoUrl ?? "");
      setPhotoPreview(profile.photoUrl ?? "");
      setOccupation(profile.occupation);
      setHeight(profile.height);
      setMotherTongue(profile.motherTongue);
      setMaritalStatus(profile.maritalStatus);
      setInterests(profile.interests);
      setHobbies(profile.hobbies);
      setEducation(profile.education);
      setFavoriteMovies(profile.favoriteMovies);
      setFavoriteSongs(profile.favoriteSongs);
      setThoughts(profile.thoughts);
      setMood(profile.mood);
      setMediaUrls(profile.mediaUrls);
      setMediaPreviews(
        [...profile.mediaUrls, ...Array(7).fill("")].slice(0, 7),
      );
      setAboutMe(profile.aboutMe);
      setPhone((profile as any).phone ?? "");
    }
  }, [profile]);

  const toggle = (arr: string[], set: (a: string[]) => void, val: string) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const url = await uploadFile(file);
      setPhotoUrl(url);
    } catch {}
    e.target.value = "";
  };

  const handleMediaChange = async (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) =>
        setMediaPreviews((p) => {
          const n = [...p];
          n[idx] = ev.target?.result as string;
          return n;
        });
      reader.readAsDataURL(file);
    } else {
      setMediaPreviews((p) => {
        const n = [...p];
        n[idx] = "video";
        return n;
      });
    }
    setUploadingMedia((p) => {
      const n = [...p];
      n[idx] = true;
      return n;
    });
    try {
      const url = await uploadFile(file);
      setMediaUrls((p) => {
        const n = [...p];
        n[idx] = url;
        return n;
      });
    } catch {
    } finally {
      setUploadingMedia((p) => {
        const n = [...p];
        n[idx] = false;
        return n;
      });
    }
    e.target.value = "";
  };

  const handleSave = async () => {
    try {
      await createProfile.mutateAsync({
        name,
        age: BigInt(age),
        gender,
        religion,
        location,
        bio,
        photoUrl: photoUrl || null,
        occupation,
        height,
        motherTongue,
        maritalStatus,
        interests,
        hobbies,
        education,
        favoriteMovies,
        favoriteSongs,
        thoughts,
        mood,
        mediaUrls: mediaUrls.filter(Boolean),
        aboutMe,
        phone: phone || null,
      });
      setEditing(false);
    } catch {}
  };

  if (isLoading)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0a0010" }}
        data-ocid="myprofile.loading_state"
      >
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{
            borderColor: "oklch(0.65 0.22 10/0.3)",
            borderTopColor: "oklch(0.65 0.22 10)",
          }}
        />
      </div>
    );

  const p = profile;
  const allMedia = p
    ? ([p.photoUrl, ...p.mediaUrls].filter(Boolean) as string[])
    : [];

  // Profile completion
  const completionFields = p
    ? ([
        ["Name", !!p.name],
        ["Age", !!p.age],
        ["Bio", !!p.bio],
        ["Photo", !!p.photoUrl],
        ["Occupation", !!p.occupation],
        ["Height", !!p.height],
        ["Religion", !!p.religion],
        ["Location", !!p.location],
        ["Mother Tongue", !!p.motherTongue],
        ["Marital Status", !!p.maritalStatus],
        ["Education", !!p.education],
        ["Interests", p.interests.length > 0],
        ["Hobbies", p.hobbies.length > 0],
        ["Gallery", p.mediaUrls.length > 0],
        ["Movies", p.favoriteMovies.length > 0],
        ["Songs", p.favoriteSongs.length > 0],
        ["Thoughts", !!p.thoughts],
        ["Mood", !!p.mood],
        ["About Me", !!p.aboutMe],
        ["Phone", !!(p as any).phone],
      ] as [string, boolean][])
    : [];
  const filledCount = completionFields.filter(([, v]) => v).length;
  const completionPct =
    completionFields.length > 0
      ? Math.round((filledCount / completionFields.length) * 100)
      : 0;
  const missingFields = completionFields
    .filter(([, v]) => !v)
    .map(([k]) => k)
    .slice(0, 3);

  // Views this week (deterministic)
  const weekViews = p ? (p.userId.toString().charCodeAt(0) % 47) + 12 : 0;

  return (
    <div className="min-h-screen pb-8" style={{ background: "#0a0010" }}>
      <input
        ref={photoFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoChange}
      />

      {/* Hero */}
      <div className="relative h-56">
        {photoPreview || p?.photoUrl ? (
          <img
            src={photoPreview || p?.photoUrl || undefined}
            alt={p?.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-7xl font-bold text-white"
            style={{ background: "linear-gradient(160deg,#e11d48,#7c3aed)" }}
          >
            {p?.name?.charAt(0)}
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top,#0a0010 20%,transparent)",
          }}
        />
        {isPremium && (
          <div
            className="absolute top-14 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: "linear-gradient(135deg,#f59e0b,#d97706)",
              boxShadow: "0 2px 12px rgba(245,158,11,0.6)",
            }}
          >
            <Crown className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-bold">Premium Member</span>
          </div>
        )}

        {/* TWO-ROW button layout */}
        <div className="absolute top-12 right-4 flex flex-col items-end gap-1.5">
          {/* Row 1: Edit | Call History | Logout */}
          <div className="flex gap-1.5">
            {editing && (
              <button
                type="button"
                onClick={() => photoFileRef.current?.click()}
                data-ocid="myprofile.upload_button"
                className="px-3 py-2 rounded-full flex items-center gap-1.5 text-sm text-white"
                style={{
                  background: "rgba(0,0,0,0.6)",
                  backdropFilter: "blur(8px)",
                }}
                disabled={uploading}
              >
                <Camera className="w-3.5 h-3.5" />
                {uploading ? "..." : "Photo"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              data-ocid="myprofile.edit_button"
              className="px-4 py-2 rounded-full flex items-center gap-2 text-sm text-white font-medium"
              style={{
                background: editing
                  ? "linear-gradient(135deg,#e11d48,#7c3aed)"
                  : "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
              }}
            >
              {editing ? (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Editing
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onCallHistory}
              data-ocid="myprofile.secondary_button"
              className="px-3 py-2 rounded-full flex items-center gap-2 text-sm text-white/70"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
              }}
              title="Call History"
            >
              <PhoneCall className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("bandhan_session");
                logout();
              }}
              data-ocid="myprofile.secondary_button"
              className="px-3 py-2 rounded-full flex items-center gap-2 text-sm text-white/70"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
              }}
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Row 2: Go Live | Suggestions | Gift History */}
          {(onGoLive || onSuggestions || onGiftHistory) && (
            <div className="flex gap-1.5">
              {onGoLive && (
                <button
                  type="button"
                  onClick={onGoLive}
                  data-ocid="myprofile.primary_button"
                  className="px-3 py-2 rounded-full flex items-center gap-1.5 text-sm font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg,#e11d48,#dc2626)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Go Live
                </button>
              )}
              {onSuggestions && (
                <button
                  type="button"
                  onClick={onSuggestions}
                  data-ocid="myprofile.secondary_button"
                  className="px-3 py-2 rounded-full flex items-center gap-1.5 text-sm font-medium text-white"
                  style={{
                    background: "rgba(124,58,237,0.6)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  ✨ Suggestions
                </button>
              )}
              {onGiftHistory && (
                <button
                  type="button"
                  onClick={onGiftHistory}
                  data-ocid="myprofile.secondary_button"
                  className="px-3 py-2 rounded-full flex items-center gap-1.5 text-sm font-medium text-white"
                  style={{
                    background: "rgba(225,29,72,0.45)",
                    backdropFilter: "blur(8px)",
                  }}
                  title="Gift History"
                >
                  🎁 Gifts
                </button>
              )}
            </div>
          )}
        </div>

        {p && (
          <div className="absolute bottom-4 left-5">
            <h1 className="text-2xl font-bold text-white">
              {p.name}, {Number(p.age)}
            </h1>
            <p className="text-white/60 text-sm">📍 {p.location}</p>
            {localMood && (
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-xs text-white mt-1.5"
                style={{
                  background: "oklch(0.65 0.22 10 / 0.5)",
                  backdropFilter: "blur(4px)",
                }}
              >
                {localMood}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-5 space-y-5 mt-4">
        {/* Profile Completion Bar */}
        {p && completionPct < 100 && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: "oklch(0.13 0.05 300)",
              border: "1px solid oklch(0.22 0.07 300)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70 text-sm font-semibold">
                Profile {completionPct}% complete
              </span>
              <span
                className="text-xs"
                style={{
                  color:
                    completionPct >= 80
                      ? "#4ade80"
                      : completionPct >= 50
                        ? "#fbbf24"
                        : "#fb7185",
                }}
              >
                {completionPct >= 80
                  ? "Almost there!"
                  : completionPct >= 50
                    ? "Good progress"
                    : "Just starting"}
              </span>
            </div>
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ background: "oklch(0.2 0.05 300)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${completionPct}%`,
                  background: "linear-gradient(90deg,#e11d48,#7c3aed)",
                }}
              />
            </div>
            {missingFields.length > 0 && (
              <p className="text-white/40 text-xs mt-2">
                Add: {missingFields.join(", ")} to complete your profile
              </p>
            )}
          </div>
        )}

        {/* Relationship Goal Badge */}
        {p && relGoal && !editing && (
          <div className="flex items-center gap-2">
            <span
              className="px-4 py-1.5 rounded-full text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)" }}
            >
              💍 {relGoal}
            </span>
          </div>
        )}

        {/* Stats Row */}
        {p && (
          <div className="grid grid-cols-2 gap-2">
            {/* Profile Views */}
            <button
              type="button"
              onClick={() => setShowViewers(true)}
              data-ocid="myprofile.button"
              className="rounded-2xl p-3 flex flex-col items-center gap-1 transition-all active:scale-95"
              style={{
                background: "oklch(0.14 0.05 300)",
                border: "1px solid oklch(0.22 0.07 300)",
              }}
            >
              <Users className="w-5 h-5" style={{ color: "#a78bfa" }} />
              <span className="text-white font-bold text-lg leading-none">
                {Number(profileViewCount)}
              </span>
              <span className="text-white/50 text-[10px]">Profile Views</span>
            </button>
            {/* Super Liked By */}
            <button
              type="button"
              onClick={() => setShowSuperLikedBy(true)}
              data-ocid="myprofile.button"
              className="rounded-2xl p-3 flex flex-col items-center gap-1 transition-all active:scale-95"
              style={{
                background: "oklch(0.14 0.05 300)",
                border: "1px solid oklch(0.22 0.07 300)",
              }}
            >
              <Star
                className="w-5 h-5"
                style={{ color: "#fbbf24", fill: "#fbbf24" }}
              />
              <span className="text-white font-bold text-lg leading-none">
                {superLikedBy.length}
              </span>
              <span className="text-white/50 text-[10px]">Super Liked</span>
            </button>
            {/* Views This Week */}
            <div
              className="rounded-2xl p-3 flex flex-col items-center gap-1"
              style={{
                background: "oklch(0.14 0.05 300)",
                border: "1px solid oklch(0.22 0.07 300)",
              }}
            >
              <Eye className="w-5 h-5" style={{ color: "#34d399" }} />
              <span className="text-white font-bold text-lg leading-none">
                {weekViews}
              </span>
              <span className="text-white/50 text-[10px]">Views/Week</span>
            </div>
            {/* Boost */}
            <button
              type="button"
              onClick={isBoosted ? undefined : handleBoost}
              data-ocid="myprofile.button"
              className="rounded-2xl p-3 flex flex-col items-center gap-1 transition-all active:scale-95"
              style={{
                background: isBoosted
                  ? "linear-gradient(135deg,oklch(0.25 0.12 280),oklch(0.2 0.1 270))"
                  : "oklch(0.14 0.05 300)",
                border: isBoosted
                  ? "1px solid oklch(0.5 0.15 280 / 0.5)"
                  : "1px solid oklch(0.22 0.07 300)",
              }}
            >
              <Rocket
                className="w-5 h-5"
                style={{ color: isBoosted ? "#c084fc" : "#6b7280" }}
              />
              {isBoosted ? (
                <>
                  <span className="text-white font-bold text-sm leading-none">
                    {boostMins}:{boostSecs.toString().padStart(2, "0")}
                  </span>
                  <span className="text-white/50 text-[10px]">Boosted 🚀</span>
                </>
              ) : (
                <>
                  <span className="text-white/60 text-sm leading-none font-medium">
                    Boost
                  </span>
                  <span className="text-white/40 text-[10px]">30 min</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Story Highlights Row */}
        {myHighlights.length > 0 && (
          <div>
            <p className="text-white/60 text-xs uppercase tracking-wider mb-3">
              Highlights
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {myHighlights.map((story, i) => (
                <button
                  key={story.id.toString()}
                  type="button"
                  data-ocid={`myprofile.item.${i + 1}`}
                  onClick={() => {
                    setStoryViewerIndex(
                      allStories.findIndex((s) => s.id === story.id),
                    );
                    setStoryViewerOpen(true);
                  }}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5"
                >
                  <div
                    className="w-14 h-14 rounded-full overflow-hidden"
                    style={{
                      border: "2px solid",
                      borderColor: "oklch(0.65 0.22 10)",
                    }}
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

        {/* Privacy & Premium settings toggle */}
        <button
          type="button"
          onClick={() => setShowPrivacy((s) => !s)}
          data-ocid="myprofile.toggle"
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-white"
          style={{
            background: "oklch(0.13 0.05 300)",
            border: showPrivacy
              ? "1px solid oklch(0.4 0.15 300)"
              : "1px solid transparent",
          }}
        >
          <div className="flex items-center gap-2.5">
            <Shield
              className="w-4 h-4"
              style={{ color: "oklch(0.7 0.2 280)" }}
            />
            <span className="text-sm font-semibold">
              Privacy &amp; Membership
            </span>
          </div>
          <span className="text-white/40 text-xs">
            {showPrivacy ? "▲" : "▼"}
          </span>
        </button>

        {showPrivacy && (
          <div
            className="rounded-2xl p-4 space-y-5"
            style={{ background: "oklch(0.12 0.05 300)" }}
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-white/50" />
                <p className="text-white/70 text-sm font-semibold">
                  Profile Visibility
                </p>
                {setPrivacyVisibilityMutation.isPending && (
                  <Loader2 className="w-3 h-3 text-white/40 animate-spin" />
                )}
              </div>
              <div className="flex gap-2">
                {(
                  [
                    { val: "everyone", label: "Everyone", icon: "🌍" },
                    { val: "matches", label: "Matches Only", icon: "💞" },
                    { val: "hidden", label: "Hidden", icon: "🚫" },
                  ] as const
                ).map(({ val, label, icon }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleVisibilityChange(val, label)}
                    data-ocid="myprofile.toggle"
                    disabled={setPrivacyVisibilityMutation.isPending}
                    className="flex-1 py-2.5 rounded-xl flex flex-col items-center gap-1 text-xs font-medium text-white transition-all"
                    style={
                      visibility === val
                        ? {
                            background:
                              "linear-gradient(135deg,#7c3aed,#2563eb)",
                            boxShadow: "0 2px 12px rgba(124,58,237,0.4)",
                          }
                        : { background: "oklch(0.18 0.05 300)" }
                    }
                  >
                    <span className="text-base">{icon}</span>
                    <span className="leading-tight text-center">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-white/50" />
                <div>
                  <p className="text-white/80 text-sm">Show Last Active</p>
                  <p className="text-white/40 text-xs">
                    Let matches see when you were last online
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !showLastActive;
                  setShowLastActive(next);
                  setShowLastActiveMutation.mutateAsync(next);
                }}
                data-ocid="myprofile.toggle"
                className="w-12 h-6 rounded-full transition-all relative"
                style={{
                  background: showLastActive
                    ? "linear-gradient(135deg,#e11d48,#7c3aed)"
                    : "oklch(0.25 0.05 300)",
                }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: showLastActive ? "calc(100% - 22px)" : "2px" }}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-white/50" />
                <div>
                  <p className="text-white/80 text-sm">Hide Read Receipts</p>
                  <p className="text-white/40 text-xs">
                    Don&apos;t show when you&apos;ve read messages
                  </p>
                </div>
              </div>
              <div
                className="w-12 h-6 rounded-full relative"
                style={{ background: "oklch(0.25 0.05 300)" }}
              >
                <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white/40" />
              </div>
            </div>

            <div
              className="rounded-xl p-3"
              style={{
                background: isPremium
                  ? "linear-gradient(135deg,oklch(0.25 0.12 60),oklch(0.2 0.1 50))"
                  : "oklch(0.15 0.04 300)",
                border: isPremium
                  ? "1px solid oklch(0.5 0.18 60 / 0.5)"
                  : "1px solid oklch(0.25 0.05 300)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown
                    className="w-5 h-5"
                    style={{
                      color: isPremium
                        ? "oklch(0.8 0.2 60)"
                        : "oklch(0.5 0.1 60)",
                    }}
                  />
                  <div>
                    <p
                      className="text-sm font-bold"
                      style={{
                        color: isPremium ? "oklch(0.85 0.2 60)" : "white",
                      }}
                    >
                      {isPremium ? "Premium Member" : "Upgrade to Premium"}
                    </p>
                    <p className="text-white/40 text-xs">
                      {isPremium
                        ? "Crown badge visible on your profile"
                        : "Show a premium badge on your profile"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isPremium;
                    setIsPremium(next);
                    setPremiumMutation.mutateAsync(next);
                  }}
                  data-ocid="myprofile.toggle"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={
                    isPremium
                      ? { background: "oklch(0.4 0.15 60)", color: "white" }
                      : {
                          background: "linear-gradient(135deg,#f59e0b,#d97706)",
                          color: "white",
                        }
                  }
                >
                  {isPremium ? "Active" : "Enable"}
                </button>
              </div>
            </div>

            {/* Blocked Users */}
            <button
              type="button"
              onClick={() => setShowBlocked((s) => !s)}
              data-ocid="myprofile.toggle"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-white"
              style={{
                background: "oklch(0.15 0.04 300)",
                border: "1px solid oklch(0.25 0.05 300)",
              }}
            >
              <div className="flex items-center gap-2">
                <X className="w-4 h-4 text-red-400" />
                <span className="text-sm text-white/80">Blocked Users</span>
                {blockedUsers.length > 0 && (
                  <span
                    className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                    style={{ background: "#e11d48" }}
                  >
                    {blockedUsers.length}
                  </span>
                )}
              </div>
              <span className="text-white/40 text-xs">
                {showBlocked ? "▲" : "▼"}
              </span>
            </button>
            {showBlocked && (
              <div className="space-y-2">
                {blockedUsers.length === 0 ? (
                  <p
                    className="text-white/40 text-sm text-center py-3"
                    data-ocid="myprofile.empty_state"
                  >
                    No blocked users
                  </p>
                ) : (
                  blockedUsers.map((uid, i) => (
                    <div
                      key={uid}
                      data-ocid={`myprofile.item.${i + 1}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                      style={{ background: "oklch(0.16 0.05 300)" }}
                    >
                      <span className="text-white/70 text-sm truncate flex-1">
                        {uid}
                      </span>
                      <button
                        type="button"
                        data-ocid={`myprofile.secondary_button.${i + 1}`}
                        onClick={() => handleUnblock(uid)}
                        className="ml-2 px-3 py-1 rounded-lg text-xs font-medium text-white flex-shrink-0"
                        style={{
                          background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                        }}
                      >
                        Unblock
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {!editing ? (
          <>
            {p?.bio && <Section title="About">{p.bio}</Section>}
            {p?.aboutMe && <Section title="About Me">{p.aboutMe}</Section>}
            {p?.thoughts && (
              <Section title="Life Philosophy">
                &ldquo;{p.thoughts}&rdquo;
              </Section>
            )}
            {(p as any)?.phone && (
              <Section title="Phone">{(p as any).phone}</Section>
            )}

            {/* Icebreakers Q&A */}
            {icebreakers.some((ib) => ib.q && ib.a) && (
              <div>
                <p className="text-white/60 text-sm font-semibold mb-2">
                  🧠 Icebreakers
                </p>
                <div className="space-y-2">
                  {icebreakers
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

            <div className="grid grid-cols-3 gap-2">
              {[
                ["Height", p?.height],
                ["Religion", p?.religion],
                ["Mother Tongue", p?.motherTongue],
                ["Marital", p?.maritalStatus],
                ["Education", p?.education],
                ["Mood", p?.mood],
              ]
                .filter(([, v]) => v)
                .map(([l, v]) => (
                  <div
                    key={String(l)}
                    className="rounded-xl p-2.5"
                    style={{ background: "oklch(0.14 0.05 300)" }}
                  >
                    <p className="text-white/40 text-[10px]">{l}</p>
                    <p className="text-white text-xs font-medium mt-0.5 truncate">
                      {v}
                    </p>
                  </div>
                ))}
            </div>
            {p?.interests && p.interests.length > 0 && (
              <TagSection
                title="Interests"
                tags={p.interests}
                grad="135deg,#e11d48,#7c3aed"
              />
            )}
            {p?.hobbies && p.hobbies.length > 0 && (
              <TagSection
                title="Hobbies"
                tags={p.hobbies}
                grad="135deg,#7c3aed,#2563eb"
              />
            )}
            {p?.favoriteMovies && p.favoriteMovies.length > 0 && (
              <TagSection
                title="🎥 Favorite Movies"
                tags={p.favoriteMovies}
                grad="135deg,#e11d48,#db2777"
              />
            )}
            {p?.favoriteSongs && p.favoriteSongs.length > 0 && (
              <TagSection
                title="🎵 Favorite Songs"
                tags={p.favoriteSongs}
                grad="135deg,#7c3aed,#4f46e5"
              />
            )}
            {allMedia.length > 1 && (
              <div>
                <p className="text-white/60 text-sm font-semibold mb-2">
                  Gallery
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {allMedia.slice(1).map((url, i) => (
                    <button
                      key={url || `gal-${i}`}
                      type="button"
                      data-ocid={`myprofile.item.${i + 1}`}
                      onClick={() => {
                        setLightboxIndex(i + 1);
                        setLightboxOpen(true);
                      }}
                      className="aspect-square rounded-xl overflow-hidden active:scale-95 transition-transform"
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <F label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-ocid="myprofile.input"
              />
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Age">
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  data-ocid="myprofile.input"
                />
              </F>
              <F label="Gender">
                <Select
                  value={gender}
                  onValueChange={(v) => setGender(v as Gender)}
                >
                  <SelectTrigger data-ocid="myprofile.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Gender.male}>Male</SelectItem>
                    <SelectItem value={Gender.female}>Female</SelectItem>
                    <SelectItem value={Gender.other}>Other</SelectItem>
                  </SelectContent>
                </Select>
              </F>
            </div>
            <F label="Phone Number (optional)">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                type="tel"
                data-ocid="myprofile.input"
              />
            </F>
            <F label="Religion">
              <Input
                value={religion}
                onChange={(e) => setReligion(e.target.value)}
                data-ocid="myprofile.input"
              />
            </F>
            <F label="Location">
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                data-ocid="myprofile.input"
              />
            </F>
            <F label="Occupation">
              <Input
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                data-ocid="myprofile.input"
              />
            </F>
            <F label="Height">
              <Input
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                data-ocid="myprofile.input"
              />
            </F>
            <F label="Mother Tongue">
              <Input
                value={motherTongue}
                onChange={(e) => setMotherTongue(e.target.value)}
                data-ocid="myprofile.input"
              />
            </F>
            <F label="Marital Status">
              <Input
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value)}
                data-ocid="myprofile.input"
              />
            </F>
            <F label="Education">
              <Input
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                data-ocid="myprofile.input"
              />
            </F>
            <F label="Bio">
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                data-ocid="myprofile.textarea"
                className="resize-none"
              />
            </F>
            <F label="About Me">
              <Textarea
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                rows={3}
                data-ocid="myprofile.textarea"
                className="resize-none"
              />
            </F>
            <F label="Thoughts">
              <Input
                value={thoughts}
                onChange={(e) => setThoughts(e.target.value)}
                data-ocid="myprofile.input"
              />
            </F>
            <F label="Mood (backend field)">
              <Input
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                data-ocid="myprofile.input"
              />
            </F>

            {/* Mood Status Picker */}
            <div>
              <Label className="text-white/70 text-sm mb-2 block">
                💟 My Status
              </Label>
              <div className="flex flex-wrap gap-2">
                {MOOD_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => saveMood(m)}
                    data-ocid="myprofile.toggle"
                    className="px-3 py-1.5 rounded-full text-sm transition-all text-white"
                    style={
                      localMood === m
                        ? {
                            background:
                              "linear-gradient(135deg,#e11d48,#7c3aed)",
                          }
                        : {
                            background: "oklch(0.18 0.05 300)",
                            border: "1px solid oklch(0.28 0.06 300)",
                          }
                    }
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Relationship Goal */}
            <div>
              <Label className="text-white/70 text-sm mb-2 block">
                💍 Relationship Goal
              </Label>
              <div className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => saveGoal(g)}
                    data-ocid="myprofile.toggle"
                    className="px-3 py-1.5 rounded-full text-sm transition-all text-white"
                    style={
                      relGoal === g
                        ? {
                            background:
                              "linear-gradient(135deg,#7c3aed,#2563eb)",
                          }
                        : {
                            background: "oklch(0.18 0.05 300)",
                            border: "1px solid oklch(0.28 0.06 300)",
                          }
                    }
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Icebreakers */}
            <div>
              <Label className="text-white/70 text-sm mb-2 block">
                🧠 Icebreakers
              </Label>
              <div className="space-y-3">
                {icebreakers.map((ib, i) => (
                  <div
                    key={String(i)}
                    className="rounded-2xl p-3 space-y-2"
                    style={{ background: "oklch(0.14 0.05 300)" }}
                  >
                    <Select
                      value={ib.q}
                      onValueChange={(v) => {
                        const next = [...icebreakers];
                        next[i] = { ...next[i], q: v };
                        saveIcebreakers(next);
                      }}
                    >
                      <SelectTrigger
                        data-ocid="myprofile.select"
                        className="text-white/70 border-white/20 bg-transparent"
                      >
                        <SelectValue placeholder="Pick a question..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ICEBREAKER_QUESTIONS.map((q) => (
                          <SelectItem key={q} value={q}>
                            {q}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={ib.a}
                      onChange={(e) => {
                        const next = [...icebreakers];
                        next[i] = { ...next[i], a: e.target.value };
                        saveIcebreakers(next);
                      }}
                      placeholder="Your answer..."
                      data-ocid="myprofile.input"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div>
              <Label className="text-white/70 text-sm mb-2 block">
                Interests
              </Label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS_LIST.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggle(interests, setInterests, i)}
                    data-ocid="myprofile.toggle"
                    className="px-3 py-1.5 rounded-full text-sm transition-all text-white"
                    style={
                      interests.includes(i)
                        ? {
                            background:
                              "linear-gradient(135deg,#e11d48,#7c3aed)",
                          }
                        : {
                            background: "oklch(0.18 0.05 300)",
                            border: "1px solid oklch(0.28 0.06 300)",
                          }
                    }
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-white/70 text-sm mb-2 block">
                Hobbies
              </Label>
              <div className="flex flex-wrap gap-2">
                {HOBBIES_LIST.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => toggle(hobbies, setHobbies, h)}
                    data-ocid="myprofile.toggle"
                    className="px-3 py-1.5 rounded-full text-sm transition-all text-white"
                    style={
                      hobbies.includes(h)
                        ? {
                            background:
                              "linear-gradient(135deg,#7c3aed,#2563eb)",
                          }
                        : {
                            background: "oklch(0.18 0.05 300)",
                            border: "1px solid oklch(0.28 0.06 300)",
                          }
                    }
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
            <F label="Favorite Movies (comma separated)">
              <Input
                value={favoriteMovies.join(", ")}
                onChange={(e) =>
                  setFavoriteMovies(
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                data-ocid="myprofile.input"
              />
            </F>
            <F label="Favorite Songs (comma separated)">
              <Input
                value={favoriteSongs.join(", ")}
                onChange={(e) =>
                  setFavoriteSongs(
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                data-ocid="myprofile.input"
              />
            </F>
            {/* Media upload grid */}
            <div>
              <Label className="text-white/70 text-sm mb-2 block">
                Media Gallery
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i}>
                    <button
                      type="button"
                      onClick={() => mediaFileRefs.current[i]?.click()}
                      data-ocid="myprofile.upload_button"
                      className="w-full aspect-square rounded-2xl overflow-hidden flex items-center justify-center relative"
                      style={{
                        background: mediaPreviews[i]
                          ? "transparent"
                          : "oklch(0.16 0.06 300)",
                        border: mediaPreviews[i]
                          ? "none"
                          : "2px dashed oklch(0.32 0.08 300)",
                      }}
                    >
                      {mediaPreviews[i] ? (
                        mediaPreviews[i] === "video" ? (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: "oklch(0.16 0.06 300)" }}
                          >
                            <span className="text-3xl">🎥</span>
                          </div>
                        ) : (
                          <img
                            src={mediaPreviews[i]}
                            alt={`media ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Upload className="w-4 h-4 text-white/40" />
                          <span className="text-white/40 text-[9px]">
                            {i + 1}
                          </span>
                        </div>
                      )}
                      {uploadingMedia[i] && (
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ background: "rgba(0,0,0,0.6)" }}
                        >
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      )}
                    </button>
                    <input
                      ref={(el) => {
                        mediaFileRefs.current[i] = el;
                      }}
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => handleMediaChange(i, e)}
                    />
                  </div>
                ))}
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={createProfile.isPending}
              data-ocid="myprofile.save_button"
              className="w-full h-12 rounded-2xl text-white font-semibold"
              style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
            >
              {createProfile.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </>
        )}
      </div>

      {lightboxOpen && allMedia.length > 0 && (
        <GalleryLightbox
          images={allMedia}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Profile Viewers Sheet */}
      <Sheet open={showViewers} onOpenChange={setShowViewers}>
        <SheetContent
          side="bottom"
          data-ocid="myprofile.sheet"
          className="rounded-t-3xl border-0 pb-8"
          style={{
            background: "#0a0010",
            maxHeight: "75vh",
            overflowY: "auto",
          }}
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-white text-lg">
              👁 Profile Viewers ({Number(profileViewCount)})
            </SheetTitle>
          </SheetHeader>
          {profileViewers.length === 0 ? (
            <div className="text-center py-8" data-ocid="myprofile.empty_state">
              <p className="text-white/40 text-sm">No views yet</p>
              <p className="text-white/30 text-xs mt-1">
                Only matches who viewed you appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {profileViewers.map(([viewer, ts], i) => (
                <div
                  key={viewer.userId.toString()}
                  data-ocid={`myprofile.item.${i + 1}`}
                  className="flex items-center gap-3 px-1"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={viewer.photoUrl ?? ""} />
                    <AvatarFallback
                      style={{
                        background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                      }}
                    >
                      {viewer.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">
                      {viewer.name}, {Number(viewer.age)}
                    </p>
                    <p className="text-white/40 text-xs">
                      📍 {viewer.location}
                    </p>
                  </div>
                  <span className="text-white/30 text-xs">
                    {timeAgo(Number(ts))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Super Liked By Sheet */}
      <Sheet open={showSuperLikedBy} onOpenChange={setShowSuperLikedBy}>
        <SheetContent
          side="bottom"
          data-ocid="myprofile.sheet"
          className="rounded-t-3xl border-0 pb-8"
          style={{
            background: "#0a0010",
            maxHeight: "75vh",
            overflowY: "auto",
          }}
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-white text-lg">
              ⭐ Super Liked By ({superLikedBy.length})
            </SheetTitle>
          </SheetHeader>
          {superLikedBy.length === 0 ? (
            <div className="text-center py-8" data-ocid="myprofile.empty_state">
              <p className="text-white/40 text-sm">No super likes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {superLikedBy.map((viewer, i) => (
                <div
                  key={viewer.userId.toString()}
                  data-ocid={`myprofile.item.${i + 1}`}
                  className="flex items-center gap-3 px-1"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={viewer.photoUrl ?? ""} />
                    <AvatarFallback
                      style={{
                        background: "linear-gradient(135deg,#f59e0b,#d97706)",
                      }}
                    >
                      {viewer.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">
                      {viewer.name}, {Number(viewer.age)}
                    </p>
                    <p className="text-white/40 text-xs">
                      📍 {viewer.location}
                    </p>
                  </div>
                  <Star
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: "#fbbf24", fill: "#fbbf24" }}
                  />
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {storyViewerOpen && allStories.length > 0 && (
        <StoryViewerModal
          stories={allStories}
          initialIndex={storyViewerIndex}
          onClose={() => setStoryViewerOpen(false)}
        />
      )}

      <div className="h-4" />
      <footer className="text-center text-white/30 text-xs pb-6">
        © {new Date().getFullYear()}. I would ❤️ using Bandhan
      </footer>
    </div>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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
      <p className="text-white/90 text-sm leading-relaxed">
        {children as string}
      </p>
    </div>
  );
}
function TagSection({
  title,
  tags,
  grad,
}: { title: string; tags: string[]; grad: string }) {
  return (
    <div>
      <p className="text-white/60 text-sm font-semibold mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="px-3 py-1.5 rounded-full text-white text-sm font-medium"
            style={{ background: `linear-gradient(${grad})` }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-white/70 text-sm">{label}</Label>
      {children}
    </div>
  );
}
