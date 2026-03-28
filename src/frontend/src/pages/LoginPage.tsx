import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

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
          {/* Header bar - Internet Identity only */}
          <div
            className="flex items-center px-5 py-3.5"
            style={{ borderBottom: "1px solid oklch(0.25 0.07 330 / 0.4)" }}
          >
            <span
              className="text-sm font-semibold"
              style={{
                color: "#f43f5e",
                borderBottom: "2px solid #f43f5e",
                paddingBottom: "2px",
              }}
            >
              🔐 Internet Identity
            </span>
          </div>

          <div className="p-5">
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
