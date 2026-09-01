import { useEffect, useMemo, useState } from 'react';
import { getPigImageUrl } from '../services/pig-images.service';

/** The pig's primary photo (first in the list), or null if it has none. */
export const primaryPhoto = (
  paths: string[] | null | undefined
): string | null => paths?.[0] ?? null;

export const usePigImage = (imagePath: string | null | undefined) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(!!imagePath);
  const [imageReady, setImageReady] = useState(false);

  // Reset state synchronously during render when the path changes, instead of
  // in the effect — otherwise the card would briefly show the previous photo's
  // loaded state before the effect runs.
  const [loadedPath, setLoadedPath] = useState(imagePath);
  if (imagePath !== loadedPath) {
    setLoadedPath(imagePath);
    setImageLoading(!!imagePath);
    setImageReady(false);
  }

  useEffect(() => {
    if (!imagePath) {
      return;
    }
    let alive = true;
    const load = async () => {
      try {
        const { signedUrl } = await getPigImageUrl(imagePath);
        if (!alive) return;
        const img = new Image();
        img.onload = () => {
          if (!alive) return;
          setImageUrl(signedUrl);
          setImageLoading(false);
          requestAnimationFrame(() => {
            if (alive) setImageReady(true);
          });
        };
        img.onerror = () => {
          if (!alive) return;
          setImageUrl(signedUrl);
          setImageLoading(false);
          setImageReady(true);
        };
        img.src = signedUrl;
      } catch {
        // Signing failed — drop the spinner and fall back to the placeholder.
        if (alive) setImageLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [imagePath]);

  const setUrl = (url: string) => {
    setImageUrl(url);
  };

  return { imageUrl, imageLoading, imageReady, setImageUrl: setUrl };
};

/**
 * Like usePigImage, but picks one of the pig's photos at random — chosen once
 * per mount, so the card shows a different photo each time it appears without
 * flickering on re-render.
 */
export const useRandomPigImage = (paths: string[] | null | undefined) => {
  const list = useMemo(() => (paths ?? []).filter(Boolean), [paths]);
  const [chosen] = useState<string | null>(() =>
    list.length ? list[Math.floor(Math.random() * list.length)] : null
  );
  return usePigImage(chosen);
};
