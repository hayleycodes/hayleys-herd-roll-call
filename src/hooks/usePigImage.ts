import { useEffect, useState } from 'react';
import { getPigImageUrl } from '../services/pig-images.service';

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
