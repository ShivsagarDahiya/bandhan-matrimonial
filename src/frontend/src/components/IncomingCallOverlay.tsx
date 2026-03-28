import { Phone, PhoneOff, Video } from "lucide-react";
import { useEffect, useRef } from "react";
import { CallSignalType, CallType, type Profile } from "../backend";
import { useAppActor as useActor } from "../hooks/useAppActor";
import { playRingTone } from "../hooks/useSound";

interface IncomingCallInfo {
  fromProfile: Profile;
  callType: CallType;
  offerData: string;
}

interface Props {
  mutualMatches: Profile[];
  onIncomingCall: (info: IncomingCallInfo) => void;
  currentCallActive: boolean;
}

export interface IncomingCallOverlayProps {
  incomingCall: IncomingCallInfo | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallOverlay({
  incomingCall,
  onAccept,
  onDecline,
}: IncomingCallOverlayProps) {
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (incomingCall) {
      // Play ring immediately then every 2s
      playRingTone();
      ringIntervalRef.current = setInterval(() => {
        playRingTone();
      }, 2000);
    } else {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    }
    return () => {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    };
  }, [incomingCall]);

  if (!incomingCall) return null;
  const { fromProfile, callType } = incomingCall;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center pb-10 px-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      data-ocid="incoming-call.dialog"
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center gap-5"
        style={{
          background:
            "linear-gradient(160deg,oklch(0.15 0.08 340),oklch(0.1 0.05 300))",
          border: "1px solid oklch(0.3 0.1 340 / 0.5)",
          boxShadow: "0 20px 60px rgba(225,29,72,0.3)",
        }}
      >
        <div className="text-center">
          <p
            className="text-sm font-medium mb-1"
            style={{ color: "oklch(0.75 0.18 10)" }}
          >
            Incoming {callType === CallType.video ? "Video" : "Voice"} Call
          </p>
          <div
            className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3"
            style={{
              background: "linear-gradient(135deg,#e11d48,#7c3aed)",
              padding: 3,
              boxShadow: "0 0 40px oklch(0.65 0.22 10 / 0.4)",
            }}
          >
            <div
              className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: "#1a0a1e" }}
            >
              {fromProfile.photoUrl ? (
                <img
                  src={fromProfile.photoUrl}
                  alt={fromProfile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {fromProfile.name.charAt(0)}
                </span>
              )}
            </div>
          </div>
          <h3 className="text-xl font-bold text-white">{fromProfile.name}</h3>
          <p className="text-white/50 text-sm mt-1">
            {fromProfile.location || fromProfile.occupation}
          </p>
        </div>

        {/* Animated rings */}
        <div className="relative flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 60 + i * 30,
                height: 60 + i * 30,
                border: `1px solid oklch(0.65 0.22 10 / ${0.4 - i * 0.1})`,
                animation: `ping ${1.5 + i * 0.5}s cubic-bezier(0,0,0.2,1) ${i * 0.3}s infinite`,
              }}
            />
          ))}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center z-10"
            style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
          >
            {callType === CallType.video ? (
              <Video className="w-6 h-6 text-white" />
            ) : (
              <Phone className="w-6 h-6 text-white" />
            )}
          </div>
        </div>

        <div className="flex gap-8 mt-2">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onDecline}
              data-ocid="incoming-call.cancel_button"
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                background: "linear-gradient(135deg,#ef4444,#dc2626)",
                boxShadow: "0 4px 20px rgba(239,68,68,0.5)",
              }}
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
            <span className="text-white/50 text-xs">Decline</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onAccept}
              data-ocid="incoming-call.confirm_button"
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                background: "linear-gradient(135deg,#22c55e,#16a34a)",
                boxShadow: "0 4px 20px rgba(34,197,94,0.5)",
              }}
            >
              <Phone className="w-7 h-7 text-white" />
            </button>
            <span className="text-white/50 text-xs">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook: polls for incoming calls from mutual matches
export function useIncomingCallPoller({
  mutualMatches,
  onIncomingCall,
  currentCallActive,
}: Props) {
  const { actor } = useActor();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processedSignals = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (currentCallActive || !actor || mutualMatches.length === 0) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    pollingRef.current = setInterval(async () => {
      if (!actor) return;
      // Poll each match (up to 5 to avoid rate limiting)
      const toCheck = mutualMatches.slice(0, 5);
      for (const match of toCheck) {
        try {
          const signals = await actor.consumeCallSignals(match.userId);
          for (const sig of signals) {
            const key = sig.id.toString();
            if (
              sig.signalType === CallSignalType.offer &&
              !processedSignals.current.has(key)
            ) {
              processedSignals.current.add(key);
              onIncomingCall({
                fromProfile: match,
                callType: sig.callType,
                offerData: sig.data,
              });
            }
          }
        } catch {}
      }
    }, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [actor, mutualMatches, currentCallActive, onIncomingCall]);
}
