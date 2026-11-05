import type { Img } from '@/lib/types';
import { cn, imageAt, srcSet } from '@/lib/utils';

/**
 * An image from the API in the right size for the screen: the browser picks from the WebP sizes
 * the API saved, using `sizes` (how wide the image is shown).
 */
export function ApiImage({
  image,
  alt,
  sizes,
  className,
  priority = false,
}: {
  image: Img;
  alt: string;
  sizes: string;
  className?: string;
  /** For the first big image on a page: load it straight away. */
  priority?: boolean;
}) {
  return (
    <img
      src={imageAt(image, 400)}
      srcSet={srcSet(image)}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={image.alt ?? alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={cn('object-contain', className)}
    />
  );
}
