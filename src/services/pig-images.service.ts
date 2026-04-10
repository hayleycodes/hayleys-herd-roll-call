import imageCompression from "browser-image-compression";
import { supabase } from "../../utils/supabase-client";

export const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.15,
    maxWidthOrHeight: 600,
    useWebWorker: true,
    fileType: "image/jpeg",
  };

  const compressedFile = await imageCompression(file, options);
  return compressedFile as File;
};

export const uploadPigImage = async (file: File, pigId: number) => {
  const filePath = `${pigId}/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from("pig_photos")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  imageCache.delete(filePath);
  return filePath;
};

const imageCache = new Map<string, string>();

export const getPigImageUrl = async (path: string) => {
  const cached = imageCache.get(path);
  if (cached) return { signedUrl: cached };

  const { data, error } = await supabase.storage
    .from("pig_photos")
    .createSignedUrl(path, 60 * 60);

  if (error) throw error;

  imageCache.set(path, data.signedUrl);
  return { signedUrl: data.signedUrl };
};

export const invalidateImageCache = (path: string) => {
  imageCache.delete(path);
};
