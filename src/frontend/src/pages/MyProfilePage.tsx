import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Save,
  Shield,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Gender } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCallerProfile,
  useCreateProfile,
  usePremiumStatus,
  usePrivacyVisibility,
  useSetPremiumStatus,
  useSetPrivacyVisibility,
  useSetShowLastActive,
  useShowLastActive,
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

// Map between UI option values and backend PrivacyVisibility values
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

interface MyProfilePageProps {
  onCallHistory?: () => void;
}
export default function MyProfilePage({ onCallHistory }: MyProfilePageProps) {
  const { data: profile, isLoading } = useCallerProfile();
  const createProfile = useCreateProfile();
  const { clear: logout } = useInternetIdentity();
  const { uploadFile, uploading } = useStorageUpload();
  const [editing, setEditing] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const photoFileRef = useRef<HTMLInputElement>(null);
  const mediaFileRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Privacy visibility from backend
  const { data: backendVisibility } = usePrivacyVisibility();
  const setPrivacyVisibilityMutation = useSetPrivacyVisibility();

  // Local UI visibility state — synced from backend once loaded
  const [visibility, setVisibility] = useState<VisibilityOption>("everyone");

  // Sync backend visibility to local state once loaded
  useEffect(() => {
    if (backendVisibility) {
      const uiVal = BACKEND_TO_UI[backendVisibility] as
        | VisibilityOption
        | undefined;
      if (uiVal) setVisibility(uiVal);
    }
  }, [backendVisibility]);

  // Premium and last active from backend
  const { data: backendPremium = false } = usePremiumStatus();
  const { data: backendShowLastActive = true } = useShowLastActive();
  const setPremiumMutation = useSetPremiumStatus();
  const setShowLastActiveMutation = useSetShowLastActive();
  const [showLastActive, setShowLastActive] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  // Sync backend values to local state
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

  return (
    <div className="min-h-screen pb-8" style={{ background: "#0a0010" }}>
      {/* Hidden inputs */}
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
            src={photoPreview || p?.photoUrl}
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
        {/* Premium badge on hero */}
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
        <div className="absolute top-12 right-4 flex gap-2">
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
            className="px-4 py-2 rounded-full flex items-center gap-2 text-sm text-white/70"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
            }}
          >
            <PhoneCall className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={logout}
            data-ocid="myprofile.secondary_button"
            className="px-4 py-2 rounded-full flex items-center gap-2 text-sm text-white/70"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
            }}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
        {p && (
          <div className="absolute bottom-4 left-5">
            <h1 className="text-2xl font-bold text-white">
              {p.name}, {Number(p.age)}
            </h1>
            <p className="text-white/60 text-sm">📍 {p.location}</p>
          </div>
        )}
      </div>

      <div className="px-5 space-y-5 mt-4">
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
            {/* Profile Visibility */}
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

            {/* Show Last Active */}
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

            {/* Hide seen status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-white/50" />
                <div>
                  <p className="text-white/80 text-sm">Hide Read Receipts</p>
                  <p className="text-white/40 text-xs">
                    Don't show when you've read messages
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

            {/* Premium membership */}
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
                      ? {
                          background: "oklch(0.4 0.15 60)",
                          color: "white",
                        }
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
          </div>
        )}

        {!editing ? (
          <>
            {p?.bio && <Section title="About">{p.bio}</Section>}
            {p?.aboutMe && <Section title="About Me">{p.aboutMe}</Section>}
            {p?.thoughts && (
              <Section title="Life Philosophy">"{p.thoughts}"</Section>
            )}
            {(p as any)?.phone && (
              <Section title="Phone">{(p as any).phone}</Section>
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
                title="🎬 Favorite Movies"
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
                    <div
                      key={url || `gal-${i}`}
                      className="aspect-square rounded-xl overflow-hidden"
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
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
            <F label="Mood">
              <Input
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                data-ocid="myprofile.input"
              />
            </F>
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
                            <span className="text-3xl">🎬</span>
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
