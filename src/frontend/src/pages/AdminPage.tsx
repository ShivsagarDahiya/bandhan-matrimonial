import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Trash2 } from "lucide-react";
import {
  useAdminDeleteProfile,
  useAdminDeleteStory,
  useAdminProfiles,
  useAdminStories,
} from "../hooks/useQueries";

function timeAgo(timestamp: bigint): string {
  const ms = Number(timestamp) / 1_000_000;
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminPage() {
  const { data: profiles = [], isLoading: profilesLoading } =
    useAdminProfiles();
  const { data: stories = [], isLoading: storiesLoading } = useAdminStories();
  const deleteProfile = useAdminDeleteProfile();
  const deleteStory = useAdminDeleteStory();

  return (
    <div
      className="min-h-screen pt-14 pb-4 px-5"
      style={{ background: "#0a0010" }}
    >
      <h1 className="text-2xl font-bold text-white py-4">Admin Dashboard</h1>

      <Tabs defaultValue="profiles">
        <TabsList
          className="w-full mb-4"
          style={{ background: "oklch(0.13 0.05 300)" }}
        >
          <TabsTrigger
            value="profiles"
            data-ocid="admin.profiles.tab"
            className="flex-1 data-[state=active]:text-white"
          >
            Profiles ({profiles.length})
          </TabsTrigger>
          <TabsTrigger
            value="stories"
            data-ocid="admin.stories.tab"
            className="flex-1 data-[state=active]:text-white"
          >
            Stories ({stories.length})
          </TabsTrigger>
        </TabsList>

        {/* Profiles tab */}
        <TabsContent value="profiles">
          {profilesLoading && (
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
                  style={{
                    background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                  }}
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
                  <p className="text-white/30 text-xs">
                    {Number(count)} requests
                  </p>
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
        </TabsContent>

        {/* Stories tab */}
        <TabsContent value="stories">
          {storiesLoading && (
            <div
              className="flex justify-center py-12"
              data-ocid="admin.stories.loading_state"
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
          {stories.length === 0 && !storiesLoading && (
            <div
              data-ocid="admin.stories.empty_state"
              className="flex flex-col items-center justify-center py-16 text-white/30"
            >
              <p className="text-sm">No stories yet</p>
            </div>
          )}
          <div className="space-y-2">
            {stories.map((story, i) => {
              const isVideo = story.imageUrl?.match(/\.(mp4|webm|ogg)$/i);
              return (
                <div
                  key={story.id.toString()}
                  data-ocid={`admin.stories.item.${i + 1}`}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "oklch(0.13 0.05 300)" }}
                >
                  {/* Thumbnail */}
                  <div
                    className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                    }}
                  >
                    {story.imageUrl && !isVideo ? (
                      <img
                        src={story.imageUrl}
                        alt="story"
                        className="w-full h-full object-cover"
                      />
                    ) : story.authorPhoto ? (
                      <img
                        src={story.authorPhoto}
                        alt={story.authorName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold">
                        {story.authorName.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">
                      {story.authorName}
                    </p>
                    {story.caption && (
                      <p className="text-white/50 text-xs truncate">
                        {story.caption}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-white/30 text-xs">
                        {timeAgo(story.timestamp)}
                      </span>
                      <span className="flex items-center gap-0.5 text-white/30 text-xs">
                        <Eye className="w-3 h-3" />
                        {/* view count not in story object, show likes */}
                        {Number(story.likesCount)} ♥
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Delete this story?")) return;
                      try {
                        await deleteStory.mutateAsync(story.id);
                      } catch {}
                    }}
                    data-ocid={`admin.stories.delete_button.${i + 1}`}
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "oklch(0.65 0.22 10 / 0.2)" }}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
