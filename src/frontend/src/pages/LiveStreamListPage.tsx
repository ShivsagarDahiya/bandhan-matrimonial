import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Play, Radio, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { LiveStream } from "../backend";
import { useAppActor as useActor } from "../hooks/useAppActor";

interface LiveStreamListPageProps {
  onBack: () => void;
  onJoinLive: (
    liveId: bigint,
    isHost: boolean,
    liveMode?: "video" | "audio",
  ) => void;
}

function timeAgo(ts: bigint) {
  const diff = Date.now() - Number(ts / 1_000_000n);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function LiveStreamListPage({
  onBack,
  onJoinLive,
}: LiveStreamListPageProps) {
  const { actor } = useActor();
  const [lives, setLives] = useState<LiveStream[]>([]);
  const [showModePicker, setShowModePicker] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"video" | "audio">("video");
  const [title, setTitle] = useState("");
  const [matchesOnly, setMatchesOnly] = useState(false);
  const [starting, setStarting] = useState(false);

  const fetchLives = useCallback(async () => {
    if (!actor) return;
    try {
      const result = await actor.getActiveLives();
      setLives(result.filter((l) => l.isActive));
    } catch {}
  }, [actor]);

  useEffect(() => {
    fetchLives();
    const id = setInterval(fetchLives, 5000);
    return () => clearInterval(id);
  }, [fetchLives]);

  const handleStartLive = async () => {
    if (!actor || !title.trim()) return;
    setStarting(true);
    try {
      const liveId = await actor.startLive(title.trim(), matchesOnly);
      setShowStart(false);
      setShowModePicker(false);
      onJoinLive(liveId, true, selectedMode);
    } catch {
      setStarting(false);
    }
  };

  const handleModeSelect = (mode: "video" | "audio") => {
    setSelectedMode(mode);
    setShowModePicker(false);
    setShowStart(true);
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: "#0a0010" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{
          background: "rgba(10,0,16,0.95)",
          borderBottom: "1px solid oklch(0.2 0.07 300)",
        }}
      >
        <button
          type="button"
          data-ocid="live_list.button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
          style={{ background: "oklch(0.15 0.05 300)" }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-white font-bold text-lg">Live Streams</h1>
          <p className="text-white/50 text-xs">{lives.length} live now</p>
        </div>
        <Button
          data-ocid="live_list.primary_button"
          onClick={() => setShowModePicker(true)}
          className="ml-auto text-sm font-semibold h-9 px-4 rounded-full"
          style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
        >
          <Radio className="w-3.5 h-3.5 mr-1.5" />
          Go Live
        </Button>
      </div>

      {/* Grid */}
      <div className="px-4 pt-4">
        {lives.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-24 gap-4"
            data-ocid="live_list.empty_state"
          >
            <div className="text-6xl">📡</div>
            <p className="text-white/50 text-center">
              No live streams right now.
              <br />
              Be the first to go live!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {lives.map((live, idx) => (
              <button
                key={live.id.toString()}
                type="button"
                data-ocid={`live_list.item.${idx + 1}`}
                onClick={() => onJoinLive(live.id, false, "video")}
                className="relative rounded-2xl overflow-hidden text-left transition-transform active:scale-95"
                style={{
                  background: "oklch(0.14 0.06 300)",
                  border: "1px solid oklch(0.22 0.07 300)",
                  minHeight: 180,
                }}
              >
                {live.hostPhoto ? (
                  <img
                    src={live.hostPhoto}
                    alt={live.hostName}
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg,hsl(${(live.hostName.charCodeAt(0) * 10) % 360},60%,25%),hsl(${(live.hostName.charCodeAt(0) * 10 + 80) % 360},60%,15%))`,
                    }}
                  />
                )}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.85) 40%, transparent)",
                  }}
                />
                <div
                  className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{ background: "#e11d48" }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-white text-[10px] font-bold">LIVE</span>
                </div>
                {live.matchesOnly && (
                  <div
                    className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-amber-300"
                    style={{ background: "rgba(0,0,0,0.5)" }}
                  >
                    Matches
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-semibold text-sm leading-tight truncate">
                    {live.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={live.hostPhoto ?? undefined} />
                      <AvatarFallback className="text-[9px]">
                        {live.hostName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-white/70 text-xs truncate">
                      {live.hostName}
                    </span>
                    <span className="text-white/40 text-xs ml-auto">
                      {timeAgo(live.startedAt)}
                    </span>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.15)" }}
                  >
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mode Picker Sheet */}
      <Sheet open={showModePicker} onOpenChange={setShowModePicker}>
        <SheetContent
          side="bottom"
          data-ocid="live_list.sheet"
          className="rounded-t-3xl border-0 px-6 pb-10"
          style={{
            background: "oklch(0.11 0.05 300)",
            borderTop: "1px solid oklch(0.22 0.07 300)",
          }}
        >
          <SheetHeader className="mb-6">
            <SheetTitle className="text-white text-lg font-bold">
              Start a Live Session
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            <button
              type="button"
              data-ocid="live_list.primary_button"
              onClick={() => handleModeSelect("video")}
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
              style={{
                background: "oklch(0.16 0.07 300)",
                border: "1px solid oklch(0.28 0.1 300)",
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                }}
              >
                🎥
              </div>
              <div>
                <p className="text-white font-bold">Live Video</p>
                <p className="text-white/50 text-sm">
                  Start a video live stream — camera on
                </p>
              </div>
            </button>
            <button
              type="button"
              data-ocid="live_list.secondary_button"
              onClick={() => handleModeSelect("audio")}
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
              style={{
                background: "oklch(0.16 0.07 300)",
                border: "1px solid oklch(0.28 0.1 300)",
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg,#7c3aed,#2563eb)",
                }}
              >
                🎙️
              </div>
              <div>
                <p className="text-white font-bold">Live Audio</p>
                <p className="text-white/50 text-sm">
                  Audio-only stream — no camera needed
                </p>
              </div>
            </button>
            <button
              type="button"
              data-ocid="live_list.cancel_button"
              onClick={() => setShowModePicker(false)}
              className="w-full py-3 rounded-2xl text-white/50 text-sm text-center"
            >
              Browse Streams Instead
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Start Live Sheet */}
      <Sheet open={showStart} onOpenChange={setShowStart}>
        <SheetContent
          side="bottom"
          data-ocid="live_list.modal"
          className="rounded-t-3xl border-0 px-6 pb-10"
          style={{
            background: "oklch(0.11 0.05 300)",
            borderTop: "1px solid oklch(0.22 0.07 300)",
          }}
        >
          <SheetHeader className="mb-6">
            <SheetTitle className="text-white text-lg font-bold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {selectedMode === "audio"
                ? "Start Audio Stream 🎙️"
                : "Start Video Stream 🎥"}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/60 text-xs mb-1.5 block">
                Stream Title
              </Label>
              <Input
                data-ocid="live_list.input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What are you streaming about?"
                className="rounded-xl border-white/15 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>
            <div
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: "oklch(0.14 0.05 300)" }}
            >
              <div>
                <p className="text-white text-sm font-medium">Matches Only</p>
                <p className="text-white/40 text-xs mt-0.5">
                  Only your matches can join
                </p>
              </div>
              <Switch
                data-ocid="live_list.switch"
                checked={matchesOnly}
                onCheckedChange={setMatchesOnly}
              />
            </div>
            <Button
              data-ocid="live_list.submit_button"
              onClick={handleStartLive}
              disabled={starting || !title.trim()}
              className="w-full h-12 rounded-xl font-bold text-base"
              style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
            >
              {starting
                ? "Starting..."
                : selectedMode === "audio"
                  ? "Start Audio Live 🎙️"
                  : "Start Video Live 🔴"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
