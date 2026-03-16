import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { Switch } from "@/components/ui/switch";
import { Heart, Search, SlidersHorizontal, Star, X } from "lucide-react";
import { useState } from "react";
import type { Profile } from "../backend";
import NotificationBell from "../components/NotificationBell";
import StoriesRow from "../components/StoriesRow";
import {
  useAllProfiles,
  useCallerProfile,
  useSendMatchRequest,
  useSuperLikeUser,
  useUnsuperLikeUser,
} from "../hooks/useQueries";
import { playMatchSentSound } from "../hooks/useSound";

interface Filters {
  name: string;
  city: string;
  nearMe: boolean;
  skills: string;
  qualification: string;
  skinColor: string;
  heightMin: string;
  heightMax: string;
  weightMin: string;
  weightMax: string;
  employment: "any" | "employed" | "jobless";
}

const defaultFilters: Filters = {
  name: "",
  city: "",
  nearMe: false,
  skills: "",
  qualification: "",
  skinColor: "",
  heightMin: "",
  heightMax: "",
  weightMin: "",
  weightMax: "",
  employment: "any",
};

// Deterministically marks first ~30% of profiles as premium based on name hash
function isPremiumProfile(p: Profile): boolean {
  let hash = 0;
  for (let i = 0; i < p.name.length; i++) {
    hash = (hash * 31 + p.name.charCodeAt(i)) & 0xffff;
  }
  return hash % 3 === 0;
}

function applyFilters(
  profiles: Profile[],
  searchTerm: string,
  filters: Filters,
): Profile[] {
  return profiles.filter((p) => {
    // Search term
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const match =
        p.name.toLowerCase().includes(s) ||
        p.location.toLowerCase().includes(s) ||
        p.religion.toLowerCase().includes(s);
      if (!match) return false;
    }
    // Name filter
    if (
      filters.name &&
      !p.name.toLowerCase().includes(filters.name.toLowerCase())
    )
      return false;
    // City filter
    if (
      filters.city &&
      !p.location.toLowerCase().includes(filters.city.toLowerCase())
    )
      return false;
    // Near me — filter by detected city
    if (filters.nearMe) {
      const dc = (filters as Filters & { _detectedCity?: string })
        ._detectedCity;
      if (dc) {
        if (!p.location.toLowerCase().includes(dc.toLowerCase())) return false;
      } else if (!p.location) return false;
    }
    // Skills (check bio/occupation/interests)
    if (filters.skills) {
      const sk = filters.skills.toLowerCase();
      const hasSkill =
        p.bio.toLowerCase().includes(sk) ||
        p.occupation.toLowerCase().includes(sk) ||
        p.interests.some((i) => i.toLowerCase().includes(sk)) ||
        p.hobbies.some((h) => h.toLowerCase().includes(sk));
      if (!hasSkill) return false;
    }
    // Qualification
    if (filters.qualification && p.education) {
      if (
        !p.education.toLowerCase().includes(filters.qualification.toLowerCase())
      )
        return false;
    }
    // Employment
    if (filters.employment !== "any" && p.occupation) {
      const hasJob = p.occupation.trim().length > 0;
      if (filters.employment === "employed" && !hasJob) return false;
      if (filters.employment === "jobless" && hasJob) return false;
    }
    return true;
  });
}

interface Props {
  onViewProfile: (p: Profile) => void;
  onNotifications: () => void;
  onGoLive?: () => void;
}

export default function BrowsePage({
  onViewProfile,
  onNotifications,
  onGoLive,
}: Props) {
  const { data: allProfiles = [], isLoading } = useAllProfiles();
  const { data: myProfile } = useCallerProfile();
  const sendRequest = useSendMatchRequest();
  const superLikeMutation = useSuperLikeUser();
  const unsuperLikeMutation = useUnsuperLikeUser();
  const [superLiked, setSuperLiked] = useState<Set<string>>(new Set());
  const [cardReactions, setCardReactions] = useState<Record<string, string>>(
    {},
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<Filters>(defaultFilters);

  const [showSearch, setShowSearch] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeError, setNearMeError] = useState<string | null>(null);

  const handleNearMeToggle = async (value: boolean) => {
    if (!value) {
      setDetectedCity(null);
      setNearMeError(null);
      setPendingFilters(
        (f) => ({ ...f, nearMe: false, _detectedCity: undefined }) as Filters,
      );
      return;
    }
    setNearMeLoading(true);
    setNearMeError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
        }),
      );
      const { latitude, longitude } = pos.coords;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { "Accept-Language": "en" } },
      );
      const data = await res.json();
      const city =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.county ||
        "";
      setDetectedCity(city);
      setPendingFilters(
        (f) => ({ ...f, nearMe: true, _detectedCity: city }) as Filters,
      );
    } catch (err) {
      const isPermDenied = (err as { code?: number })?.code === 1;
      const msg = isPermDenied
        ? "Location permission denied. Please allow location access."
        : "Could not detect your location. Please try again.";
      setNearMeError(msg);
      setPendingFilters((f) => ({ ...f, nearMe: false }));
    } finally {
      setNearMeLoading(false);
    }
  };

  const myId = myProfile?.userId.toString();
  const visible = allProfiles.filter((p) => {
    if (p.userId.toString() === myId) return false;
    if (liked.has(p.userId.toString()) || skipped.has(p.userId.toString()))
      return false;
    return true;
  });
  const filtered = applyFilters(visible, searchTerm, filters);

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

  const handleSuperLike = async (p: Profile) => {
    const id = p.userId.toString();
    const isSuperLiked = superLiked.has(id);
    setSuperLiked((prev) => {
      const next = new Set(prev);
      if (isSuperLiked) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      if (isSuperLiked) {
        await unsuperLikeMutation.mutateAsync(p.userId);
      } else {
        await superLikeMutation.mutateAsync(p.userId);
      }
    } catch {}
  };

  const openFilter = () => {
    setPendingFilters(filters);
    setFilterOpen(true);
  };

  const applyFilter = () => {
    const f = { ...pendingFilters };
    if (f.nearMe && detectedCity) {
      (f as Filters & { _detectedCity?: string })._detectedCity = detectedCity;
    }
    setFilters(f);
    setFilterOpen(false);
  };

  const resetFilter = () => {
    setPendingFilters(defaultFilters);
    setFilters(defaultFilters);
    setFilterOpen(false);
  };

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => {
    if (k === "nearMe") return v === true;
    if (k === "employment") return v !== "any";
    return v !== "";
  });

  return (
    <div className="min-h-screen pb-4" style={{ background: "#0a0010" }}>
      {/* Keyframes */}
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
        @keyframes discover-shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .discover-text {
          background: linear-gradient(270deg, #e11d48, #f43f5e, #ec4899, #a855f7, #7c3aed, #e11d48);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: discover-shimmer 3s ease infinite;
        }
      `}</style>

      {/* Header row: Discover + Ring + LIVE + Search + Heart */}
      <div className="px-5 pt-12 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold discover-text">Discover</h1>
        <div className="flex items-center gap-2">
          {/* Ring icon - hidden */}
          {false && (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
            >
              <span className="text-white text-base">💍</span>
            </div>
          )}
          {/* LIVE button */}
          {onGoLive && (
            <button
              type="button"
              data-ocid="browse.primary_button"
              onClick={onGoLive}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white"
              style={{
                background: "#e11d48",
                boxShadow: "0 0 10px rgba(225,29,72,0.5)",
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </button>
          )}
          {/* Search toggle icon */}
          <button
            type="button"
            data-ocid="browse.toggle"
            onClick={() => setShowSearch((v) => !v)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              background: showSearch
                ? "linear-gradient(135deg,#e11d48,#7c3aed)"
                : "oklch(0.15 0.05 300)",
              border: showSearch ? "none" : "1px solid oklch(0.28 0.07 300)",
              boxShadow: showSearch
                ? "0 0 12px rgba(225,29,72,0.4)"
                : undefined,
            }}
          >
            <Search className="w-4 h-4 text-white" />
          </button>
          {/* Heart notification */}
          <NotificationBell onViewAll={onNotifications} useHeartIcon />
        </div>
      </div>

      {/* Collapsible search + filter row */}
      {showSearch && (
        <div className="px-5 mb-4 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, location..."
              data-ocid="browse.search_input"
              autoFocus
              className="pl-10 h-10 rounded-2xl text-sm"
              style={{
                background: "oklch(0.15 0.05 300)",
                border: "1px solid oklch(0.25 0.06 300)",
                color: "white",
              }}
            />
          </div>
          <button
            type="button"
            onClick={openFilter}
            data-ocid="browse.toggle"
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 relative transition-all active:scale-95"
            style={{
              background: hasActiveFilters
                ? "linear-gradient(135deg,#e11d48,#7c3aed)"
                : "oklch(0.15 0.05 300)",
              border: `1px solid ${hasActiveFilters ? "transparent" : "oklch(0.25 0.06 300)"}`,
            }}
          >
            <SlidersHorizontal className="w-4 h-4 text-white" />
            {hasActiveFilters && (
              <span
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
                style={{ background: "#e11d48" }}
              />
            )}
          </button>
        </div>
      )}

      {/* Stories Row */}
      <div className="mb-4">
        <StoriesRow myUserId={myId} />
      </div>

      {/* Filter Sheet */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent
          side="bottom"
          data-ocid="browse.sheet"
          className="rounded-t-3xl px-5 py-6 overflow-y-auto"
          style={{
            background: "oklch(0.11 0.05 300)",
            border: "none",
            maxHeight: "85vh",
            color: "white",
          }}
        >
          <SheetHeader className="mb-5">
            <SheetTitle className="text-white text-lg font-bold">
              Filter Profiles
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <Label className="text-white/70 text-xs mb-1.5 block">Name</Label>
              <Input
                value={pendingFilters.name}
                onChange={(e) =>
                  setPendingFilters((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Search by name..."
                data-ocid="browse.input"
                className="h-10 rounded-xl text-sm text-white placeholder:text-white/30"
                style={{
                  background: "oklch(0.17 0.06 300)",
                  border: "1px solid oklch(0.28 0.06 300)",
                }}
              />
            </div>

            {/* City */}
            <div>
              <Label className="text-white/70 text-xs mb-1.5 block">City</Label>
              <Input
                value={pendingFilters.city}
                onChange={(e) =>
                  setPendingFilters((f) => ({ ...f, city: e.target.value }))
                }
                placeholder="e.g. Mumbai, Delhi..."
                data-ocid="browse.input"
                className="h-10 rounded-xl text-sm text-white placeholder:text-white/30"
                style={{
                  background: "oklch(0.17 0.06 300)",
                  border: "1px solid oklch(0.28 0.06 300)",
                }}
              />
            </div>

            {/* Near Me */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <Label className="text-white/80 text-sm">Near Me</Label>
                <Switch
                  checked={pendingFilters.nearMe}
                  onCheckedChange={handleNearMeToggle}
                  disabled={nearMeLoading}
                  data-ocid="browse.switch"
                />
              </div>
              {nearMeLoading && (
                <p
                  data-ocid="browse.loading_state"
                  className="text-xs"
                  style={{ color: "#a78bfa" }}
                >
                  📍 Detecting your location…
                </p>
              )}
              {nearMeError && (
                <p
                  data-ocid="browse.error_state"
                  className="text-xs"
                  style={{ color: "#fb7185" }}
                >
                  {nearMeError}
                </p>
              )}
              {detectedCity && pendingFilters.nearMe && (
                <p
                  data-ocid="browse.success_state"
                  className="text-xs"
                  style={{ color: "#4ade80" }}
                >
                  📍 Filtering by: {detectedCity}
                </p>
              )}
            </div>

            {/* Skills */}
            <div>
              <Label className="text-white/70 text-xs mb-1.5 block">
                Skills / Interests
              </Label>
              <Input
                value={pendingFilters.skills}
                onChange={(e) =>
                  setPendingFilters((f) => ({ ...f, skills: e.target.value }))
                }
                placeholder="e.g. Cooking, Music..."
                data-ocid="browse.input"
                className="h-10 rounded-xl text-sm text-white placeholder:text-white/30"
                style={{
                  background: "oklch(0.17 0.06 300)",
                  border: "1px solid oklch(0.28 0.06 300)",
                }}
              />
            </div>

            {/* Qualification */}
            <div>
              <Label className="text-white/70 text-xs mb-1.5 block">
                Qualification
              </Label>
              <Input
                value={pendingFilters.qualification}
                onChange={(e) =>
                  setPendingFilters((f) => ({
                    ...f,
                    qualification: e.target.value,
                  }))
                }
                placeholder="e.g. B.Tech, MBA..."
                data-ocid="browse.input"
                className="h-10 rounded-xl text-sm text-white placeholder:text-white/30"
                style={{
                  background: "oklch(0.17 0.06 300)",
                  border: "1px solid oklch(0.28 0.06 300)",
                }}
              />
            </div>

            {/* Skin Color */}
            <div>
              <Label className="text-white/70 text-xs mb-1.5 block">
                Skin Color
              </Label>
              <Select
                value={pendingFilters.skinColor || "any"}
                onValueChange={(v) =>
                  setPendingFilters((f) => ({
                    ...f,
                    skinColor: v === "any" ? "" : v,
                  }))
                }
              >
                <SelectTrigger
                  data-ocid="browse.select"
                  className="h-10 rounded-xl text-sm text-white"
                  style={{
                    background: "oklch(0.17 0.06 300)",
                    border: "1px solid oklch(0.28 0.06 300)",
                  }}
                >
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent style={{ background: "oklch(0.17 0.06 300)" }}>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Wheatish">Wheatish</SelectItem>
                  <SelectItem value="Brown">Brown</SelectItem>
                  <SelectItem value="Dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Height */}
            <div>
              <Label className="text-white/70 text-xs mb-1.5 block">
                Height (cm)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={pendingFilters.heightMin}
                  onChange={(e) =>
                    setPendingFilters((f) => ({
                      ...f,
                      heightMin: e.target.value,
                    }))
                  }
                  placeholder="Min"
                  data-ocid="browse.input"
                  className="h-10 rounded-xl text-sm text-white placeholder:text-white/30"
                  style={{
                    background: "oklch(0.17 0.06 300)",
                    border: "1px solid oklch(0.28 0.06 300)",
                  }}
                />
                <Input
                  type="number"
                  value={pendingFilters.heightMax}
                  onChange={(e) =>
                    setPendingFilters((f) => ({
                      ...f,
                      heightMax: e.target.value,
                    }))
                  }
                  placeholder="Max"
                  data-ocid="browse.input"
                  className="h-10 rounded-xl text-sm text-white placeholder:text-white/30"
                  style={{
                    background: "oklch(0.17 0.06 300)",
                    border: "1px solid oklch(0.28 0.06 300)",
                  }}
                />
              </div>
            </div>

            {/* Weight */}
            <div>
              <Label className="text-white/70 text-xs mb-1.5 block">
                Weight (kg)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={pendingFilters.weightMin}
                  onChange={(e) =>
                    setPendingFilters((f) => ({
                      ...f,
                      weightMin: e.target.value,
                    }))
                  }
                  placeholder="Min"
                  data-ocid="browse.input"
                  className="h-10 rounded-xl text-sm text-white placeholder:text-white/30"
                  style={{
                    background: "oklch(0.17 0.06 300)",
                    border: "1px solid oklch(0.28 0.06 300)",
                  }}
                />
                <Input
                  type="number"
                  value={pendingFilters.weightMax}
                  onChange={(e) =>
                    setPendingFilters((f) => ({
                      ...f,
                      weightMax: e.target.value,
                    }))
                  }
                  placeholder="Max"
                  data-ocid="browse.input"
                  className="h-10 rounded-xl text-sm text-white placeholder:text-white/30"
                  style={{
                    background: "oklch(0.17 0.06 300)",
                    border: "1px solid oklch(0.28 0.06 300)",
                  }}
                />
              </div>
            </div>

            {/* Employment */}
            <div>
              <Label className="text-white/70 text-xs mb-2 block">
                Employment Status
              </Label>
              <RadioGroup
                value={pendingFilters.employment}
                onValueChange={(v) =>
                  setPendingFilters((f) => ({
                    ...f,
                    employment: v as Filters["employment"],
                  }))
                }
                className="flex gap-4"
              >
                {(["any", "employed", "jobless"] as const).map((val) => (
                  <div key={val} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={val}
                      id={`emp-${val}`}
                      data-ocid="browse.radio"
                      className="border-white/40"
                    />
                    <Label
                      htmlFor={`emp-${val}`}
                      className="text-white/80 text-sm capitalize"
                    >
                      {val === "any"
                        ? "Any"
                        : val === "employed"
                          ? "Employed"
                          : "Jobless"}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={resetFilter}
              data-ocid="browse.cancel_button"
              className="flex-1 h-11 rounded-2xl text-white/70 font-medium text-sm border"
              style={{
                borderColor: "oklch(0.3 0.06 300)",
                background: "transparent",
              }}
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={applyFilter}
              data-ocid="browse.primary_button"
              className="flex-1 h-11 rounded-2xl text-white font-semibold text-sm"
              style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
            >
              Apply Filters
            </button>
          </div>
        </SheetContent>
      </Sheet>

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
            {/* Online indicator on main card */}
            {filtered.indexOf(currentProfile) % 3 === 0 && (
              <div
                className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold text-white"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  backdropFilter: "blur(4px)",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Online
              </div>
            )}
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
                  {(() => {
                    const mutual = myProfile
                      ? currentProfile.interests.filter((i) =>
                          myProfile.interests.includes(i),
                        )
                      : [];
                    return mutual.length > 0 ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                          color: "white",
                        }}
                      >
                        💞 {mutual.length} common
                      </span>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </button>

          {/* Quick Card Reactions */}
          <div className="flex items-center justify-center gap-3 mb-3">
            {["❤️", "🔥", "😍"].map((emoji) => {
              const reacted =
                cardReactions[currentProfile.userId.toString()] === emoji;
              return (
                <button
                  key={emoji}
                  type="button"
                  data-ocid="browse.toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCardReactions((prev) => ({
                      ...prev,
                      [currentProfile.userId.toString()]: reacted ? "" : emoji,
                    }));
                  }}
                  className="w-12 h-12 rounded-full text-xl flex items-center justify-center transition-all active:scale-110"
                  style={{
                    background: reacted
                      ? "linear-gradient(135deg,#e11d48,#7c3aed)"
                      : "oklch(0.18 0.05 300)",
                    border: reacted ? "none" : "1px solid oklch(0.3 0.07 300)",
                    boxShadow: reacted
                      ? "0 4px 16px oklch(0.65 0.22 10 / 0.4)"
                      : undefined,
                    transform: reacted ? "scale(1.1)" : "scale(1)",
                  }}
                >
                  {emoji}
                </button>
              );
            })}
          </div>

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
            <button
              type="button"
              onClick={() => handleSuperLike(currentProfile)}
              data-ocid="browse.secondary_button"
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                background: superLiked.has(currentProfile.userId.toString())
                  ? "linear-gradient(135deg,#f59e0b,#d97706)"
                  : "oklch(0.18 0.05 300)",
                border: superLiked.has(currentProfile.userId.toString())
                  ? "none"
                  : "1px solid oklch(0.3 0.07 300)",
                boxShadow: superLiked.has(currentProfile.userId.toString())
                  ? "0 4px 16px rgba(245,158,11,0.5)"
                  : undefined,
              }}
            >
              <Star
                className="w-5 h-5"
                style={{
                  color: superLiked.has(currentProfile.userId.toString())
                    ? "white"
                    : "#fbbf24",
                  fill: superLiked.has(currentProfile.userId.toString())
                    ? "white"
                    : "none",
                }}
              />
            </button>
          </div>

          {/* More profiles - auto-scrolling horizontal strip */}
          {filtered.length > 1 && (
            <div className="mt-5">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-3">
                More Profiles
              </p>
              <div
                className="overflow-hidden"
                style={{
                  WebkitMaskImage:
                    "linear-gradient(to right,transparent,black 8%,black 92%,transparent)",
                }}
              >
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
                        {i % 3 === 0 && (
                          <span
                            className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-green-400"
                            style={{ border: "1.5px solid #0a0010" }}
                          />
                        )}
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
