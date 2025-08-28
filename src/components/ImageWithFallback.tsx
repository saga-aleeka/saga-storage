import React, { useState } from "react";

const DEFAULT_ERROR_SVG =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Rya2Utd2lkdGg9IjMuNyI+PHJlY3QgeD0iMTYiIHk9IjE2IiB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHJ4PSI2Ii8+PHBhdGggZD0ibTE2IDU4IDE2LTE4IDMyIDMyIi8+PGNpcmNsZSBjeD0iNTMiIGN5PSIzNSIgcj0iNyIvPjwvc3ZnPgoK';

export type ImageWithFallbackProps =
  React.ImgHTMLAttributes<HTMLImageElement> & {
    /** Custom fallback `src` (data URL or path). */
    fallbackSrc?: string;
    /** Fallback alt text when the main image fails. */
    fallbackAlt?: string;
    /** Optional wrapper classes applied when showing the fallback box. */
    wrapperClassName?: string;
  };

/**
 * Minimal image with an error fallback. Keeps your original <img> API.
 * Works great with Tailwind classes like object-cover, rounded-xl, etc.
 */
export function ImageWithFallback({
  fallbackSrc = DEFAULT_ERROR_SVG,
  fallbackAlt = "Error loading image",
  wrapperClassName = "",
  onError,
  src,
  alt,
  className,
  style,
  ...rest
}: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);

  const handleError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    setDidError(true);
    onError?.(e);
  };

  if (didError) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${wrapperClassName}`}
        style={style}
        aria-label={fallbackAlt}
        role="img"
      >
        <div className="flex items-center justify-center w-full h-full">
          <img
            src={fallbackSrc}
            alt={fallbackAlt}
            data-original-url={src}
            className={className}
            {...rest}
          />
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
    />
  );
}
