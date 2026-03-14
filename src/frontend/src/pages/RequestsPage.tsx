import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  useAcceptRequest,
  useDeclineRequest,
  useMatchRequests,
} from "../hooks/useQueries";
import { playMatchReceivedSound } from "../hooks/useSound";

export default function RequestsPage() {
  const { data: requests = [], isLoading } = useMatchRequests();
  const accept = useAcceptRequest();
  const decline = useDeclineRequest();
  const prevCountRef = useRef<number | null>(null);

  const pending = requests.filter(([, s]) => s === "pending");
  const others = requests.filter(([, s]) => s !== "pending");

  // Play sound when new pending requests arrive
  useEffect(() => {
    if (isLoading) return;
    const count = pending.length;
    if (prevCountRef.current !== null && count > prevCountRef.current) {
      playMatchReceivedSound();
    }
    prevCountRef.current = count;
  }, [pending.length, isLoading]);

  return (
    <div className="min-h-screen pt-14 pb-4" style={{ background: "#0a0010" }}>
      <div className="px-5 py-4">
        <h1 className="text-2xl font-bold text-white">Match Requests</h1>
        <p className="text-white/50 text-sm mt-1">People interested in you</p>
      </div>
      {isLoading && (
        <div
          className="flex justify-center py-12"
          data-ocid="requests.loading_state"
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
      {!isLoading && pending.length === 0 && others.length === 0 && (
        <div className="text-center py-16" data-ocid="requests.empty_state">
          <p className="text-5xl mb-4">💌</p>
          <p className="text-white/60">No requests yet</p>
        </div>
      )}
      <div className="px-5 space-y-3">
        {pending.map(([profile], i) => (
          <div
            key={profile.userId.toString()}
            data-ocid={`requests.item.${i + 1}`}
            className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ background: "oklch(0.13 0.05 300)" }}
          >
            <div
              className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center relative"
              style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
            >
              {profile.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-xl font-bold">
                  {profile.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-semibold truncate">
                  {profile.name}
                </p>
              </div>
              <p className="text-white/50 text-sm">
                {Number(profile.age)} • {profile.location}
              </p>
              {profile.occupation && (
                <p className="text-white/40 text-xs">{profile.occupation}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await decline.mutateAsync(profile.userId);
                  } catch {}
                }}
                data-ocid={`requests.cancel_button.${i + 1}`}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: "oklch(0.2 0.05 300)",
                  border: "1px solid oklch(0.3 0.06 300)",
                }}
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await accept.mutateAsync(profile.userId);
                  } catch {}
                }}
                data-ocid={`requests.confirm_button.${i + 1}`}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                }}
              >
                <Check className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        ))}
        {others.length > 0 && (
          <p className="text-white/40 text-xs uppercase tracking-wider mt-4 mb-2">
            Past Requests
          </p>
        )}
        {others.map(([profile, status], i) => (
          <div
            key={profile.userId.toString()}
            data-ocid={`requests.item.${i + 10}`}
            className="flex items-center gap-3 p-4 rounded-2xl opacity-60"
            style={{ background: "oklch(0.11 0.04 300)" }}
          >
            <div
              className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
            >
              {profile.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold">
                  {profile.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{profile.name}</p>
              <p className="text-white/50 text-xs">
                {Number(profile.age)} • {profile.location}
              </p>
            </div>
            <span
              className="text-xs px-2 py-1 rounded-full"
              style={{
                background:
                  status === "accepted"
                    ? "oklch(0.3 0.15 145)"
                    : "oklch(0.25 0.08 10)",
                color: status === "accepted" ? "#4ade80" : "#f87171",
              }}
            >
              {String(status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
