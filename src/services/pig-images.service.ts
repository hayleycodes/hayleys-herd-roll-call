import imageCompression from 'browser-image-compression';
import { supabase } from '../lib/supabase-client';

export const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.25,
    maxWidthOrHeight: 900,
    useWebWorker: true,
    fileType: 'image/jpeg',
  };

  const compressedFile = await imageCompression(file, options);
  return compressedFile as File;
};

export const uploadPigImage = async (file: File, pigId: number) => {
  const filePath = `${pigId}/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from('pig_photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  imageCache.delete(filePath);
  return filePath;
};

// How long each signed URL stays valid. Long enough to cover a whole session
// so a URL already rendered into an <img> doesn't expire while it's on screen.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;
// Re-sign a little before the URL actually expires, so we never hand out one
// that's about to 403.
const CACHE_SAFETY_MS = 5 * 60 * 1000;

type CacheEntry = { url: string; expiresAt: number };

const imageCache = new Map<string, CacheEntry>();
// In-flight requests, so N thumbnails for the same path share one network call
// instead of firing a burst of concurrent createSignedUrl requests.
const inflight = new Map<string, Promise<{ signedUrl: string }>>();

export const getPigImageUrl = async (path: string, skipCache = false) => {
  if (!skipCache) {
    const cached = imageCache.get(path);
    if (cached && cached.expiresAt - CACHE_SAFETY_MS > Date.now()) {
      return { signedUrl: cached.url };
    }
    const existing = inflight.get(path);
    if (existing) return existing;
  }

  const request = (async () => {
    const { data, error } = await supabase.storage
      .from('pig_photos')
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (error) throw error;

    imageCache.set(path, {
      url: data.signedUrl,
      expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
    });
    return { signedUrl: data.signedUrl };
  })();

  inflight.set(path, request);
  try {
    return await request;
  } finally {
    inflight.delete(path);
  }
};

export const invalidateImageCache = (path: string) => {
  imageCache.delete(path);
};
