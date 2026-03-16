import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
  __kind__: "Some";
  value: T;
}
export interface None {
  __kind__: "None";
}
export type Option<T> = Some<T> | None;

export enum UserRole {
  admin = "admin",
  user = "user",
  guest = "guest",
}

export type Gender =
  | { __kind__: "male" }
  | { __kind__: "female" }
  | { __kind__: "other" };

export type PrivacyVisibility =
  | { __kind__: "everyone" }
  | { __kind__: "matchesOnly" }
  | { __kind__: "hidden" };

export interface Profile {
  userId: Principal;
  name: string;
  age: bigint;
  gender: Gender;
  religion: string;
  location: string;
  bio: string;
  photoUrl: string | null;
  occupation: string;
  height: string;
  motherTongue: string;
  maritalStatus: string;
  interests: string[];
  hobbies: string[];
  education: string;
  favoriteMovies: string[];
  favoriteSongs: string[];
  thoughts: string;
  mood: string;
  mediaUrls: string[];
  aboutMe: string;
  phone: string | null;
  createdAt: bigint;
}

export interface MessageWithMeta {
  id: bigint;
  fromUserId: Principal;
  toUserId: Principal;
  text: string;
  timestamp: bigint;
  read: boolean;
  reaction: string | null;
  isDeleted: boolean;
}

export interface Story {
  id: bigint;
  userId: Principal;
  authorName: string;
  authorPhoto: string | null;
  imageUrl: string;
  caption: string;
  timestamp: bigint;
  likesCount: bigint;
}

export interface StoryComment {
  id: bigint;
  storyId: bigint;
  userId: Principal;
  authorName: string;
  text: string;
  timestamp: bigint;
  parentCommentId: bigint | null;
}

export type StoryNotifType =
  | { __kind__: "like" }
  | { __kind__: "comment" }
  | { __kind__: "reply" };

export interface StoryNotification {
  id: bigint;
  storyId: bigint;
  storyOwnerId: Principal;
  actorUserId: Principal;
  actorName: string;
  actorPhoto: string | null;
  notifType: StoryNotifType;
  text: string;
  timestamp: bigint;
}

export type CallSignalType =
  | { __kind__: "offer" }
  | { __kind__: "answer" }
  | { __kind__: "iceCandidate" }
  | { __kind__: "callEnd" }
  | { __kind__: "callDecline" };

export type CallType =
  | { __kind__: "video" }
  | { __kind__: "voice" };

export interface CallSignal {
  id: bigint;
  fromUserId: Principal;
  toUserId: Principal;
  signalType: CallSignalType;
  callType: CallType;
  data: string;
  timestamp: bigint;
}

export type CallStatus =
  | { __kind__: "completed" }
  | { __kind__: "missed" }
  | { __kind__: "declined" };

export interface CallHistory {
  withUserId: Principal;
  callType: CallType;
  durationSeconds: bigint;
  status: CallStatus;
  timestamp: bigint;
}

export interface SuperLikeNotification {
  fromProfile: Profile;
  timestamp: bigint;
}

export interface GiftRecord {
  id: bigint;
  fromUserId: Principal;
  toUserId: Principal;
  giftName: string;
  giftEmoji: string;
  timestamp: bigint;
}

export interface backendInterface {
  assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
  getCallerUserRole(): Promise<UserRole>;
  isCallerAdmin(): Promise<boolean>;

  // Profiles
  createOrUpdateProfile(
    name: string,
    age: bigint,
    gender: Gender,
    religion: string,
    location: string,
    bio: string,
    photoUrl: string | null,
    occupation: string,
    height: string,
    motherTongue: string,
    maritalStatus: string,
    interests: string[],
    hobbies: string[],
    education: string,
    favoriteMovies: string[],
    favoriteSongs: string[],
    thoughts: string,
    mood: string,
    mediaUrls: string[],
    aboutMe: string,
    phone: string | null,
  ): Promise<void>;
  getCallerUserProfile(): Promise<Profile | null>;
  getUserProfile(userId: Principal): Promise<Profile | null>;
  getAllProfiles(): Promise<Profile[]>;
  searchProfiles(query: string): Promise<Profile[]>;
  adminDeleteProfile(profileId: Principal): Promise<void>;
  getAllWithRequestedCount(): Promise<Array<[Profile, bigint]>>;

  // Matches
  sendMatchRequest(toUser: Principal): Promise<void>;
  acceptMatchRequest(fromUser: Principal): Promise<void>;
  declineMatchRequest(fromUser: Principal): Promise<void>;
  getMatchRequests(): Promise<Array<[Profile, string]>>;
  getMutualMatches(): Promise<Profile[]>;

  // Messages
  sendMessage(toUserId: Principal, text: string): Promise<void>;
  getMessages(withUserId: Principal): Promise<MessageWithMeta[]>;
  markMessageRead(messageId: bigint): Promise<void>;
  reactToMessage(messageId: bigint, emoji: string): Promise<void>;
  editMessage(messageId: bigint, newText: string): Promise<void>;
  deleteMessage(messageId: bigint): Promise<void>;

  // Typing
  setTyping(toUserId: Principal, isTyping: boolean): Promise<void>;
  getTypingStatus(fromUserId: Principal): Promise<boolean>;

  // Stories
  addStory(imageUrl: string, caption: string): Promise<void>;
  getStories(): Promise<Story[]>;
  getStoryComments(storyId: bigint): Promise<StoryComment[]>;
  addStoryComment(storyId: bigint, text: string): Promise<void>;
  replyToStoryComment(storyId: bigint, parentCommentId: bigint, text: string): Promise<void>;
  likeStory(storyId: bigint): Promise<void>;
  unlikeStory(storyId: bigint): Promise<void>;
  hasLikedStory(storyId: bigint): Promise<boolean>;
  deleteStory(storyId: bigint): Promise<void>;
  adminDeleteStory(storyId: bigint): Promise<void>;
  adminGetAllStories(): Promise<Story[]>;
  getStoryReactions(storyId: bigint): Promise<Array<[string, bigint]>>;
  getCallerStoryReaction(storyId: bigint): Promise<string | null>;
  addStoryReaction(storyId: bigint, emoji: string): Promise<void>;
  getStoryViewCount(storyId: bigint): Promise<bigint>;
  getStoryViewers(storyId: bigint): Promise<Profile[]>;
  recordStoryView(storyId: bigint): Promise<void>;
  getMyStoryNotifications(): Promise<StoryNotification[]>;

  // Privacy
  getPrivacyVisibility(): Promise<string>;
  setPrivacyVisibility(visibility: string): Promise<void>;
  getPremiumStatus(): Promise<boolean>;
  setPremiumStatus(value: boolean): Promise<void>;
  getShowLastActive(): Promise<boolean>;
  setShowLastActive(value: boolean): Promise<void>;

  // WebRTC / Calls
  storeCallSignal(
    toUserId: Principal,
    signalType: CallSignalType,
    data: string,
    callType: CallType,
  ): Promise<void>;
  consumeCallSignals(fromUserId: Principal): Promise<CallSignal[]>;
  logCall(
    withUserId: Principal,
    callType: CallType,
    durationSeconds: bigint,
    status: CallStatus,
  ): Promise<void>;
  getCallHistory(): Promise<Array<[CallHistory, Profile]>>;

  // Profile views
  recordProfileView(userId: Principal): Promise<void>;
  getProfileViewCount(): Promise<bigint>;
  getProfileViewers(): Promise<Array<[Profile, bigint]>>;

  // Super Like
  superLikeUser(userId: Principal): Promise<void>;
  unsuperLikeUser(userId: Principal): Promise<void>;
  hasSuperLiked(userId: Principal): Promise<boolean>;
  getSuperLikedBy(): Promise<Profile[]>;
  getSuperLikeNotifications(): Promise<SuperLikeNotification[]>;

  // Gifts
  sendGift(toUserId: Principal, giftName: string, giftEmoji: string): Promise<GiftRecord>;
  getGiftsSent(): Promise<GiftRecord[]>;
  getGiftsReceived(): Promise<GiftRecord[]>;
}
