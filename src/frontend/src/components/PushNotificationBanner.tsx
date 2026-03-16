import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

export interface PushNotif {
  id: string;
  senderName: string;
  senderAvatar?: string;
  preview: string;
  onTap?: () => void;
}

interface Props {
  notification: PushNotif | null;
  onDismiss: () => void;
}

export default function PushNotificationBanner({
  notification,
  onDismiss,
}: Props) {
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [notification, onDismiss]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          key={notification.id}
          initial={{ y: -90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[200] flex justify-center px-3 pt-3"
          data-ocid="push.toast"
        >
          <button
            type="button"
            onClick={() => {
              notification.onTap?.();
              onDismiss();
            }}
            className="flex items-center gap-3 w-full max-w-sm rounded-2xl px-4 py-3 shadow-2xl text-left"
            style={{
              background: "oklch(0.16 0.07 330 / 0.97)",
              backdropFilter: "blur(20px)",
              border: "1px solid oklch(0.35 0.12 340 / 0.4)",
            }}
          >
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-bold"
              style={{
                background: notification.senderAvatar
                  ? undefined
                  : "linear-gradient(135deg, oklch(0.55 0.22 10), oklch(0.45 0.25 330))",
                backgroundImage: notification.senderAvatar
                  ? `url(${notification.senderAvatar})`
                  : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {!notification.senderAvatar &&
                notification.senderName.charAt(0).toUpperCase()}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold truncate"
                style={{ color: "oklch(0.92 0.04 30)" }}
              >
                {notification.senderName}
              </p>
              <p
                className="text-xs truncate"
                style={{ color: "oklch(0.65 0.05 330)" }}
              >
                {notification.preview}
              </p>
            </div>

            {/* Close */}
            <button
              type="button"
              data-ocid="push.close_button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "oklch(0.25 0.05 330)" }}
            >
              <X className="w-3 h-3" style={{ color: "oklch(0.7 0.05 330)" }} />
            </button>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
