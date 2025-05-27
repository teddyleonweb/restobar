"use client"

import { useState } from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"

interface ResponsiveImageProps {
  src: string
  alt: string
  className?: string
  priority?: boolean
  quality?: number
  placeholder?: "blur" | "empty"
  blurDataURL?: string
  sizes?: string
  fill?: boolean
  width?: number
  height?: number
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down"
  onLoad?: () => void
  onError?: () => void
}

export default function ResponsiveImage({
  src,
  alt,
  className = "",
  priority = false,
  quality = 75,
  placeholder = "empty",
  blurDataURL,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  fill = false,
  width,
  height,
  objectFit = "cover",
  onLoad,
  onError,
}: ResponsiveImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    onError?.()
  }

  if (hasError) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500">
          <div className="w-8 h-8 mx-auto mb-2 bg-gray-300 rounded"></div>
          <p className="text-xs">Error al cargar imagen</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      <Image
        src={src || "/placeholder.svg"}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        className={`transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"} ${
          objectFit === "cover"
            ? "object-cover"
            : objectFit === "contain"
              ? "object-contain"
              : objectFit === "fill"
                ? "object-fill"
                : objectFit === "none"
                  ? "object-none"
                  : "object-scale-down"
        }`}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        unoptimized={src.startsWith("blob:")} // For local blob URLs
      />
    </div>
  )
}
