import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Monitor,
  Phone,
  RefreshCw,
} from "lucide-react";
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

export default function VideoCallPage({
  profile,
  isInitiator,
  onEnd,
  initialOfferData,
}: Props) {
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState(
    isInitiator ? "Calling..." : "Connecting...",
  );

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
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
            callType: CallType.video,
          });
        } catch {}
      }

      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      try {
        await logCall.mutateAsync({
          withUserId: profile.userId,
          callType: CallType.video,
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
            callType: CallType.video,
          });
        } catch {}
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
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
          video: true,
          audio: true,
        });
        if (cancelled) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = setupPC();
        for (const t of stream.getTracks()) pc.addTrack(t, stream);

        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await storeSignal.mutateAsync({
            toUserId: profile.userId,
            signalType: CallSignalType.offer,
            data: JSON.stringify(offer),
            callType: CallType.video,
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
            callType: CallType.video,
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

  const toggleCam = () => {
    setCamOff((c) => !c);
    for (const t of localStreamRef.current?.getVideoTracks() ?? [])
      t.enabled = camOff;
  };

  const switchCamera = async () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;
    const constraints = videoTrack.getConstraints();
    const currentFacing = constraints.facingMode;
    const newFacing = currentFacing === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = pcRef.current
        ?.getSenders()
        .find((s) => s.track?.kind === "video");
      await sender?.replaceTrack(newVideoTrack);
      videoTrack.stop();
      if (localStreamRef.current) {
        localStreamRef.current.removeTrack(videoTrack);
        localStreamRef.current.addTrack(newVideoTrack);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }
    } catch {}
  };

  const shareScreen = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenTrack = displayStream.getVideoTracks()[0];
      const sender = pcRef.current
        ?.getSenders()
        .find((s) => s.track?.kind === "video");
      await sender?.replaceTrack(screenTrack);
      screenTrack.onended = () => {
        const camTrack = localStreamRef.current?.getVideoTracks()[0];
        if (camTrack) sender?.replaceTrack(camTrack);
      };
    } catch {}
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "#0a0010" }}
    >
      {/* Remote video */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: connected ? 1 : 0 }}
      >
        <track kind="captions" />
      </video>

      {/* Remote placeholder when not connected */}
      {!connected && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: "linear-gradient(160deg,#1a0030,#0a0010)" }}
        >
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt={profile.name}
              className="w-32 h-32 rounded-full object-cover mb-4 opacity-70"
              style={{
                boxShadow: "0 0 60px oklch(0.65 0.22 10 / 0.5)",
                border: "3px solid oklch(0.65 0.22 10 / 0.5)",
              }}
            />
          ) : (
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-bold text-white mb-4"
              style={{
                background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                boxShadow: "0 0 60px oklch(0.65 0.22 10 / 0.4)",
              }}
            >
              {profile.name.charAt(0)}
            </div>
          )}
          <p className="text-white text-xl font-bold">{profile.name}</p>
          <p className="text-white/50 text-sm mt-2">{status}</p>
          <div className="flex gap-2 mt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  background: "oklch(0.65 0.22 10)",
                  animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom,rgba(10,0,16,0.7) 0%,transparent 20%,transparent 70%,rgba(10,0,16,0.9) 100%)",
        }}
      />

      {/* Local video PiP */}
      <div
        className="absolute bottom-28 right-4 w-28 h-40 rounded-2xl overflow-hidden z-10"
        style={{
          border: "2px solid oklch(0.65 0.22 10 / 0.5)",
          background: "linear-gradient(135deg,#7c3aed,#2563eb)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}
      >
        {camOff ? (
          <div className="w-full h-full flex items-center justify-center">
            <CameraOff className="w-8 h-8 text-white/50" />
          </div>
        ) : (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <track kind="captions" />
          </video>
        )}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 pt-12 pb-4 px-5 z-10 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{profile.name}</h2>
          <p className="text-white/60 text-sm">
            {connected ? fmt(seconds) : status}
          </p>
        </div>
        <div
          className="px-3 py-1 rounded-full text-xs text-white/70"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
        >
          {connected ? "HD" : "●"}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 pb-12 pt-4 px-8 z-10 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={toggleMute}
          data-ocid="videocall.toggle"
          className="w-13 h-13 w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: muted
              ? "oklch(0.65 0.22 10 / 0.4)"
              : "rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
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
          data-ocid="videocall.delete_button"
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
          onClick={toggleCam}
          data-ocid="videocall.toggle"
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: camOff
              ? "oklch(0.65 0.22 10 / 0.4)"
              : "rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
          }}
        >
          {camOff ? (
            <CameraOff className="w-6 h-6 text-white" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </button>

        <button
          type="button"
          onClick={switchCamera}
          data-ocid="videocall.secondary_button"
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
          }}
        >
          <RefreshCw className="w-6 h-6 text-white" />
        </button>

        <button
          type="button"
          onClick={shareScreen}
          data-ocid="videocall.secondary_button"
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Monitor className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}
