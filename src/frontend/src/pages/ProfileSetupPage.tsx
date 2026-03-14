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
import { Camera, ChevronRight, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Gender } from "../backend";
import { useCreateProfile } from "../hooks/useQueries";
import { useStorageUpload } from "../hooks/useStorageUpload";

const INTERESTS = [
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
const HOBBIES = [
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
const RELIGIONS = [
  "Hindu",
  "Muslim",
  "Christian",
  "Sikh",
  "Buddhist",
  "Jain",
  "Zoroastrian",
  "Jewish",
  "Other",
];
const MARITAL = ["Never Married", "Divorced", "Widowed", "Separated"];

interface Props {
  onComplete: () => void;
}

export default function ProfileSetupPage({ onComplete }: Props) {
  const createProfile = useCreateProfile();
  const { uploadFile, uploading, progress } = useStorageUpload();
  const [step, setStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaFileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender>(Gender.male);
  const [maritalStatus, setMaritalStatus] = useState("Never Married");
  const [religion, setReligion] = useState("");
  const [motherTongue, setMotherTongue] = useState("");
  const [location, setLocation] = useState("");
  const [height, setHeight] = useState("");
  const [occupation, setOccupation] = useState("");
  const [bio, setBio] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [thoughts, setThoughts] = useState("");
  const [mood, setMood] = useState("Romantic");
  const [interests, setInterests] = useState<string[]>([]);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [education, setEducation] = useState("");
  const [favoriteMovies, setFavoriteMovies] = useState<string[]>([]);
  const [favoriteSongs, setFavoriteSongs] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>(Array(7).fill(""));
  const [mediaPreviews, setMediaPreviews] = useState<string[]>(
    Array(7).fill(""),
  );
  const [movieInput, setMovieInput] = useState("");
  const [songInput, setSongInput] = useState("");
  const [phone, setPhone] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState<boolean[]>(
    Array(7).fill(false),
  );

  const toggleTag = (
    arr: string[],
    set: (a: string[]) => void,
    val: string,
  ) => {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const addMovie = () => {
    if (movieInput.trim()) {
      setFavoriteMovies((p) => [...p, movieInput.trim()]);
      setMovieInput("");
    }
  };
  const addSong = () => {
    if (songInput.trim()) {
      setFavoriteSongs((p) => [...p, songInput.trim()]);
      setSongInput("");
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // Upload to storage
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
    // Preview
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

  const STEPS = [
    "Basic",
    "Location",
    "About",
    "Interests",
    "Favorites",
    "Media",
  ];

  const handleSubmit = async () => {
    if (!name || !age) {
      return;
    }
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
      toast.success("Profile created! Welcome to Bandhan 💍");
      onComplete();
    } catch {
      toast.error("Failed to create profile. Please try again.");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg,#0a0010 0%,#13001f 100%)" }}
    >
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center gap-2 mb-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="flex-1 h-1 rounded-full transition-all"
              style={{
                background:
                  i <= step
                    ? "linear-gradient(90deg,#e11d48,#7c3aed)"
                    : "oklch(0.25 0.05 300)",
              }}
            />
          ))}
        </div>
        <p className="text-white/50 text-xs mt-2">
          Step {step + 1} of {STEPS.length}:{" "}
          <span className="text-white/80">{STEPS[step]}</span>
        </p>
        <h1 className="text-2xl font-bold text-white mt-1">
          Create Your Profile
        </h1>
      </div>

      <div className="flex-1 px-5 pb-6 overflow-y-auto space-y-4">
        {/* Step 0: Basic */}
        {step === 0 && (
          <>
            <div className="flex justify-center mb-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden relative"
                style={{
                  background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                  padding: 2,
                }}
                data-ocid="profile.upload_button"
              >
                <div
                  className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
                  style={{ background: "#1a0a1e" }}
                >
                  {photoPreview || photoUrl ? (
                    <img
                      src={photoPreview || photoUrl}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-white/50" />
                  )}
                </div>
                {uploading && (
                  <div
                    className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.6)" }}
                  >
                    <span className="text-white text-xs font-bold">
                      {progress}%
                    </span>
                  </div>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <Field label="Full Name *">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                data-ocid="profile.input"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age *">
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="25"
                  min={18}
                  max={80}
                  data-ocid="profile.age.input"
                />
              </Field>
              <Field label="Gender">
                <Select
                  value={gender}
                  onValueChange={(v) => setGender(v as Gender)}
                >
                  <SelectTrigger data-ocid="profile.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Gender.male}>Male</SelectItem>
                    <SelectItem value={Gender.female}>Female</SelectItem>
                    <SelectItem value={Gender.other}>Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Phone Number (optional)">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                type="tel"
                data-ocid="profile.input"
              />
            </Field>
            <Field label="Marital Status">
              <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                <SelectTrigger data-ocid="profile.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARITAL.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Religion">
              <Select value={religion} onValueChange={setReligion}>
                <SelectTrigger data-ocid="profile.select">
                  <SelectValue placeholder="Select religion" />
                </SelectTrigger>
                <SelectContent>
                  {RELIGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Mother Tongue">
              <Input
                value={motherTongue}
                onChange={(e) => setMotherTongue(e.target.value)}
                placeholder="e.g. Hindi, Tamil..."
                data-ocid="profile.input"
              />
            </Field>
          </>
        )}

        {/* Step 1: Location */}
        {step === 1 && (
          <>
            <Field label="City / Location *">
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Mumbai, India"
                data-ocid="profile.location.input"
              />
            </Field>
            <Field label="Height">
              <Input
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="5'8&quot;"
                data-ocid="profile.input"
              />
            </Field>
            <Field label="Occupation">
              <Input
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="Software Engineer"
                data-ocid="profile.input"
              />
            </Field>
            <Field label="Education">
              <Input
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="B.Tech, MBA..."
                data-ocid="profile.input"
              />
            </Field>
          </>
        )}

        {/* Step 2: About */}
        {step === 2 && (
          <>
            <Field label="Bio">
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell others about yourself..."
                rows={3}
                data-ocid="profile.textarea"
                className="resize-none"
              />
            </Field>
            <Field label="About Me">
              <Textarea
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                placeholder="What makes you unique..."
                rows={3}
                data-ocid="profile.textarea"
                className="resize-none"
              />
            </Field>
            <Field label="Thoughts / Life Philosophy">
              <Input
                value={thoughts}
                onChange={(e) => setThoughts(e.target.value)}
                placeholder="What do you believe in?"
                data-ocid="profile.input"
              />
            </Field>
            <Field label="Current Mood">
              <div className="flex flex-wrap gap-2">
                {[
                  "Joyful",
                  "Romantic",
                  "Hopeful",
                  "Calm",
                  "Excited",
                  "Thoughtful",
                ].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(m)}
                    data-ocid="profile.toggle"
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                    style={
                      mood === m
                        ? {
                            background:
                              "linear-gradient(135deg,#e11d48,#7c3aed)",
                            color: "white",
                          }
                        : {
                            background: "oklch(0.18 0.05 300)",
                            color: "white",
                            border: "1px solid oklch(0.3 0.06 300)",
                          }
                    }
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Field>
          </>
        )}

        {/* Step 3: Interests & Hobbies */}
        {step === 3 && (
          <>
            <div>
              <Label className="text-white/80 text-sm mb-3 block">
                Interests (tap to select)
              </Label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleTag(interests, setInterests, i)}
                    data-ocid="profile.toggle"
                    className="px-3 py-1.5 rounded-full text-sm transition-all"
                    style={
                      interests.includes(i)
                        ? {
                            background:
                              "linear-gradient(135deg,#e11d48,#7c3aed)",
                            color: "white",
                          }
                        : {
                            background: "oklch(0.18 0.05 300)",
                            color: "white",
                            border: "1px solid oklch(0.3 0.06 300)",
                          }
                    }
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-white/80 text-sm mb-3 block">
                Hobbies (tap to select)
              </Label>
              <div className="flex flex-wrap gap-2">
                {HOBBIES.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => toggleTag(hobbies, setHobbies, h)}
                    data-ocid="profile.toggle"
                    className="px-3 py-1.5 rounded-full text-sm transition-all"
                    style={
                      hobbies.includes(h)
                        ? {
                            background:
                              "linear-gradient(135deg,#7c3aed,#2563eb)",
                            color: "white",
                          }
                        : {
                            background: "oklch(0.18 0.05 300)",
                            color: "white",
                            border: "1px solid oklch(0.3 0.06 300)",
                          }
                    }
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 4: Favorites */}
        {step === 4 && (
          <>
            <div>
              <Label className="text-white/80 text-sm mb-2 block">
                Favorite Movies
              </Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={movieInput}
                  onChange={(e) => setMovieInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addMovie()}
                  placeholder="Add a movie..."
                  data-ocid="profile.input"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={addMovie}
                  data-ocid="profile.primary_button"
                  className="px-3 rounded-xl text-white font-medium"
                  style={{
                    background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                  }}
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {favoriteMovies.map((m) => (
                  <span
                    key={m}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-white"
                    style={{ background: "oklch(0.2 0.07 10)" }}
                  >
                    {m}
                    <button
                      type="button"
                      onClick={() =>
                        setFavoriteMovies((p) => p.filter((x) => x !== m))
                      }
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-white/80 text-sm mb-2 block">
                Favorite Songs
              </Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={songInput}
                  onChange={(e) => setSongInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSong()}
                  placeholder="Add a song..."
                  data-ocid="profile.input"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={addSong}
                  data-ocid="profile.primary_button"
                  className="px-3 rounded-xl text-white font-medium"
                  style={{
                    background: "linear-gradient(135deg,#7c3aed,#2563eb)",
                  }}
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {favoriteSongs.map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-white"
                    style={{ background: "oklch(0.18 0.09 280)" }}
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() =>
                        setFavoriteSongs((p) => p.filter((x) => x !== s))
                      }
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 5: Media */}
        {step === 5 && (
          <>
            <p className="text-white/60 text-sm">
              Upload up to 7 photos or videos to your gallery
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => mediaFileRefs.current[i]?.click()}
                    data-ocid="profile.upload_button"
                    className="aspect-square rounded-2xl overflow-hidden flex items-center justify-center relative"
                    style={{
                      background: mediaUrls[i]
                        ? "transparent"
                        : "oklch(0.16 0.06 300)",
                      border: mediaUrls[i]
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
                        <Upload className="w-5 h-5 text-white/40" />
                        <span className="text-white/40 text-[10px]">
                          Photo {i + 1}
                        </span>
                      </div>
                    )}
                    {uploadingMedia[i] && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.6)" }}
                      >
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
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
          </>
        )}
      </div>

      <div className="px-5 pb-8 pt-2 flex gap-3">
        {step > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            data-ocid="profile.cancel_button"
            className="flex-1 h-12 rounded-2xl"
            style={{
              borderColor: "oklch(0.3 0.07 300)",
              color: "white",
              background: "transparent",
            }}
          >
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            data-ocid="profile.primary_button"
            className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold"
            style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createProfile.isPending}
            data-ocid="profile.submit_button"
            className="flex-1 h-12 rounded-2xl text-white font-semibold"
            style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
          >
            {createProfile.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              "Complete Profile 💍"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-white/80 text-sm">{label}</Label>
      {children}
    </div>
  );
}
