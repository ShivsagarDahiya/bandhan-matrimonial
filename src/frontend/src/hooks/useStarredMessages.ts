import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bandhan_starred_messages";

export interface StarredMessage {
  id: string;
  conversationId: string;
  contactName: string;
  contactAvatar: string;
  text: string;
  timestamp: number;
  senderId: string;
}

function loadStarred(): StarredMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveStarred(items: StarredMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function useStarredMessages() {
  const [starred, setStarred] = useState<StarredMessage[]>(loadStarred);

  // Keep localStorage in sync
  useEffect(() => {
    saveStarred(starred);
  }, [starred]);

  const starMessage = useCallback((msg: StarredMessage) => {
    setStarred((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [msg, ...prev];
    });
  }, []);

  const unstarMessage = useCallback((msgId: string) => {
    setStarred((prev) => prev.filter((m) => m.id !== msgId));
  }, []);

  const isStarred = useCallback(
    (msgId: string) => starred.some((m) => m.id === msgId),
    [starred],
  );

  const toggleStar = useCallback((msg: StarredMessage) => {
    setStarred((prev) => {
      if (prev.some((m) => m.id === msg.id)) {
        return prev.filter((m) => m.id !== msg.id);
      }
      return [msg, ...prev];
    });
  }, []);

  return { starred, starMessage, unstarMessage, isStarred, toggleStar };
}
