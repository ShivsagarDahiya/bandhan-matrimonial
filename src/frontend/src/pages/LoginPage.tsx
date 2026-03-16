import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const INTERESTS = [
  "Music",
  "Travel",
  "Cooking",
  "Fitness",
  "Reading",
  "Photography",
  "Movies",
  "Sports",
  "Art",
  "Dancing",
  "Gaming",
  "Nature",
];

const HEARTS = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  left: `${5 + ((i * 17 + i * i * 3) % 90)}%`,
  size: 16 + ((i * 7) % 25),
  duration: 4 + ((i * 3) % 5),
  delay: (i * 0.4) % 5,
  opacity: 0.4 + (i % 5) * 0.08,
}));

export default function LoginPage() {
  const { login, isLoggingIn } = useInternetIdentity();
  const [tab, setTab] = useState<"ii" | "email">("ii");
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");
  const [step, setStep] = useState<"form" | "interests">("form");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    emailOrPhone: "",
    password: "",
    confirm: "",
  });
  const [signInData, setSignInData] = useState({
    emailOrPhone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleInterest = (i: string) => {
    setSelectedInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );
  };

  const handleRegisterNext = () => {
    setError("");
    if (!formData.name.trim()) return setError("Name is required");
    if (!formData.emailOrPhone.trim())
      return setError("Email or phone is required");
    if (formData.password.length < 6)
      return setError("Password must be at least 6 characters");
    if (formData.password !== formData.confirm)
      return setError("Passwords do not match");
    setStep("interests");
  };

  const handleRegister = () => {
    setError("");
    if (selectedInterests.length < 3)
      return setError("Pick at least 3 interests");
    let users: Record<string, unknown>[] = [];
    try {
      users = JSON.parse(localStorage.getItem("bandhan_users") || "[]");
    } catch {
      localStorage.removeItem("bandhan_users");
    }
    const exists = users.find(
      (u: any) => u.emailOrPhone === formData.emailOrPhone,
    );
    if (exists) return setError("Account already exists. Please sign in.");
    const user = {
      name: formData.name,
      emailOrPhone: formData.emailOrPhone,
      password: formData.password,
      interests: selectedInterests,
      type: "local",
    };
    users.push(user);
    localStorage.setItem("bandhan_users", JSON.stringify(users));
    localStorage.setItem("bandhan_session", JSON.stringify(user));
    setLoading(true);
    setTimeout(() => window.location.reload(), 500);
  };

  const handleSignIn = () => {
    setError("");
    if (!signInData.emailOrPhone.trim() || !signInData.password)
      return setError("All fields required");
    let users: any[] = [];
    try {
      users = JSON.parse(localStorage.getItem("bandhan_users") || "[]");
    } catch {
      localStorage.removeItem("bandhan_users");
    }
    const user = users.find(
      (u) =>
        u.emailOrPhone === signInData.emailOrPhone &&
        u.password === signInData.password,
    );
    if (!user) return setError("Invalid credentials");
    localStorage.setItem("bandhan_session", JSON.stringify(user));
    setLoading(true);
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.08 0.04 340) 0%, oklch(0.1 0.06 300) 50%, oklch(0.08 0.05 260) 100%)",
      }}
    >
      <style>{`
        @keyframes floatHeart {
          0% { transform: translateY(100vh) scale(0.8) rotate(-15deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.8; }
          100% { transform: translateY(-120px) scale(1.1) rotate(15deg); opacity: 0; }
        }
        @keyframes coupleGlow {
          0%, 100% { filter: drop-shadow(0 0 16px #f43f5e88); }
          50% { filter: drop-shadow(0 0 32px #a855f7cc); }
        }
        .heart-float { position: absolute; pointer-events: none; z-index: 0; animation: floatHeart linear infinite; }
        .couple-glow { animation: coupleGlow 2.5s ease-in-out infinite; }
      `}</style>

      {/* Floating hearts */}
      {HEARTS.map((h) => (
        <span
          key={h.id}
          className="heart-float"
          style={{
            left: h.left,
            bottom: "-40px",
            fontSize: `${h.size}px`,
            animationDuration: `${h.duration}s`,
            animationDelay: `${h.delay}s`,
            opacity: h.opacity,
          }}
        >
          {h.id % 3 === 0 ? "❤️" : h.id % 3 === 1 ? "💕" : "💗"}
        </span>
      ))}

      {/* Couple silhouette hero */}
      <div className="relative z-10 flex flex-col items-center pt-12 pb-4 px-6">
        <div className="couple-glow text-[72px] mb-2 select-none">👫</div>
        <h1
          className="font-display text-4xl font-bold mb-1"
          style={{
            background: "linear-gradient(135deg,#f43f5e,#ec4899,#a855f7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Bandhan
        </h1>
        <p className="text-white/60 text-sm italic mb-1">Matrimonial</p>
        <p className="text-white/40 text-xs text-center max-w-xs">
          Where hearts meet and lifelong bonds begin
        </p>
      </div>

      {/* Auth Card */}
      <div className="relative z-10 flex-1 flex flex-col px-4 pb-8">
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: "oklch(0.12 0.05 320 / 0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid oklch(0.3 0.1 330 / 0.4)",
            boxShadow: "0 8px 48px oklch(0.5 0.25 10 / 0.2)",
          }}
        >
          {/* Tab switcher */}
          <div
            className="flex"
            style={{ borderBottom: "1px solid oklch(0.25 0.07 330 / 0.4)" }}
          >
            <button
              type="button"
              data-ocid="login.tab"
              onClick={() => setTab("ii")}
              className="flex-1 py-3.5 text-sm font-semibold transition-all"
              style={
                tab === "ii"
                  ? { color: "#f43f5e", borderBottom: "2px solid #f43f5e" }
                  : {
                      color: "oklch(0.55 0.05 330)",
                      borderBottom: "2px solid transparent",
                    }
              }
            >
              🔐 Internet Identity
            </button>
            <button
              type="button"
              data-ocid="login.tab"
              onClick={() => setTab("email")}
              className="flex-1 py-3.5 text-sm font-semibold transition-all"
              style={
                tab === "email"
                  ? { color: "#f43f5e", borderBottom: "2px solid #f43f5e" }
                  : {
                      color: "oklch(0.55 0.05 330)",
                      borderBottom: "2px solid transparent",
                    }
              }
            >
              📧 Email / Phone
            </button>
          </div>

          <div className="p-5">
            {tab === "ii" && (
              <div className="flex flex-col items-center gap-4">
                <div className="grid grid-cols-3 gap-3 w-full mb-2">
                  {[
                    { emoji: "🔍", label: "Browse" },
                    { emoji: "💌", label: "Connect" },
                    { emoji: "❤️", label: "Match" },
                  ].map((feat) => (
                    <div
                      key={feat.label}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl"
                      style={{ background: "oklch(0.17 0.06 330)" }}
                    >
                      <span className="text-2xl">{feat.emoji}</span>
                      <span className="text-[10px] text-white/50">
                        {feat.label}
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  data-ocid="login.primary_button"
                  onClick={() => login()}
                  disabled={isLoggingIn}
                  size="lg"
                  className="w-full h-13 text-base font-semibold rounded-2xl"
                  style={{
                    background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                    border: "none",
                  }}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>Sign in with Internet Identity</>
                  )}
                </Button>
                <p className="text-xs text-white/30 text-center">
                  Secure · Decentralized · Private
                </p>
              </div>
            )}

            {tab === "email" && (
              <div>
                {/* Sign in / Register toggle */}
                <div
                  className="flex gap-1 p-1 rounded-xl mb-5"
                  style={{ background: "oklch(0.17 0.06 330)" }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signin");
                      setStep("form");
                      setError("");
                    }}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={
                      authMode === "signin"
                        ? {
                            background:
                              "linear-gradient(135deg,#e11d48,#7c3aed)",
                            color: "white",
                          }
                        : { color: "oklch(0.55 0.05 330)" }
                    }
                    data-ocid="login.toggle"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setStep("form");
                      setError("");
                    }}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={
                      authMode === "register"
                        ? {
                            background:
                              "linear-gradient(135deg,#e11d48,#7c3aed)",
                            color: "white",
                          }
                        : { color: "oklch(0.55 0.05 330)" }
                    }
                    data-ocid="login.toggle"
                  >
                    Register
                  </button>
                </div>

                {error && (
                  <div
                    className="mb-3 px-3 py-2 rounded-xl text-xs text-red-300"
                    style={{ background: "oklch(0.2 0.08 20)" }}
                    data-ocid="login.error_state"
                  >
                    {error}
                  </div>
                )}

                {authMode === "signin" && (
                  <div className="space-y-3">
                    <Input
                      data-ocid="login.input"
                      placeholder="Email or Phone number"
                      value={signInData.emailOrPhone}
                      onChange={(e) =>
                        setSignInData((p) => ({
                          ...p,
                          emailOrPhone: e.target.value,
                        }))
                      }
                      className="h-12 rounded-xl text-white"
                      style={{
                        background: "oklch(0.17 0.05 320)",
                        border: "1px solid oklch(0.28 0.07 330)",
                        color: "white",
                      }}
                    />
                    <Input
                      data-ocid="login.input"
                      type="password"
                      placeholder="Password"
                      value={signInData.password}
                      onChange={(e) =>
                        setSignInData((p) => ({
                          ...p,
                          password: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                      className="h-12 rounded-xl text-white"
                      style={{
                        background: "oklch(0.17 0.05 320)",
                        border: "1px solid oklch(0.28 0.07 330)",
                        color: "white",
                      }}
                    />
                    <Button
                      data-ocid="login.submit_button"
                      onClick={handleSignIn}
                      disabled={loading}
                      className="w-full h-12 rounded-xl font-semibold"
                      style={{
                        background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                        border: "none",
                      }}
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </div>
                )}

                {authMode === "register" && step === "form" && (
                  <div className="space-y-3">
                    <Input
                      data-ocid="login.input"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, name: e.target.value }))
                      }
                      className="h-12 rounded-xl"
                      style={{
                        background: "oklch(0.17 0.05 320)",
                        border: "1px solid oklch(0.28 0.07 330)",
                        color: "white",
                      }}
                    />
                    <Input
                      data-ocid="login.input"
                      placeholder="Email or Phone number"
                      value={formData.emailOrPhone}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          emailOrPhone: e.target.value,
                        }))
                      }
                      className="h-12 rounded-xl"
                      style={{
                        background: "oklch(0.17 0.05 320)",
                        border: "1px solid oklch(0.28 0.07 330)",
                        color: "white",
                      }}
                    />
                    <Input
                      data-ocid="login.input"
                      type="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, password: e.target.value }))
                      }
                      className="h-12 rounded-xl"
                      style={{
                        background: "oklch(0.17 0.05 320)",
                        border: "1px solid oklch(0.28 0.07 330)",
                        color: "white",
                      }}
                    />
                    <Input
                      data-ocid="login.input"
                      type="password"
                      placeholder="Confirm Password"
                      value={formData.confirm}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, confirm: e.target.value }))
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleRegisterNext()
                      }
                      className="h-12 rounded-xl"
                      style={{
                        background: "oklch(0.17 0.05 320)",
                        border: "1px solid oklch(0.28 0.07 330)",
                        color: "white",
                      }}
                    />
                    <Button
                      data-ocid="login.primary_button"
                      onClick={handleRegisterNext}
                      className="w-full h-12 rounded-xl font-semibold"
                      style={{
                        background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                        border: "none",
                      }}
                    >
                      Next — Pick Interests
                    </Button>
                  </div>
                )}

                {authMode === "register" && step === "interests" && (
                  <div>
                    <p className="text-white/70 text-sm mb-1 font-semibold">
                      Pick your interests
                    </p>
                    <p className="text-white/40 text-xs mb-4">
                      Choose at least 3 to continue
                    </p>
                    <div className="flex flex-wrap gap-2 mb-5">
                      {INTERESTS.map((interest) => {
                        const active = selectedInterests.includes(interest);
                        return (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => toggleInterest(interest)}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                            style={
                              active
                                ? {
                                    background:
                                      "linear-gradient(135deg,#e11d48,#7c3aed)",
                                    color: "white",
                                  }
                                : {
                                    background: "oklch(0.18 0.06 330)",
                                    color: "oklch(0.65 0.1 330)",
                                    border: "1px solid oklch(0.28 0.07 330)",
                                  }
                            }
                          >
                            {interest}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStep("form")}
                        className="flex-none px-4 py-3 rounded-xl text-sm text-white/50"
                        style={{ background: "oklch(0.17 0.05 320)" }}
                      >
                        ← Back
                      </button>
                      <Button
                        data-ocid="login.submit_button"
                        onClick={handleRegister}
                        disabled={loading}
                        className="flex-1 h-12 rounded-xl font-semibold"
                        style={{
                          background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                          border: "none",
                        }}
                      >
                        {loading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          "Create Account ❤️"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <footer className="text-center pt-6">
          <p className="text-xs text-white/25">
            © 2026. I would ❤️ using Bandhan
          </p>
        </footer>
      </div>
    </div>
  );
}
