"use client"

import React from "react"

// Utility functions for image optimization
export const generateImageSizes = (breakpoints: { [key: string]: number }) => {
  return Object.entries(breakpoints)
    .map(([device, width]) => `(max-width: ${width}px) ${width}px`)
    .join(", ")
}

export const getOptimizedImageUrl = (originalUrl: string, width: number, height?: number, quality = 75): string => {
  // In a real implementation, this would integrate with your image optimization service
  // For now, we'll return the original URL
  // Example with Cloudinary:
  // return `https://res.cloudinary.com/your-cloud/image/fetch/w_${width},h_${height || 'auto'},q_${quality},f_auto/${encodeURIComponent(originalUrl)}`

  return originalUrl
}

export const generateBlurDataURL = (width = 10, height = 10): string => {
  // Generate a simple blur placeholder
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")

  if (ctx) {
    // Create a simple gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, "#f3f4f6")
    gradient.addColorStop(1, "#e5e7eb")

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }

  return canvas.toDataURL()
}

// Component for displaying optimized restaurant logos
interface RestaurantLogoProps {
  src: string
  alt: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

export const RestaurantLogo: React.FC<RestaurantLogoProps> = ({ src, alt, size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  }

  const sizes = {
    sm: "32px",
    md: "48px",
    lg: "64px",
    xl: "96px",
  }

  return (
    <div className={`${sizeClasses[size]} relative rounded-full overflow-hidden bg-white shadow-sm ${className}`}>
      <img
        src={src || "/placeholder.svg"}
        alt={alt}
        className="w-full h-full object-cover"
        sizes={sizes[size]}
        loading="lazy"
      />
    </div>
  )
}

// Component for restaurant cover images
interface RestaurantCoverProps {
  src: string
  alt: string
  className?: string
  overlay?: boolean
}

export const RestaurantCover: React.FC<RestaurantCoverProps> = ({ src, alt, className = "", overlay = false }) => {
  return (
    <div className={`relative aspect-[16/9] overflow-hidden ${className}`}>
      <img
        src={src || "/placeholder.svg"}
        alt={alt}
        className="w-full h-full object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        loading="lazy"
      />
      {overlay && <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />}
    </div>
  )
}

// Hook for managing image loading states
export const useImageLoader = () => {
  const [loadingImages, setLoadingImages] = React.useState<Set<string>>(new Set())
  const [errorImages, setErrorImages] = React.useState<Set<string>>(new Set())

  const setImageLoading = (src: string, isLoading: boolean) => {
    setLoadingImages((prev) => {
      const newSet = new Set(prev)
      if (isLoading) {
        newSet.add(src)
      } else {
        newSet.delete(src)
      }
      return newSet
    })
  }

  const setImageError = (src: string, hasError: boolean) => {
    setErrorImages((prev) => {
      const newSet = new Set(prev)
      if (hasError) {
        newSet.add(src)
      } else {
        newSet.delete(src)
      }
      return newSet
    })
  }

  const isImageLoading = (src: string) => loadingImages.has(src)
  const hasImageError = (src: string) => errorImages.has(src)

  return {
    setImageLoading,
    setImageError,
    isImageLoading,
    hasImageError,
  }
}
