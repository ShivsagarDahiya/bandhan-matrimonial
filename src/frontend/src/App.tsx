import { Toaster } from "@/components/ui/sonner";
import { useCallback, useEffect, useState } from "react";
import type { Profile } from "./backend";
import { CallType } from "./backend";
import { CallSignalType } from "./backend";
import BottomNav from "./components/BottomNav";
import {
  IncomingCallOverlay,
  useIncomingCallPoller,
} from "./components/IncomingCallOverlay";
import NotificationBell from "./components/NotificationBell";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useCallerProfile,
  useIsAdmin,
  useMutualMatches,
  useStoreCallSignal,
} from "./hooks/useQueries";
import AdminPage from "./pages/AdminPage";
import BrowsePage from "./pages/BrowsePage";
import CallHistoryPage from "./pages/CallHistoryPage";
import ChatPage from "./pages/ChatPage";
import ConversationPage from "./pages/ConversationPage";
import LoginPage from "./pages/LoginPage";
import MatchesPage from "./pages/MatchesPage";
import MyProfilePage from "./pages/MyProfilePage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import RequestsPage from "./pages/RequestsPage";
import VideoCallPage from "./pages/VideoCallPage";
import ViewProfilePage from "./pages/ViewProfilePage";
import VoiceCallPage from "./pages/VoiceCallPage";

export type Page =
  | "browse"
  | "requests"
  | "matches"
  | "chat"
  | "conversation"
  | "profile"
  | "admin"
  | "viewProfile"
  | "voiceCall"
  | "videoCall"
  | "callHistory";

interface IncomingCallInfo {
  fromProfile: Profile;
  callType: CallType;
  offerData: string;
}

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const [currentPage, setCurrentPage] = useState<Page>("browse");
  const [selectedMatchForChat, setSelectedMatchForChat] =
    useState<Profile | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isInitiator, setIsInitiator] = useState(true);
  const [initialOfferData, setInitialOfferData] = useState<
    string | undefined
  >();
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(
    null,
  );

  const { data: profile, isLoading: profileLoading } = useCallerProfile();
  const { data: isAdmin } = useIsAdmin();
  const { data: mutualMatches = [] } = useMutualMatches();
  const storeSignal = useStoreCallSignal();

  const isLoggedIn = !!identity;
  const needsProfile = isLoggedIn && !profileLoading && profile === null;
  const isInCall = currentPage === "voiceCall" || currentPage === "videoCall";

  useEffect(() => {
    if (!isLoggedIn) setCurrentPage("browse");
  }, [isLoggedIn]);

  const handleIncomingCall = useCallback((info: IncomingCallInfo) => {
    setIncomingCall(info);
  }, []);

  useIncomingCallPoller({
    mutualMatches,
    onIncomingCall: handleIncomingCall,
    currentCallActive: isInCall,
  });

  const handleAcceptCall = () => {
    if (!incomingCall) return;
    setSelectedProfile(incomingCall.fromProfile);
    setIsInitiator(false);
    setInitialOfferData(incomingCall.offerData);
    setCurrentPage(
      incomingCall.callType === CallType.video ? "videoCall" : "voiceCall",
    );
    setIncomingCall(null);
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;
    try {
      await storeSignal.mutateAsync({
        toUserId: incomingCall.fromProfile.userId,
        signalType: CallSignalType.callDecline,
        data: "",
        callType: incomingCall.callType,
      });
    } catch {}
    setIncomingCall(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4" data-ocid="app.loading_state">
          <div className="relative w-16 h-16 mx-auto">
            <div
              className="w-16 h-16 rounded-full border-2 animate-spin"
              style={{
                borderColor: "oklch(0.65 0.22 10 / 0.3)",
                borderTopColor: "oklch(0.65 0.22 10)",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">💍</span>
            </div>
          </div>
          <p className="text-muted-foreground font-body text-sm">
            Loading Bandhan...
          </p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn)
    return (
      <>
        <LoginPage />
        <Toaster />
      </>
    );
  if (needsProfile)
    return (
      <>
        <ProfileSetupPage onComplete={() => setCurrentPage("browse")} />
        <Toaster />
      </>
    );

  if (currentPage === "voiceCall" && selectedProfile) {
    return (
      <>
        <VoiceCallPage
          profile={selectedProfile}
          isInitiator={isInitiator}
          initialOfferData={initialOfferData}
          onEnd={() =>
            setCurrentPage(selectedMatchForChat ? "conversation" : "browse")
          }
        />
        <Toaster />
      </>
    );
  }
  if (currentPage === "videoCall" && selectedProfile) {
    return (
      <>
        <VideoCallPage
          profile={selectedProfile}
          isInitiator={isInitiator}
          initialOfferData={initialOfferData}
          onEnd={() =>
            setCurrentPage(selectedMatchForChat ? "conversation" : "browse")
          }
        />
        <Toaster />
      </>
    );
  }
  if (currentPage === "callHistory") {
    return (
      <>
        <CallHistoryPage onBack={() => setCurrentPage("profile")} />
        <Toaster />
      </>
    );
  }
  if (currentPage === "viewProfile" && selectedProfile) {
    return (
      <>
        <ViewProfilePage
          profile={selectedProfile}
          onBack={() => setCurrentPage("browse")}
          onChat={() => {
            setSelectedMatchForChat(selectedProfile);
            setCurrentPage("conversation");
          }}
          onVoiceCall={() => {
            setIsInitiator(true);
            setInitialOfferData(undefined);
            setCurrentPage("voiceCall");
          }}
          onVideoCall={() => {
            setIsInitiator(true);
            setInitialOfferData(undefined);
            setCurrentPage("videoCall");
          }}
        />
        <Toaster />
      </>
    );
  }
  if (currentPage === "conversation" && selectedMatchForChat) {
    return (
      <div className="min-h-screen bg-background">
        <ConversationPage
          profile={selectedMatchForChat}
          onBack={() => setCurrentPage("chat")}
          onVoiceCall={() => {
            setSelectedProfile(selectedMatchForChat);
            setIsInitiator(true);
            setInitialOfferData(undefined);
            setCurrentPage("voiceCall");
          }}
          onVideoCall={() => {
            setSelectedProfile(selectedMatchForChat);
            setIsInitiator(true);
            setInitialOfferData(undefined);
            setCurrentPage("videoCall");
          }}
        />
        <IncomingCallOverlay
          incomingCall={incomingCall}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Floating header bar with notification bell */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-end px-4 pt-3 pb-2 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(10,0,16,0.85) 0%, transparent 100%)",
        }}
      >
        <div className="pointer-events-auto flex items-center gap-2">
          <NotificationBell />
        </div>
      </div>

      <main className="flex-1 pb-20">
        {currentPage === "browse" && (
          <BrowsePage
            onViewProfile={(p) => {
              setSelectedProfile(p);
              setCurrentPage("viewProfile");
            }}
          />
        )}
        {currentPage === "requests" && <RequestsPage />}
        {currentPage === "matches" && (
          <MatchesPage
            onOpenChat={(p) => {
              setSelectedMatchForChat(p);
              setCurrentPage("conversation");
            }}
          />
        )}
        {currentPage === "chat" && (
          <ChatPage
            onOpenConversation={(p) => {
              setSelectedMatchForChat(p);
              setCurrentPage("conversation");
            }}
          />
        )}
        {currentPage === "profile" && (
          <MyProfilePage onCallHistory={() => setCurrentPage("callHistory")} />
        )}
        {currentPage === "admin" && isAdmin && <AdminPage />}
      </main>
      <BottomNav
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isAdmin={!!isAdmin}
      />
      <IncomingCallOverlay
        incomingCall={incomingCall}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />
      <Toaster />
    </div>
  );
}
