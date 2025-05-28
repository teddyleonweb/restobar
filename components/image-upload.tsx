"use client"

import type React from "react"
import { useState, useRef } from "react"
import Image from "next/image"
import { Upload, X, Camera, Loader2, AlertCircle } from "lucide-react"
import { getApiUrl } from "@/lib/api-config"

interface ImageUploadProps {
  currentImage?: string
  onImageChange: (imageUrl: string) => void
  label: string
  aspectRatio?: "square" | "wide" | "tall"
  maxSize?: number // in MB
  acceptedFormats?: string[]
  placeholder?: string
  restaurantId?: number
}

export default function ImageUpload({
  currentImage,
  onImageChange,
  label,
  aspectRatio = "square",
  maxSize = 5,
  acceptedFormats = ["image/jpeg", "image/png", "image/webp"],
  placeholder,
  restaurantId,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const aspectRatioClasses = {
    square: "aspect-square",
    wide: "aspect-[16/9]",
    tall: "aspect-[3/4]",
  }

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedFormats.includes(file.type)) {
      return `Formato no válido. Acepta: ${acceptedFormats.map((f) => f.split("/")[1]).join(", ")}`
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSize) {
      return `El archivo es muy grande. Máximo ${maxSize}MB`
    }

    return null
  }

  const uploadImage = async (file: File): Promise<string> => {
    const token = localStorage.getItem("tubarresto_token")
    if (!token) {
      throw new Error("No autorizado")
    }

    // Validar restaurant_id antes de enviar
    if (!restaurantId || restaurantId <= 0 || isNaN(Number(restaurantId))) {
      console.error("Invalid restaurant ID:", restaurantId, typeof restaurantId)
      throw new Error(`ID de restaurante inválido: ${restaurantId}. Por favor, cierra y vuelve a abrir el modal.`)
    }

    const formData = new FormData()
    formData.append("image", file)
    formData.append("restaurant_id", restaurantId?.toString() || "")
    formData.append("category", "gallery") // Default category for all images
    formData.append("title", file.name.split(".")[0]) // Usar nombre del archivo como título

    // Debug: Log the data being sent
    console.log("Uploading image with:", {
      restaurantId,
      restaurantIdType: typeof restaurantId,
      restaurantIdValid: !!(restaurantId && restaurantId > 0),
      fileName: file.name,
      fileSize: file.size,
      hasToken: !!token,
      formDataEntries: Array.from(formData.entries()),
    })

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + Math.random() * 20, 90))
    }, 200)

    try {
      const apiUrl = getApiUrl("UPLOAD_IMAGE")
      console.log("Uploading to:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Upload error response:", errorText, "Status:", response.status)

        try {
          const errorData = JSON.parse(errorText)
          throw new Error(errorData.error || `Error del servidor: ${response.status}`)
        } catch (parseError) {
          throw new Error(`Error del servidor: ${response.status}. Detalles: ${errorText.substring(0, 200)}`)
        }
      }

      const result = await response.json()
      console.log("Upload result:", result)

      if (result.success) {
        return result.data.image.url
      } else {
        throw new Error(result.error || "Error al subir imagen")
      }
    } catch (error) {
      clearInterval(progressInterval)
      console.error("Upload error:", error)
      throw error
    }
  }

  const handleFileSelect = async (file: File) => {
    setError("")

    // Validar restaurant ID - make it more flexible
    if (!restaurantId || restaurantId === 0 || isNaN(Number(restaurantId))) {
      console.error("Invalid restaurant ID:", restaurantId, typeof restaurantId)
      setError(`ID de restaurante inválido: ${restaurantId}. Por favor, cierra y vuelve a abrir el modal.`)
      return
    }

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const imageUrl = await uploadImage(file)
      onImageChange(imageUrl)
    } catch (err) {
      console.error("Error uploading image:", err)
      setError(err instanceof Error ? err.message : "Error al subir la imagen")
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const removeImage = () => {
    onImageChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div className="relative">
        {currentImage ? (
          <div
            className={`relative ${aspectRatioClasses[aspectRatio]} w-full max-w-xs rounded-lg overflow-hidden border-2 border-gray-200 group`}
          >
            <Image
              src={currentImage || "/placeholder.svg"}
              alt={label}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />

            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  title="Cambiar imagen"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  onClick={removeImage}
                  className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                  title="Eliminar imagen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Upload progress overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white rounded-lg p-4 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                  <p className="text-sm text-gray-600">Subiendo... {Math.round(uploadProgress)}%</p>
                  <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`
              ${aspectRatioClasses[aspectRatio]} w-full max-w-xs
              border-2 border-dashed rounded-lg
              ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}
              ${isUploading ? "border-blue-500 bg-blue-50" : "hover:border-gray-400"}
              transition-colors duration-200 cursor-pointer
              flex flex-col items-center justify-center
              relative overflow-hidden
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                <p className="text-sm text-gray-600">Subiendo...</p>
                <p className="text-xs text-gray-500">{Math.round(uploadProgress)}%</p>
                <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center p-4">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-1">Arrastra una imagen aquí</p>
                <p className="text-xs text-gray-500 mb-2">o haz clic para seleccionar</p>
                {placeholder && <p className="text-xs text-gray-400">{placeholder}</p>}
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(",")}
          onChange={handleInputChange}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* File format info */}
      <div className="text-xs text-gray-500">
        Formatos: {acceptedFormats.map((f) => f.split("/")[1].toUpperCase()).join(", ")} • Máximo {maxSize}MB
      </div>
    </div>
  )
}
