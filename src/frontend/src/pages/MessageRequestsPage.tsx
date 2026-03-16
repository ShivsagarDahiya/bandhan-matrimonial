import { ChevronLeft, Inbox } from "lucide-react";
import { useState } from "react";

const ALL_REQUESTS = [
  {
    id: "r1",
    name: "Sneha Verma",
    preview: "Hi! I saw your profile and...",
    time: "2m",
  },
  {
    id: "r2",
    name: "Riya Sharma",
    preview: "Would love to connect 😊",
    time: "15m",
  },
  {
    id: "r3",
    name: "Kavya Nair",
    preview: "Hey, are you from Mumbai?",
    time: "1h",
  },
  {
    id: "r4",
    name: "Priya Patel",
    preview: "Your profile is amazing!",
    time: "3h",
  },
];

function loadIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveIds(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify(ids));
}

interface Props {
  onBack: () => void;
  onOpenConversation?: (req: { id: string; name: string }) => void;
}

export default function MessageRequestsPage({
  onBack,
  onOpenConversation,
}: Props) {
  const [deleted, setDeleted] = useState<string[]>(() =>
    loadIds("msgRequestsDeleted"),
  );
  const [accepted, setAccepted] = useState<string[]>(() =>
    loadIds("msgRequestsAccepted"),
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const visible = ALL_REQUESTS.filter(
    (r) => !deleted.includes(r.id) && !accepted.includes(r.id),
  );

  const handleAccept = (id: string, name: string) => {
    const next = [...accepted, id];
    setAccepted(next);
    saveIds("msgRequestsAccepted", next);

    if (onOpenConversation) {
      // Navigate immediately to the conversation
      onOpenConversation({ id, name });
    } else {
      // Show feedback toast only when no navigation handler provided
      setFeedback(`${name} accepted!`);
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  const handleDelete = (id: string) => {
    const next = [...deleted, id];
    setDeleted(next);
    saveIds("msgRequestsDeleted", next);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0a0010" }}
      data-ocid="msgreq.page"
    >
      {/* Header */}
      <div
        className="flex items-center px-4 pt-12 pb-4 gap-3"
        style={{ background: "#0a0010" }}
      >
        <button
          type="button"
          data-ocid="msgreq.back_button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "oklch(0.15 0.05 300)" }}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 flex items-center justify-center">
          <h1 className="text-lg font-bold text-white tracking-tight">
            Message Requests
          </h1>
        </div>
        {/* Spacer to center title */}
        <div className="w-9 h-9 flex-shrink-0" />
      </div>

      {/* Inline feedback toast */}
      {feedback && (
        <div
          className="mx-4 mb-3 py-2.5 px-4 rounded-2xl text-sm font-medium text-white text-center"
          style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
        >
          {feedback}
        </div>
      )}

      {/* Info banner */}
      <div
        className="mx-4 mb-4 py-3 px-4 rounded-2xl"
        style={{
          background: "oklch(0.14 0.05 300)",
          border: "1px solid oklch(0.22 0.06 300)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
          >
            <Inbox className="w-4 h-4 text-white" />
          </div>
          <p className="text-white/60 text-xs leading-relaxed">
            These are messages from people outside your matches. Accept to move
            to your main inbox, or delete to remove them.
          </p>
        </div>
      </div>

      {/* Request list */}
      {visible.length === 0 ? (
        <div
          className="flex-1 flex flex-col items-center justify-center py-16 px-8"
          data-ocid="msgreq.empty_state"
        >
          <span className="text-5xl mb-4">📭</span>
          <p className="text-white font-semibold text-lg mb-2">
            No message requests
          </p>
          <p className="text-white/40 text-sm text-center leading-relaxed">
            When someone outside your matches sends you a message, it will
            appear here.
          </p>
        </div>
      ) : (
        <div className="flex-1 px-4 space-y-3">
          {visible.map((req, i) => (
            <div
              key={req.id}
              data-ocid={`msgreq.item.${i + 1}`}
              className="rounded-2xl p-4"
              style={{ background: "oklch(0.15 0.05 300)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                  }}
                >
                  {req.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{req.name}</p>
                  <p className="text-white/50 text-xs truncate">
                    {req.preview}
                  </p>
                </div>
                <span className="text-white/30 text-[10px] flex-shrink-0">
                  {req.time}
                </span>
              </div>
              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  data-ocid={`msgreq.accept_button.${i + 1}`}
                  onClick={() => handleAccept(req.id, req.name)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                  }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  data-ocid={`msgreq.delete_button.${i + 1}`}
                  onClick={() => handleDelete(req.id)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{
                    background: "transparent",
                    border: "1px solid oklch(0.28 0.06 300)",
                    color: "rgba(255,255,255,0.55)",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
