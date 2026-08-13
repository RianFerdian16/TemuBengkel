"use client"

import { useState } from "react"
import { ImageOff } from "lucide-react"

export function GooglePlacePhoto({
  src,
  alt,
  className,
  fallbackLabel = "Foto tidak tersedia",
  loading = "lazy",
}: {
  src: string
  alt: string
  className?: string
  fallbackLabel?: string
  loading?: "eager" | "lazy"
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span className={`google-photo-fallback ${className || ""}`} role="img" aria-label={fallbackLabel}>
        <ImageOff size={20} aria-hidden="true" />
        <span>{fallbackLabel}</span>
      </span>
    )
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
