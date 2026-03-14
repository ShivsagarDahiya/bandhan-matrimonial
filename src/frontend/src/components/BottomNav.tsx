import {
  Compass,
  HeartHandshake,
  MessageCircle,
  Shield,
  UserCircle,
  Users,
} from "lucide-react";
import type { Page } from "../App";

interface BottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isAdmin: boolean;
}

export default function BottomNav({
  currentPage,
  onNavigate,
  isAdmin,
}: BottomNavProps) {
  const navItems = [
    { id: "browse" as Page, icon: Compass, label: "Browse" },
    { id: "requests" as Page, icon: HeartHandshake, label: "Requests" },
    { id: "matches" as Page, icon: Users, label: "Matches" },
    { id: "chat" as Page, icon: MessageCircle, label: "Chats" },
    { id: "profile" as Page, icon: UserCircle, label: "Profile" },
    ...(isAdmin ? [{ id: "admin" as Page, icon: Shield, label: "Admin" }] : []),
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "oklch(0.09 0.05 330 / 0.97)",
        backdropFilter: "blur(24px)",
        borderTop: "1.5px solid transparent",
        backgroundClip: "padding-box",
        boxShadow:
          "0 -1px 0 0 oklch(0.35 0.12 330 / 0.35), 0 -8px 32px oklch(0.08 0.04 330 / 0.6)",
      }}
    >
      {/* Gradient top border */}
      <div
        className="absolute top-0 left-0 right-0 h-[1.5px]"
        style={{
          background:
            "linear-gradient(90deg,#f43f5e44,#ec4899,#a855f7,#ec4899,#f43f5e44)",
        }}
      />
      <div className="flex items-center justify-around px-1 py-3 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              type="button"
              key={item.id}
              data-ocid={`nav.${item.id}.link`}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center gap-1.5 px-2 py-1 rounded-2xl transition-all duration-200 min-w-[52px] min-h-[56px] justify-center relative group"
            >
              {/* Active glow pill indicator above icon */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
                  style={{
                    background: "linear-gradient(90deg,#f43f5e,#a855f7)",
                    boxShadow: "0 0 8px #f43f5e",
                  }}
                />
              )}
              {/* Icon wrapper with glow */}
              <span
                className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200"
                style={
                  isActive
                    ? {
                        background: "oklch(0.2 0.08 330 / 0.5)",
                        boxShadow: "0 0 18px #f43f5e88",
                      }
                    : {}
                }
              >
                <Icon
                  className="w-7 h-7 transition-all duration-200"
                  style={
                    isActive
                      ? { color: "#f43f5e", strokeWidth: 2.2 }
                      : { color: "oklch(0.5 0.05 330)", strokeWidth: 1.7 }
                  }
                />
              </span>
              <span
                className="text-[10px] font-semibold leading-none transition-all duration-200"
                style={
                  isActive
                    ? { color: "#f43f5e" }
                    : { color: "oklch(0.5 0.05 330)" }
                }
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
