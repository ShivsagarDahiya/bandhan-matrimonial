import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function GalleryLightbox({
  images,
  initialIndex = 0,
  onClose,
}: Props) {
  const [idx, setIdx] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);

  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
  const next = useCallback(
    () => setIdx((i) => Math.min(images.length - 1, i + 1)),
    [images.length],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff > 50) prev();
    else if (diff < -50) next();
    touchStartX.current = null;
  };

  const current = images[idx];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.97)" }}
      data-ocid="gallery.modal"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Counter */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-white text-sm font-medium"
        style={{ background: "rgba(255,255,255,0.15)" }}
      >
        {idx + 1} / {images.length}
      </div>

      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        data-ocid="gallery.close_button"
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center z-10"
        style={{ background: "rgba(255,255,255,0.15)" }}
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Image */}
      <AnimatePresence mode="wait">
        <motion.img
          key={idx}
          src={current}
          alt={`${idx + 1} of ${images.length}`}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.2 }}
          className="max-w-full max-h-full object-contain"
          style={{ maxHeight: "85vh", maxWidth: "92vw" }}
        />
      </AnimatePresence>

      {/* Prev */}
      {idx > 0 && (
        <button
          type="button"
          onClick={prev}
          data-ocid="gallery.secondary_button"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Next */}
      {idx < images.length - 1 && (
        <button
          type="button"
          onClick={next}
          data-ocid="gallery.primary_button"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Dot strip */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5">
          {images.map((url, i) => (
            <button
              key={url || String(i)}
              type="button"
              onClick={() => setIdx(i)}
              className="rounded-full transition-all"
              style={{
                width: i === idx ? 20 : 6,
                height: 6,
                background: i === idx ? "white" : "rgba(255,255,255,0.35)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
