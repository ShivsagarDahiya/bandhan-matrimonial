import { Trash2 } from "lucide-react";
import { useAdminDeleteProfile, useAdminProfiles } from "../hooks/useQueries";

export default function AdminPage() {
  const { data: profiles = [], isLoading } = useAdminProfiles();
  const deleteProfile = useAdminDeleteProfile();

  return (
    <div
      className="min-h-screen pt-14 pb-4 px-5"
      style={{ background: "#0a0010" }}
    >
      <h1 className="text-2xl font-bold text-white py-4">Admin Dashboard</h1>
      <p className="text-white/50 text-sm mb-4">{profiles.length} profiles</p>
      {isLoading && (
        <div
          className="flex justify-center py-12"
          data-ocid="admin.loading_state"
        >
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{
              borderColor: "oklch(0.65 0.22 10/0.3)",
              borderTopColor: "oklch(0.65 0.22 10)",
            }}
          />
        </div>
      )}
      <div className="space-y-2">
        {profiles.map(([profile, count], i) => (
          <div
            key={profile.userId.toString()}
            data-ocid={`admin.item.${i + 1}`}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "oklch(0.13 0.05 300)" }}
          >
            <div
              className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#e11d48,#7c3aed)" }}
            >
              {profile.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold">
                  {profile.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">
                {profile.name}
              </p>
              <p className="text-white/50 text-xs">
                {Number(profile.age)} • {profile.location}
              </p>
              <p className="text-white/30 text-xs">{Number(count)} requests</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!confirm("Delete this profile?")) return;
                try {
                  await deleteProfile.mutateAsync(profile.userId);
                } catch {}
              }}
              data-ocid={`admin.delete_button.${i + 1}`}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "oklch(0.65 0.22 10 / 0.2)" }}
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
