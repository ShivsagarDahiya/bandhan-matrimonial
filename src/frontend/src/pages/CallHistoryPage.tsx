import { ArrowLeft, Phone, Video } from "lucide-react";
import { CallStatus, CallType } from "../backend";
import { useCallHistory } from "../hooks/useQueries";

interface Props {
  onBack: () => void;
}

function timeAgo(timestamp: bigint): string {
  const ms = Number(timestamp) / 1_000_000;
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function formatDuration(secs: bigint): string {
  const s = Number(secs);
  if (s === 0) return "--";
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function CallHistoryPage({ onBack }: Props) {
  const { data: history = [], isLoading } = useCallHistory();

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg,#1a0030 0%,#0a0010 100%)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-12 pb-4"
        style={{
          background:
            "linear-gradient(180deg,oklch(0.14 0.07 340) 0%,transparent 100%)",
          borderBottom: "1px solid oklch(0.22 0.06 330 / 0.4)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          data-ocid="callhistory.button"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "oklch(0.2 0.06 330)" }}
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-lg font-bold text-white">Call History</h1>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-2">
        {isLoading && (
          <div
            className="text-center py-12"
            data-ocid="callhistory.loading_state"
          >
            <div
              className="w-12 h-12 rounded-full border-2 animate-spin mx-auto"
              style={{
                borderColor: "oklch(0.65 0.22 10 / 0.3)",
                borderTopColor: "oklch(0.65 0.22 10)",
              }}
            />
          </div>
        )}

        {!isLoading && history.length === 0 && (
          <div
            className="text-center py-16"
            data-ocid="callhistory.empty_state"
          >
            <div className="text-5xl mb-4">📞</div>
            <p className="text-white/50 text-sm">No call history yet</p>
            <p className="text-white/30 text-xs mt-1">
              Your calls will appear here
            </p>
          </div>
        )}

        {history.map(([call, profile], idx) => {
          const isVideo = call.callType === CallType.video;
          const statusIcon =
            call.status === CallStatus.completed
              ? "✓"
              : call.status === CallStatus.declined
                ? "✗"
                : "↗";
          const statusColor =
            call.status === CallStatus.completed
              ? "#22c55e"
              : call.status === CallStatus.declined
                ? "#ef4444"
                : "#f59e0b";

          return (
            <div
              key={`${call.timestamp}-${idx}`}
              data-ocid={`callhistory.item.${idx + 1}`}
              className="flex items-center gap-3 p-3 rounded-2xl"
              style={{
                background: "oklch(0.14 0.06 330 / 0.5)",
                border: "1px solid oklch(0.22 0.06 330 / 0.3)",
              }}
            >
              <div
                className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                  padding: 2,
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
                    <span className="text-white font-bold text-lg">
                      {profile.name.charAt(0)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">
                  {profile.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {isVideo ? (
                    <Video className="w-3 h-3" style={{ color: statusColor }} />
                  ) : (
                    <Phone className="w-3 h-3" style={{ color: statusColor }} />
                  )}
                  <span
                    className="text-xs font-medium"
                    style={{ color: statusColor }}
                  >
                    {statusIcon}{" "}
                    {call.status === CallStatus.completed
                      ? "Completed"
                      : call.status === CallStatus.declined
                        ? "Declined"
                        : "Missed"}
                  </span>
                  <span className="text-white/40 text-xs">
                    · {formatDuration(call.durationSeconds)}
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-white/40 text-xs">
                  {timeAgo(call.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
