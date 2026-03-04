"use client";

import { useState, useEffect, useCallback } from "react";
import { resolvePhotoUrls } from "@/lib/photo-storage";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoGalleryProps {
  /** Firebase Storage paths */
  paths: string[];
  /** Label shown above the gallery */
  label?: string;
}

/**
 * Resolves Firebase Storage paths and displays thumbnails.
 * Click a thumbnail to open a full-screen lightbox with prev/next.
 */
export function PhotoGallery({ paths, label }: PhotoGalleryProps) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    resolvePhotoUrls(paths).then((resolved) => {
      if (!cancelled) {
        setUrls(resolved);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [paths]);

  const openLightbox = useCallback((idx: number) => setLightboxIdx(idx), []);
  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prev = useCallback(() => setLightboxIdx((i) => (i !== null && i > 0 ? i - 1 : i)), []);
  const next = useCallback(() => setLightboxIdx((i) => (i !== null && i < urls.length - 1 ? i + 1 : i)), [urls.length]);

  // Keyboard nav
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, closeLightbox, prev, next]);

  if (loading) {
    return (
      <div className="flex gap-2 mt-1">
        {paths.map((_, i) => (
          <div key={i} className="h-16 w-16 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (urls.length === 0) return null;

  return (
    <>
      <div className="mt-1">
        {label && <p className="text-xs text-muted-foreground mb-1">{label}</p>}
        <div className="flex flex-wrap gap-2">
          {urls.map((url, idx) => (
            <button
              key={url}
              onClick={() => openLightbox(idx)}
              className="group relative h-16 w-16 overflow-hidden rounded border border-border hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <img
                src={url}
                alt={`Photo ${idx + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox overlay */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/70 hover:text-white z-10"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-white/70 text-sm">
            {lightboxIdx + 1} / {urls.length}
          </div>

          {/* Prev */}
          {lightboxIdx > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
            >
              <ChevronLeft className="h-10 w-10" />
            </button>
          )}

          {/* Image */}
          <img
            src={urls[lightboxIdx]}
            alt={`Photo ${lightboxIdx + 1}`}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {lightboxIdx < urls.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
            >
              <ChevronRight className="h-10 w-10" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
