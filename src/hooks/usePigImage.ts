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

  useEffect(() => {
    if (!imagePath) {
      setImageLoading(false);
      return;
    }
    setImageLoading(true);
    setImageReady(false);
    const load = async () => {
      const { signedUrl } = await getPigImageUrl(imagePath);
      const img = new Image();
      img.onload = () => {
        setImageUrl(signedUrl);
        setImageLoading(false);
        requestAnimationFrame(() => setImageReady(true));
      };
      img.onerror = () => {
        setImageUrl(signedUrl);
        setImageLoading(false);
        setImageReady(true);
      };
      img.src = signedUrl;
    };
    load();
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
