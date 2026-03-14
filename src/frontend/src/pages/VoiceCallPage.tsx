import { Mic, MicOff, Phone, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CallSignalType, CallStatus, CallType, type Profile } from "../backend";
import { useActor } from "../hooks/useActor";
import { useLogCall, useStoreCallSignal } from "../hooks/useQueries";

interface Props {
  profile: Profile;
  isInitiator: boolean;
  onEnd: () => void;
  initialOfferData?: string;
}

const STUN_SERVERS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
];

export default function VoiceCallPage({
  profile,
  isInitiator,
  onEnd,
  initialOfferData,
}: Props) {
  const [muted, setMuted] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState(
    isInitiator ? "Calling..." : "Connecting...",
  );

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endedRef = useRef(false);

  const { actor } = useActor();
  const storeSignal = useStoreCallSignal();
  const logCall = useLogCall();

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const endCall = useCallback(
    async (callStatus: CallStatus = CallStatus.completed) => {
      if (endedRef.current) return;
      endedRef.current = true;
      stopPolling();

      if (callStatus !== CallStatus.declined) {
        try {
          await storeSignal.mutateAsync({
            toUserId: profile.userId,
            signalType: CallSignalType.callEnd,
            data: "",
            callType: CallType.voice,
          });
        } catch {}
      }

      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      try {
        await logCall.mutateAsync({
          withUserId: profile.userId,
          callType: CallType.voice,
          durationSeconds: BigInt(duration),
          status: callStatus,
        });
      } catch {}

      pcRef.current?.close();
      pcRef.current = null;
      for (const t of localStreamRef.current?.getTracks() ?? []) t.stop();
      localStreamRef.current = null;
      onEnd();
    },
    [profile.userId, storeSignal, logCall, onEnd, stopPolling],
  );

  const setupPC = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: STUN_SERVERS.map((s) => ({ urls: s })),
    });
    pcRef.current = pc;

    pc.onicecandidate = async (e) => {
      if (e.candidate) {
        try {
          await storeSignal.mutateAsync({
            toUserId: profile.userId,
            signalType: CallSignalType.iceCandidate,
            data: JSON.stringify(e.candidate),
            callType: CallType.voice,
          });
        } catch {}
      }
    };

    pc.ontrack = (e) => {
      if (remoteAudioRef.current && e.streams[0]) {
        remoteAudioRef.current.srcObject = e.streams[0];
        setConnected(true);
        setStatus("Connected");
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        endCall(CallStatus.completed);
      }
    };

    return pc;
  }, [profile.userId, storeSignal, endCall]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount once
  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        if (cancelled) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        localStreamRef.current = stream;

        const pc = setupPC();
        for (const t of stream.getTracks()) pc.addTrack(t, stream);

        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await storeSignal.mutateAsync({
            toUserId: profile.userId,
            signalType: CallSignalType.offer,
            data: JSON.stringify(offer),
            callType: CallType.voice,
          });
          setStatus("Ringing...");
        } else if (initialOfferData) {
          const offer = JSON.parse(initialOfferData);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await storeSignal.mutateAsync({
            toUserId: profile.userId,
            signalType: CallSignalType.answer,
            data: JSON.stringify(answer),
            callType: CallType.voice,
          });
          setStatus("Connected");
        }

        // Poll for signals
        pollingRef.current = setInterval(async () => {
          if (!actor || endedRef.current) return;
          try {
            const signals = await actor.consumeCallSignals(profile.userId);
            for (const sig of signals) {
              if (sig.signalType === CallSignalType.answer && isInitiator) {
                const answer = JSON.parse(sig.data);
                if (pc.signalingState === "have-local-offer") {
                  await pc.setRemoteDescription(
                    new RTCSessionDescription(answer),
                  );
                }
              } else if (sig.signalType === CallSignalType.iceCandidate) {
                const candidate = JSON.parse(sig.data);
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch {}
              } else if (
                sig.signalType === CallSignalType.callEnd ||
                sig.signalType === CallSignalType.callDecline
              ) {
                endCall(CallStatus.completed);
              }
            }
          } catch {}
        }, 1500);
      } catch {
        if (!cancelled) {
          onEnd();
        }
      }
    }

    start();
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      stopPolling();
      pcRef.current?.close();
      for (const t of localStreamRef.current?.getTracks() ?? []) t.stop();
    };
  }, []);

  const toggleMute = () => {
    setMuted((m) => !m);
    for (const t of localStreamRef.current?.getAudioTracks() ?? [])
      t.enabled = muted;
  };

  const toggleSpeaker = () => {
    setSpeakerOff((s) => !s);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !speakerOff;
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between pb-16 pt-20 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg,#1a0030 0%,#0a0010 50%,#1a000f 100%)",
      }}
    >
      {/* Hidden audio for remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline>
        <track kind="captions" />
      </audio>

      {/* Animated rings */}
      <div className="absolute inset-0 pointer-events-none">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 280 + i * 80,
              height: 280 + i * 80,
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              border: `1px solid oklch(0.65 0.22 10 / ${0.2 - i * 0.05})`,
              animation: `ping ${1.8 + i * 0.6}s cubic-bezier(0,0,0.2,1) infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      {/* Status */}
      <div className="text-center z-10">
        <p className="text-white/50 text-sm mb-2">Voice Call</p>
        <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
        <p className="text-white/60 text-sm mt-1">
          {connected ? fmt(seconds) : status}
        </p>
      </div>

      {/* Avatar */}
      <div className="z-10 flex flex-col items-center gap-4">
        <div
          className="w-36 h-36 rounded-full overflow-hidden flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg,#e11d48,#7c3aed)",
            padding: 4,
            boxShadow: connected
              ? "0 0 80px oklch(0.65 0.22 10 / 0.6)"
              : "0 0 40px oklch(0.65 0.22 10 / 0.3)",
          }}
        >
          <div
            className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
            style={{ background: "#1a0a1e" }}
          >
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-5xl font-bold text-white">
                {profile.name.charAt(0)}
              </span>
            )}
          </div>
        </div>
        {connected && (
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-1.5 rounded-full"
                style={{
                  background: "oklch(0.75 0.18 10)",
                  animation: `soundWave 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                  height: `${12 + Math.random() * 20}px`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="z-10 flex items-center gap-6">
        <button
          type="button"
          onClick={toggleMute}
          data-ocid="voicecall.toggle"
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: muted
              ? "oklch(0.65 0.22 10 / 0.3)"
              : "oklch(0.22 0.05 300)",
          }}
        >
          {muted ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </button>

        <button
          type="button"
          onClick={() => endCall(CallStatus.completed)}
          data-ocid="voicecall.delete_button"
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: "linear-gradient(135deg,#ef4444,#dc2626)",
            boxShadow: "0 4px 20px rgba(239,68,68,0.5)",
          }}
        >
          <Phone className="w-7 h-7 text-white rotate-[135deg]" />
        </button>

        <button
          type="button"
          onClick={toggleSpeaker}
          data-ocid="voicecall.toggle"
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: speakerOff
              ? "oklch(0.65 0.22 10 / 0.3)"
              : "oklch(0.55 0.22 280 / 0.3)",
          }}
        >
          {speakerOff ? (
            <VolumeX className="w-6 h-6 text-white" />
          ) : (
            <Volume2 className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      <style>{`
        @keyframes soundWave {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1.6); }
        }
      `}</style>
    </div>
  );
}
