import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Story {
    id: bigint;
    userId: Principal;
    authorName: string;
    authorPhoto?: string;
    imageUrl: string;
    timestamp: bigint;
    caption: string;
    likesCount: bigint;
}
export interface CallSignal {
    id: bigint;
    data: string;
    toUserId: Principal;
    callType: CallType;
    fromUserId: Principal;
    timestamp: bigint;
    signalType: CallSignalType;
}
export interface Profile {
    age: bigint;
    bio: string;
    occupation: string;
    height: string;
    aboutMe: string;
    favoriteSongs: Array<string>;
    interests: Array<string>;
    userId: Principal;
    mood: string;
    name: string;
    createdAt: bigint;
    education: string;
    photoUrl?: string;
    motherTongue: string;
    gender: Gender;
    favoriteMovies: Array<string>;
    mediaUrls: Array<string>;
    phone?: string;
    religion: string;
    thoughts: string;
    maritalStatus: string;
    location: string;
    hobbies: Array<string>;
}
export interface StoryComment {
    id: bigint;
    parentCommentId?: bigint;
    userId: Principal;
    storyId: bigint;
    text: string;
    authorName: string;
    timestamp: bigint;
}
export interface Message {
    id: bigint;
    read: boolean;
    text: string;
    toUserId: Principal;
    fromUserId: Principal;
    timestamp: bigint;
    reaction?: string;
    isDeleted: boolean;
}
export interface CallHistory {
    status: CallStatus;
    withUserId: Principal;
    callType: CallType;
    durationSeconds: bigint;
    timestamp: bigint;
}
export enum CallSignalType {
    iceCandidate = "iceCandidate",
    offer = "offer",
    callEnd = "callEnd",
    answer = "answer",
    callDecline = "callDecline"
}
export enum CallStatus {
    completed = "completed",
    missed = "missed",
    declined = "declined"
}
export enum CallType {
    video = "video",
    voice = "voice"
}
export enum Gender {
    other = "other",
    female = "female",
    male = "male"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_pending_accepted_declined {
    pending = "pending",
    accepted = "accepted",
    declined = "declined"
}
export enum PrivacyVisibility {
    everyone = "everyone",
    matchesOnly = "matchesOnly",
    hidden = "hidden"
}
export interface backendInterface {
    acceptMatchRequest(fromUserId: Principal): Promise<void>;
    addStory(imageUrl: string, caption: string): Promise<void>;
    addStoryComment(storyId: bigint, text: string): Promise<void>;
    adminDeleteProfile(profileId: Principal): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    consumeCallSignals(fromUserId: Principal): Promise<Array<CallSignal>>;
    createOrUpdateProfile(name: string, age: bigint, gender: Gender, religion: string, location: string, bio: string, photoUrl: string | null, occupation: string, height: string, motherTongue: string, maritalStatus: string, interests: Array<string>, hobbies: Array<string>, education: string, favoriteMovies: Array<string>, favoriteSongs: Array<string>, thoughts: string, mood: string, mediaUrls: Array<string>, aboutMe: string, phone: string | null): Promise<void>;
    declineMatchRequest(fromUserId: Principal): Promise<void>;
    deleteMessage(messageId: bigint): Promise<void>;
    editMessage(messageId: bigint, newText: string): Promise<void>;
    getAllProfiles(): Promise<Array<Profile>>;
    getAllWithRequestedCount(): Promise<Array<[Profile, bigint]>>;
    getCallHistory(): Promise<Array<[CallHistory, Profile]>>;
    getCallerUserProfile(): Promise<Profile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMatchRequests(): Promise<Array<[Profile, Variant_pending_accepted_declined]>>;
    getMessages(withUserId: Principal): Promise<Array<Message>>;
    getMutualMatches(): Promise<Array<Profile>>;
    getPrivacyVisibility(): Promise<PrivacyVisibility>;
    getStories(): Promise<Array<Story>>;
    getStoryComments(storyId: bigint): Promise<Array<StoryComment>>;
    getTypingStatus(fromUserId: Principal): Promise<boolean>;
    getUserProfile(userId: Principal): Promise<Profile | null>;
    hasLikedStory(storyId: bigint): Promise<boolean>;
    isAdmin(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    likeStory(storyId: bigint): Promise<void>;
    logCall(withUserId: Principal, callType: CallType, durationSeconds: bigint, status: CallStatus): Promise<void>;
    markMessageRead(messageId: bigint): Promise<void>;
    reactToMessage(messageId: bigint, emoji: string): Promise<void>;
    replyToStoryComment(storyId: bigint, parentCommentId: bigint, text: string): Promise<void>;
    searchProfiles(term: string): Promise<Array<Profile>>;
    sendMatchRequest(toUserId: Principal): Promise<void>;
    sendMessage(toUserId: Principal, text: string): Promise<void>;
    setPrivacyVisibility(visibility: PrivacyVisibility): Promise<void>;
    setTyping(toUserId: Principal, isTyping: boolean): Promise<void>;
    storeCallSignal(toUserId: Principal, signalType: CallSignalType, data: string, callType: CallType): Promise<void>;
    unlikeStory(storyId: bigint): Promise<void>;
}
