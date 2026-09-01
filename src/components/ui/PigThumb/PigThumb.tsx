import { usePigImage } from '../../../hooks/usePigImage';

type Props = {
  imagePath: string | null;
  /** Base class for the loaded thumbnail. */
  className?: string;
  /** Extra class applied (alongside className) while there's no image. */
  placeholderClassName?: string;
};

/**
 * A pig's photo rendered as a background-image swatch, with a 🐹 placeholder
 * while the signed URL loads or when the pig has no photo. Class names are
 * caller-supplied so each context keeps its own sizing/shape from CSS.
 */
const PigThumb = ({
  imagePath,
  className = 'pigPickerThumb',
  placeholderClassName = 'pigPickerThumbPlaceholder',
}: Props) => {
  const { imageUrl } = usePigImage(imagePath);

  if (!imageUrl)
    return <div className={`${className} ${placeholderClassName}`}>🐹</div>;
  return (
    <div
      className={className}
      style={{ backgroundImage: `url(${imageUrl})` }}
    />
  );
};

export default PigThumb;
