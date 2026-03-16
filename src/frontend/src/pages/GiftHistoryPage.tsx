import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Gift, Loader2 } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGiftsReceived, useGiftsSent } from "../hooks/useQueries";

interface VirtualGift {
  id: string;
  giftEmoji: string;
  giftName: string;
  toName: string;
  fromName: string;
  fromMe: boolean;
  timestamp: number;
}

interface Props {
  onBack: () => void;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function GiftCard({ gift }: { gift: VirtualGift }) {
  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-2xl mb-3"
      style={{
        background: "oklch(0.15 0.07 300 / 0.8)",
        border: "1px solid oklch(0.25 0.08 300 / 0.4)",
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.30 0.15 10 / 0.4), oklch(0.25 0.12 300 / 0.4))",
        }}
      >
        {gift.giftEmoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-base">{gift.giftName}</p>
        <p className="text-white/55 text-sm mt-0.5">
          {gift.fromMe ? `To ${gift.toName}` : `From ${gift.fromName}`}
        </p>
      </div>
      <span className="text-white/35 text-xs flex-shrink-0">
        {relativeTime(gift.timestamp)}
      </span>
    </div>
  );
}

export default function GiftHistoryPage({ onBack }: Props) {
  const { data: sentData, isLoading: loadingSent } = useGiftsSent();
  const { data: receivedData, isLoading: loadingReceived } = useGiftsReceived();

  const isLoading = loadingSent || loadingReceived;

  const received: VirtualGift[] = (receivedData ?? []).map((r) => ({
    id: r.id.toString(),
    giftEmoji: r.giftEmoji,
    giftName: r.giftName,
    toName: "",
    fromName: `${r.fromUserId.toString().slice(0, 8)}…`,
    fromMe: false,
    timestamp: Number(r.timestamp) / 1_000_000,
  }));

  const sent: VirtualGift[] = (sentData ?? []).map((s) => ({
    id: s.id.toString(),
    giftEmoji: s.giftEmoji,
    giftName: s.giftName,
    toName: `${s.toUserId.toString().slice(0, 8)}…`,
    fromName: "",
    fromMe: true,
    timestamp: Number(s.timestamp) / 1_000_000,
  }));

  return (
    <div className="min-h-screen pb-8" style={{ background: "#0a0010" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-12 pb-4"
        style={{
          background: "linear-gradient(180deg, #12001e 0%, #0a0010 100%)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          data-ocid="gift_history.back_button"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "oklch(0.16 0.06 300)" }}
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5" style={{ color: "oklch(0.70 0.20 10)" }} />
          <h1 className="text-xl font-bold text-white tracking-tight">
            Gift History
          </h1>
        </div>
      </div>

      <div className="px-4">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: "oklch(0.70 0.20 10)" }}
            />
          </div>
        )}
        {!isLoading && (
          <Tabs defaultValue="received">
            <TabsList
              className="w-full mb-5 rounded-2xl"
              style={{
                background: "oklch(0.15 0.06 300)",
                border: "1px solid oklch(0.22 0.06 300)",
              }}
            >
              <TabsTrigger
                value="received"
                data-ocid="gift_history.received.tab"
                className="flex-1 rounded-xl text-white/60 data-[state=active]:text-white"
                style={
                  {
                    "--tab-active-bg":
                      "linear-gradient(135deg,#e11d48,#7c3aed)",
                  } as React.CSSProperties
                }
              >
                Received {received.length > 0 && `(${received.length})`}
              </TabsTrigger>
              <TabsTrigger
                value="sent"
                data-ocid="gift_history.sent.tab"
                className="flex-1 rounded-xl text-white/60 data-[state=active]:text-white"
              >
                Sent {sent.length > 0 && `(${sent.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="received">
              {received.length === 0 ? (
                <div
                  data-ocid="gift_history.received.empty_state"
                  className="text-center py-16"
                >
                  <div className="text-5xl mb-4">🎁</div>
                  <p className="text-white/50 text-sm">No gifts received yet</p>
                  <p className="text-white/30 text-xs mt-1">
                    Gifts from your matches will appear here
                  </p>
                </div>
              ) : (
                <div data-ocid="gift_history.received.list">
                  {received.map((gift, i) => (
                    <div
                      key={gift.id}
                      data-ocid={`gift_history.received.item.${i + 1}`}
                    >
                      <GiftCard gift={gift} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sent">
              {sent.length === 0 ? (
                <div
                  data-ocid="gift_history.sent.empty_state"
                  className="text-center py-16"
                >
                  <div className="text-5xl mb-4">💝</div>
                  <p className="text-white/50 text-sm">No gifts sent yet</p>
                  <p className="text-white/30 text-xs mt-1">
                    Send a gift to your matches from their profile
                  </p>
                </div>
              ) : (
                <div data-ocid="gift_history.sent.list">
                  {sent.map((gift, i) => (
                    <div
                      key={gift.id}
                      data-ocid={`gift_history.sent.item.${i + 1}`}
                    >
                      <GiftCard gift={gift} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
