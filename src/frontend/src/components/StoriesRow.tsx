import { Image, Plus, Video, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { useAddStory, useStories } from "../hooks/useQueries";
import { useStorageUpload } from "../hooks/useStorageUpload";
import StoryViewerModal from "./StoryViewerModal";

function AddStoryDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { uploadFile, uploading, progress } = useStorageUpload();
  const addStory = useAddStory();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setError(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  function handleCancel() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onClose();
  }

  async function handlePost() {
    if (!selectedFile) return;
    setError(null);
    try {
      const url = await uploadFile(selectedFile);
      await addStory.mutateAsync({ imageUrl: url, caption });
      setPosted(true);
      setTimeout(() => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  const isVideo = selectedFile?.type.startsWith("video/");
  const isBusy = uploading || addStory.isPending;

  return (
    <motion.div
      data-ocid="stories.add_story.dialog"
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
        onClick={handleCancel}
      />

      <motion.div
        className="relative w-full max-w-md rounded-t-3xl overflow-hidden"
        style={{ background: "oklch(0.13 0.04 330)" }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-white font-semibold text-base">Add Story</h2>
          <button
            type="button"
            onClick={handleCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "oklch(0.22 0.05 330)" }}
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        <div className="px-5 pb-8 space-y-4">
          {/* File picker area */}
          {!selectedFile ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-52 rounded-2xl flex flex-col items-center justify-center gap-3 border-2 border-dashed transition-colors"
              style={{
                borderColor: "oklch(0.45 0.15 330)",
                background: "oklch(0.17 0.05 330)",
              }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.55 0.22 10), oklch(0.45 0.22 300))",
                }}
              >
                <Plus className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <p className="text-white/80 text-sm font-medium">
                  Tap to choose photo or video
                </p>
                <p className="text-white/40 text-xs mt-1">
                  JPG, PNG, MP4, MOV supported
                </p>
              </div>
            </button>
          ) : (
            <div className="relative w-full h-52 rounded-2xl overflow-hidden">
              {isVideo ? (
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-2"
                  style={{ background: "oklch(0.17 0.05 330)" }}
                >
                  <Video className="w-10 h-10" style={{ color: "#f43f5e" }} />
                  <p className="text-white/70 text-sm">{selectedFile.name}</p>
                </div>
              ) : (
                <img
                  src={previewUrl!}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              )}
              {/* Change button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-medium text-white"
                style={{ background: "rgba(0,0,0,0.55)" }}
              >
                Change
              </button>
              {!isVideo && (
                <div
                  className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full"
                  style={{ background: "rgba(0,0,0,0.5)" }}
                >
                  <Image className="w-3 h-3 text-white/70" />
                  <span className="text-white/70 text-[10px]">Photo</span>
                </div>
              )}
            </div>
          )}

          {/* Caption */}
          <div>
            <input
              data-ocid="stories.add_story.input"
              type="text"
              placeholder="Add a caption…"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/35 outline-none border"
              style={{
                background: "oklch(0.17 0.05 330)",
                borderColor: "oklch(0.35 0.08 330)",
              }}
            />
          </div>

          {/* Progress bar */}
          {isBusy && (
            <div className="space-y-1.5">
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ background: "oklch(0.22 0.05 330)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #f43f5e, #7c3aed)",
                  }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${uploading ? progress : 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-white/50 text-xs text-center">
                {uploading ? `Uploading… ${progress}%` : "Posting story…"}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p
              data-ocid="stories.add_story.error_state"
              className="text-sm text-center px-3 py-2 rounded-xl"
              style={{ background: "oklch(0.25 0.1 20)", color: "#fb7185" }}
            >
              {error}
            </p>
          )}

          {/* Success */}
          {posted && (
            <p
              data-ocid="stories.add_story.success_state"
              className="text-sm text-center px-3 py-2 rounded-xl font-medium"
              style={{ background: "oklch(0.22 0.1 145)", color: "#4ade80" }}
            >
              Story posted! ✓
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              data-ocid="stories.add_story.cancel_button"
              onClick={handleCancel}
              disabled={isBusy}
              className="flex-1 py-3 rounded-xl text-sm font-medium text-white/70 disabled:opacity-50 transition-opacity"
              style={{ background: "oklch(0.22 0.05 330)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              data-ocid="stories.add_story.submit_button"
              onClick={handlePost}
              disabled={!selectedFile || isBusy || posted}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
              style={{
                background: "linear-gradient(135deg, #f43f5e, #7c3aed)",
              }}
            >
              {isBusy ? "Posting…" : "Post Story"}
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          data-ocid="stories.upload_button"
          accept="image/*,video/*"
          className="sr-only"
          onChange={handleFileChange}
        />
      </motion.div>
    </motion.div>
  );
}

export default function StoriesRow() {
  const { data: stories = [] } = useStories();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const addStoryBtn = (
    <button
      type="button"
      data-ocid="stories.add_button"
      className="flex flex-col items-center gap-1.5 flex-shrink-0"
      onClick={() => setShowAddDialog(true)}
    >
      <div className="story-ring">
        <div className="story-ring-inner p-0.5">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: "oklch(0.2 0.06 330)" }}
          >
            <Plus className="w-6 h-6" style={{ color: "#f43f5e" }} />
          </div>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground font-body w-14 text-center">
        Add Story
      </span>
    </button>
  );

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar px-5">
        {addStoryBtn}

        {stories.map((story, i) => (
          <button
            key={story.id.toString()}
            type="button"
            data-ocid={`stories.item.${i + 1}`}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
            onClick={() => setViewerIndex(i)}
          >
            <div className="story-ring">
              <div className="story-ring-inner p-0.5">
                <div
                  className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg,#e11d48,#7c3aed)",
                  }}
                >
                  {story.authorPhoto ? (
                    <img
                      src={story.authorPhoto}
                      alt={story.authorName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl text-white font-bold">
                      {story.authorName.charAt(0)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground font-body w-14 text-center truncate">
              {story.authorName}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showAddDialog && (
          <AddStoryDialog onClose={() => setShowAddDialog(false)} />
        )}
      </AnimatePresence>

      {viewerIndex !== null && (
        <StoryViewerModal
          stories={stories}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}
