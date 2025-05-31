"use client"

import type React from "react"
import { useState, useRef } from "react"
import Image from "next/image"
import { Upload, X, Camera, Loader2, AlertCircle, FileText } from "lucide-react"
import { ApiClient } from "@/lib/api-client"

interface MenuFileUploadProps {
  currentFileUrl?: string
  onFileUpload: (fileUrl: string, fileType: "image" | "pdf", fileName: string) => void
  label: string
  aspectRatio?: "square" | "wide" | "tall"
  maxSize?: number // in MB
  acceptedFormats?: string[]
  placeholder?: string
  restaurantId?: number
}

export default function MenuFileUpload({
  currentFileUrl,
  onFileUpload,
  label,
  aspectRatio = "wide",
  maxSize = 10, // Increased for PDFs
  acceptedFormats = ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  placeholder,
  restaurantId,
}: MenuFileUploadProps) {
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
      return `Formato no válido. Acepta: ${acceptedFormats.map((f) => f.split("/").pop()).join(", ")}`
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSize) {
      return `El archivo es muy grande. Máximo ${maxSize}MB`
    }

    return null
  }

  const uploadFile = async (file: File): Promise<{ url: string; fileType: "image" | "pdf"; fileName: string }> => {
    if (!restaurantId || restaurantId <= 0 || isNaN(Number(restaurantId))) {
      throw new Error(`ID de restaurante inválido: ${restaurantId}. Por favor, cierra y vuelve a abrir el modal.`)
    }

    const formData = new FormData()
    formData.append("menu_file", file) // Use 'menu_file' as the key for the API
    formData.append("restaurant_id", restaurantId.toString())
    formData.append("title", file.name.split(".")[0]) // Use file name as title

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + Math.random() * 20, 90))
    }, 200)

    try {
      const result = await ApiClient.uploadMenuFile(formData)

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (result.success && result.data?.menu) {
        const menuData = result.data.menu
        return {
          url: menuData.url,
          fileType: menuData.fileType,
          fileName: menuData.fileName,
        }
      } else {
        throw new Error(result.error || "Error al subir archivo de menú")
      }
    } catch (error) {
      clearInterval(progressInterval)
      console.error("Upload menu file error:", error)
      throw error
    }
  }

  const handleFileSelect = async (file: File) => {
    setError("")

    if (!restaurantId || restaurantId === 0 || isNaN(Number(restaurantId))) {
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
      const { url, fileType, fileName } = await uploadFile(file)
      onFileUpload(url, fileType, fileName)
    } catch (err) {
      console.error("Error uploading menu file:", err)
      setError(err instanceof Error ? err.message : "Error al subir el archivo de menú")
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

  const removeFile = () => {
    onFileUpload("", "image", "") // Reset to empty
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const isImage =
    currentFileUrl &&
    (currentFileUrl.endsWith(".jpg") ||
      currentFileUrl.endsWith(".jpeg") ||
      currentFileUrl.endsWith(".png") ||
      currentFileUrl.endsWith(".webp"))
  const isPdf = currentFileUrl && currentFileUrl.endsWith(".pdf")

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div className="relative">
        {currentFileUrl ? (
          <div
            className={`relative ${aspectRatioClasses[aspectRatio]} w-full max-w-xs rounded-lg overflow-hidden border-2 border-gray-200 group`}
          >
            {isImage ? (
              <Image
                src={currentFileUrl || "/placeholder.svg"}
                alt={label}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : isPdf ? (
              <div className="flex flex-col items-center justify-center w-full h-full bg-gray-100 text-red-500">
                <FileText className="w-16 h-16 mb-2" />
                <p className="text-sm font-medium">Archivo PDF</p>
                <a
                  href={currentFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1"
                >
                  Ver PDF
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full bg-gray-100 text-gray-500">
                <AlertCircle className="w-16 h-16 mb-2" />
                <p className="text-sm font-medium">Archivo no reconocido</p>
              </div>
            )}

            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  title="Cambiar archivo"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  onClick={removeFile}
                  className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                  title="Eliminar archivo"
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
                <p className="text-sm text-gray-600 mb-1">Arrastra un archivo aquí</p>
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
        Formatos: {acceptedFormats.map((f) => f.split("/").pop()?.toUpperCase()).join(", ")} • Máximo {maxSize}MB
      </div>
    </div>
  )
}
