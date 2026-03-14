import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CallHistory,
  CallSignal,
  CallStatus,
  CallType,
  Gender,
  Message,
  Profile,
  Story,
  StoryComment,
} from "../backend";
import { useActor } from "./useActor";

// PrivacyVisibility type — matches backend enum values
export type PrivacyVisibility = "everyone" | "matchesOnly" | "hidden";

export function useCallerProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<Profile | null>({
    queryKey: ["callerProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllProfiles() {
  const { actor, isFetching } = useActor();
  return useQuery<Profile[]>({
    queryKey: ["allProfiles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllProfiles();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSearchProfiles(searchTerm: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Profile[]>({
    queryKey: ["searchProfiles", searchTerm],
    queryFn: async () => {
      if (!actor) return [];
      if (!searchTerm.trim()) return actor.getAllProfiles();
      return actor.searchProfiles(searchTerm);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMatchRequests() {
  const { actor, isFetching } = useActor();
  return useQuery<Array<[Profile, string]>>({
    queryKey: ["matchRequests"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMatchRequests() as Promise<Array<[Profile, string]>>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMutualMatches() {
  const { actor, isFetching } = useActor();
  return useQuery<Profile[]>({
    queryKey: ["mutualMatches"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMutualMatches();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAdminProfiles() {
  const { actor, isFetching } = useActor();
  return useQuery<Array<[Profile, bigint]>>({
    queryKey: ["adminProfiles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllWithRequestedCount();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMessages(withUserId: Principal | null, enabled = true) {
  const { actor, isFetching } = useActor();
  return useQuery<Message[]>({
    queryKey: ["messages", withUserId?.toString()],
    queryFn: async () => {
      if (!actor || !withUserId) return [];
      return actor.getMessages(withUserId);
    },
    enabled: !!actor && !isFetching && !!withUserId && enabled,
    refetchInterval: 3000,
  });
}

export function useStories() {
  const { actor, isFetching } = useActor();
  return useQuery<Story[]>({
    queryKey: ["stories"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getStories();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useStoryComments(storyId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<StoryComment[]>({
    queryKey: ["storyComments", storyId?.toString()],
    queryFn: async () => {
      if (!actor || storyId === null) return [];
      return actor.getStoryComments(storyId);
    },
    enabled: !!actor && !isFetching && storyId !== null,
    refetchInterval: 3000,
  });
}

export function useHasLikedStory(storyId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["hasLikedStory", storyId?.toString()],
    queryFn: async () => {
      if (!actor || storyId === null) return false;
      return actor.hasLikedStory(storyId);
    },
    enabled: !!actor && !isFetching && storyId !== null,
  });
}

export function useLikeStory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (storyId: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.likeStory(storyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["hasLikedStory"] });
    },
  });
}

export function useUnlikeStory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (storyId: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.unlikeStory(storyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["hasLikedStory"] });
    },
  });
}

export function useReplyToStoryComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      storyId,
      parentCommentId,
      text,
    }: { storyId: bigint; parentCommentId: bigint; text: string }) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.replyToStoryComment(storyId, parentCommentId, text);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["storyComments", vars.storyId.toString()],
      });
    },
  });
}

export function useCreateProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      age: bigint;
      gender: Gender;
      religion: string;
      location: string;
      bio: string;
      photoUrl: string | null;
      occupation?: string;
      height?: string;
      motherTongue?: string;
      maritalStatus?: string;
      interests?: string[];
      hobbies?: string[];
      education?: string;
      favoriteMovies?: string[];
      favoriteSongs?: string[];
      thoughts?: string;
      mood?: string;
      mediaUrls?: string[];
      aboutMe?: string;
      phone?: string | null;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.createOrUpdateProfile(
        data.name,
        data.age,
        data.gender,
        data.religion,
        data.location,
        data.bio,
        data.photoUrl,
        data.occupation ?? "",
        data.height ?? "",
        data.motherTongue ?? "",
        data.maritalStatus ?? "",
        data.interests ?? [],
        data.hobbies ?? [],
        data.education ?? "",
        data.favoriteMovies ?? [],
        data.favoriteSongs ?? [],
        data.thoughts ?? "",
        data.mood ?? "",
        data.mediaUrls ?? [],
        data.aboutMe ?? "",
        data.phone ?? null,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerProfile"] });
      queryClient.invalidateQueries({ queryKey: ["allProfiles"] });
    },
  });
}

export function useSendMatchRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (toUser: Principal) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.sendMatchRequest(toUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matchRequests"] });
    },
  });
}

export function useAcceptRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fromUser: Principal) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.acceptMatchRequest(fromUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matchRequests"] });
      queryClient.invalidateQueries({ queryKey: ["mutualMatches"] });
    },
  });
}

export function useDeclineRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fromUser: Principal) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.declineMatchRequest(fromUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matchRequests"] });
    },
  });
}

export function useAdminDeleteProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: Principal) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.adminDeleteProfile(profileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["allProfiles"] });
    },
  });
}

export function useGetProfile(userId: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Profile | null>({
    queryKey: ["profile", userId?.toString()],
    queryFn: async () => {
      if (!actor || !userId) return null;
      return actor.getUserProfile(userId);
    },
    enabled: !!actor && !isFetching && !!userId,
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      toUserId,
      text,
    }: { toUserId: Principal; text: string }) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.sendMessage(toUserId, text);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", vars.toUserId.toString()],
      });
    },
  });
}

export function useAddStory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      imageUrl,
      caption,
    }: { imageUrl: string; caption: string }) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.addStory(imageUrl, caption);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
    },
  });
}

export function useAddStoryComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      storyId,
      text,
    }: { storyId: bigint; text: string }) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.addStoryComment(storyId, text);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["storyComments", vars.storyId.toString()],
      });
    },
  });
}

// --- WebRTC, typing, call history ---

export function useCallSignals(fromUserId: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery<CallSignal[]>({
    queryKey: ["callSignals", fromUserId?.toString()],
    queryFn: async () => {
      if (!actor || !fromUserId) return [];
      return actor.consumeCallSignals(fromUserId);
    },
    enabled: !!actor && !isFetching && !!fromUserId,
    refetchInterval: 1500,
    staleTime: 0,
  });
}

export function useTypingStatus(fromUserId: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["typingStatus", fromUserId?.toString()],
    queryFn: async () => {
      if (!actor || !fromUserId) return false;
      return actor.getTypingStatus(fromUserId);
    },
    enabled: !!actor && !isFetching && !!fromUserId,
    refetchInterval: 2000,
    staleTime: 0,
  });
}

export function useCallHistory() {
  const { actor, isFetching } = useActor();
  return useQuery<Array<[CallHistory, Profile]>>({
    queryKey: ["callHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCallHistory();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMarkMessageRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.markMessageRead(messageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

export function useSetTyping() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      toUserId,
      isTyping,
    }: { toUserId: Principal; isTyping: boolean }) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.setTyping(toUserId, isTyping);
    },
  });
}

export function useStoreCallSignal() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (vars: {
      toUserId: Principal;
      signalType: import("../backend").CallSignalType;
      data: string;
      callType: import("../backend").CallType;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.storeCallSignal(
        vars.toUserId,
        vars.signalType,
        vars.data,
        vars.callType,
      );
    },
  });
}

export function useLogCall() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      withUserId: Principal;
      callType: CallType;
      durationSeconds: bigint;
      status: CallStatus;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.logCall(
        vars.withUserId,
        vars.callType,
        vars.durationSeconds,
        vars.status,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callHistory"] });
    },
  });
}

export function usePrivacyVisibility() {
  const { actor, isFetching } = useActor();
  return useQuery<PrivacyVisibility>({
    queryKey: ["privacyVisibility"],
    queryFn: async () => {
      if (!actor) return "everyone" as PrivacyVisibility;
      try {
        return (await (
          actor as any
        ).getPrivacyVisibility()) as PrivacyVisibility;
      } catch {
        return "everyone" as PrivacyVisibility;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useSetPrivacyVisibility() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (visibility: PrivacyVisibility) => {
      if (!actor) throw new Error("Not authenticated");
      await (actor as any).setPrivacyVisibility(visibility);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["privacyVisibility"] });
    },
  });
}

// --- Chat: react, edit, delete ---

export function useReactToMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: { messageId: bigint; emoji: string }) => {
      if (!actor) throw new Error("Not authenticated");
      await (actor as any).reactToMessage(messageId, emoji);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

export function useEditMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      newText,
    }: { messageId: bigint; newText: string }) => {
      if (!actor) throw new Error("Not authenticated");
      await (actor as any).editMessage(messageId, newText);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

export function useDeleteMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      await (actor as any).deleteMessage(messageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

export function usePremiumStatus() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["premiumStatus"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return (await (actor as any).getPremiumStatus()) as boolean;
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useSetPremiumStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (value: boolean) => {
      if (!actor) throw new Error("Not authenticated");
      await (actor as any).setPremiumStatus(value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["premiumStatus"] });
    },
  });
}

export function useShowLastActive() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["showLastActive"],
    queryFn: async () => {
      if (!actor) return true;
      try {
        return (await (actor as any).getShowLastActive()) as boolean;
      } catch {
        return true;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useSetShowLastActive() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (value: boolean) => {
      if (!actor) throw new Error("Not authenticated");
      await (actor as any).setShowLastActive(value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["showLastActive"] });
    },
  });
}
