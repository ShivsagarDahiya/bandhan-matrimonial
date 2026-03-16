import Map "mo:core/Map";
import Set "mo:core/Set";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Array "mo:core/Array";
import Option "mo:core/Option";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  type Gender = {
    #male;
    #female;
    #other;
  };

  type PrivacyVisibility = {
    #everyone;
    #matchesOnly;
    #hidden;
  };

  type Message = {
    id : Nat;
    fromUserId : Principal;
    toUserId : Principal;
    text : Text;
    timestamp : Int;
    read : Bool;
  };

  type MessageWithMeta = {
    id : Nat;
    fromUserId : Principal;
    toUserId : Principal;
    text : Text;
    timestamp : Int;
    read : Bool;
    reaction : ?Text;
    isDeleted : Bool;
  };

  type Profile = {
    userId : Principal;
    name : Text;
    age : Nat;
    gender : Gender;
    religion : Text;
    location : Text;
    bio : Text;
    photoUrl : ?Text;
    occupation : Text;
    height : Text;
    motherTongue : Text;
    maritalStatus : Text;
    interests : [Text];
    hobbies : [Text];
    education : Text;
    favoriteMovies : [Text];
    favoriteSongs : [Text];
    thoughts : Text;
    mood : Text;
    mediaUrls : [Text];
    aboutMe : Text;
    phone : ?Text;
    createdAt : Int;
  };

  type Story = {
    id : Nat;
    userId : Principal;
    authorName : Text;
    authorPhoto : ?Text;
    imageUrl : Text;
    caption : Text;
    timestamp : Int;
    likesCount : Nat;
  };

  type StoryComment = {
    id : Nat;
    storyId : Nat;
    userId : Principal;
    authorName : Text;
    text : Text;
    timestamp : Int;
    parentCommentId : ?Nat;
  };

  type StoryNotifType = {
    #like;
    #comment;
    #reply;
  };

  type StoryNotification = {
    id : Nat;
    storyId : Nat;
    storyOwnerId : Principal;
    actorUserId : Principal;
    actorName : Text;
    actorPhoto : ?Text;
    notifType : StoryNotifType;
    text : Text;
    timestamp : Int;
  };

  type TypingStatus = {
    fromUser : Principal;
    toUser : Principal;
    isTyping : Bool;
    timestamp : Int;
  };

  type CallSignalType = {
    #offer;
    #answer;
    #iceCandidate;
    #callEnd;
    #callDecline;
  };

  type CallType = {
    #video;
    #voice;
  };

  type CallSignal = {
    id : Nat;
    fromUserId : Principal;
    toUserId : Principal;
    signalType : CallSignalType;
    callType : CallType;
    data : Text;
    timestamp : Int;
  };

  type CallStatus = {
    #completed;
    #missed;
    #declined;
  };

  type CallHistory = {
    withUserId : Principal;
    callType : CallType;
    durationSeconds : Nat;
    status : CallStatus;
    timestamp : Int;
  };

  type ProfileView = {
    viewerId : Principal;
    timestamp : Int;
  };

  type LiveStreamFilter = {
    #all;
    #gender : Gender;
    #religion : Text;
  };

  type LiveStream = {
    id : Nat;
    hostId : Principal;
    hostName : Text;
    hostPhoto : ?Text;
    title : Text;
    startedAt : Int;
    isActive : Bool;
    filterSetting : LiveStreamFilter;
    matchesOnly : Bool;
  };

  type LiveMessage = {
    id : Int;
    liveId : Nat;
    userId : Principal;
    userName : Text;
    text : Text;
    timestamp : Int;
  };

  type LiveReaction = {
    liveId : Nat;
    userId : Principal;
    emoji : Text;
    timestamp : Int;
  };

  type SuperLikeNotification = {
    fromProfile : Profile;
    timestamp : Int;
  };

  // New Gift Types
  type GiftRecord = {
    id : Nat;
    fromUserId : Principal;
    toUserId : Principal;
    giftName : Text;
    giftEmoji : Text;
    timestamp : Int;
  };

  func areMutualMatches(user1 : Principal, user2 : Principal) : Bool {
    switch (matches.get(user1)) {
      case (?user1Matches) {
        user1Matches.contains(user2);
      };
      case (null) { false };
    };
  };

  func isProfileVisible(profileUserId : Principal, caller : Principal) : Bool {
    let visibility = privacySettings.get(profileUserId).get(#everyone);
    switch (visibility) {
      case (#everyone) { true };
      case (#hidden) { false };
      case (#matchesOnly) { areMutualMatches(caller, profileUserId) };
    };
  };

  // Track all persistent state here for migration
  let profiles = Map.empty<Principal, Profile>();
  let matches = Map.empty<Principal, Set.Set<Principal>>();
  let matchRequests = Map.empty<Principal, Map.Map<Principal, { #pending; #accepted; #declined }>>();
  let privacySettings = Map.empty<Principal, PrivacyVisibility>();
  let premiumStatus = Map.empty<Principal, Bool>();
  let showLastActiveStatus = Map.empty<Principal, Bool>();
  let messages = Map.empty<Principal, List.List<Message>>();
  var nextMessageId = 1;
  let messageReactions = Map.empty<Nat, Text>();
  let deletedMessageIds = Set.empty<Nat>();
  let stories = Map.empty<Nat, Story>();
  var nextStoryId = 1;
  let storyComments = Map.empty<Nat, List.List<StoryComment>>();
  var nextCommentId = 1;
  let storyLikes = Map.empty<Nat, Set.Set<Principal>>();
  let storyReactions = Map.empty<Nat, Map.Map<Principal, Text>>();
  let storyViews = Map.empty<Nat, Set.Set<Principal>>();
  let storyNotifications = Map.empty<Principal, List.List<StoryNotification>>();
  var nextStoryNotifId = 1;
  let callSignals = Map.empty<Principal, List.List<CallSignal>>();
  var nextSignalId = 1;
  let typingStatuses = List.empty<TypingStatus>();
  let callHistories = Map.empty<Principal, List.List<CallHistory>>();
  let profileViews = Map.empty<Principal, List.List<ProfileView>>();
  let superLikes = Map.empty<Principal, Set.Set<Principal>>();
  let liveStreams = Map.empty<Nat, LiveStream>();
  var nextLiveId = 1;
  let liveMessages = Map.empty<Nat, List.List<LiveMessage>>();
  let liveViewers = Map.empty<Nat, Set.Set<Principal>>();
  let liveReactions = Map.empty<Nat, List.List<LiveReaction>>();
  let blockedLiveUsers = Map.empty<Nat, Set.Set<Principal>>();
  let superLikeNotifs = Map.empty<Principal, List.List<SuperLikeNotification>>();

  let gifts = Map.empty<Nat, GiftRecord>();
  var nextGiftId = 1;

  func pushStoryNotif(storyOwnerId : Principal, notif : StoryNotification) {
    if (storyOwnerId == notif.actorUserId) { return };
    let existing = storyNotifications.get(storyOwnerId).get(List.empty<StoryNotification>());
    existing.add(notif);
    storyNotifications.add(storyOwnerId, existing);
  };

  // Gifting System Functions
  public shared ({ caller }) func sendGift(toUserId : Principal, giftName : Text, giftEmoji : Text) : async GiftRecord {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send gifts");
    };
    let gift : GiftRecord = {
      id = nextGiftId;
      fromUserId = caller;
      toUserId;
      giftName;
      giftEmoji;
      timestamp = Time.now();
    };

    gifts.add(nextGiftId, gift);
    nextGiftId += 1;
    gift;
  };

  public query ({ caller }) func getGiftsSent() : async [GiftRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view sent gifts");
    };
    gifts.values().toArray().filter(func(gift) { gift.fromUserId == caller });
  };

  public query ({ caller }) func getGiftsReceived() : async [GiftRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view received gifts");
    };
    gifts.values().toArray().filter(func(gift) { gift.toUserId == caller });
  };
};
