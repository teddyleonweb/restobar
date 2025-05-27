"use client"
import { useState, useEffect } from "react"
import Image from "next/image"
import { Upload, Edit3, Trash2, Star, StarOff, Plus } from "lucide-react"
import ImageUpload from "@/components/image-upload"

interface RestaurantImage {
  id: string
  url: string
  title: string
  description?: string
  isPrimary?: boolean
  createdAt: string
}

interface RestaurantImageGalleryProps {
  restaurantId: number
  images: RestaurantImage[]
  onImagesChange: (images: RestaurantImage[]) => void
  canEdit?: boolean
}

export default function RestaurantImageGallery({
  restaurantId,
  images: initialImages,
  onImagesChange,
  canEdit = false,
}: RestaurantImageGalleryProps) {
  const [images, setImages] = useState<RestaurantImage[]>(initialImages || [])
  const [isLoading, setIsLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [editingImage, setEditingImage] = useState<RestaurantImage | null>(null)
  const [newImageTitle, setNewImageTitle] = useState("")
  const [newImageDescription, setNewImageDescription] = useState("")

  // Debug: Log restaurant ID
  console.log("RestaurantImageGallery - Restaurant ID:", restaurantId, typeof restaurantId)

  useEffect(() => {
    setImages(initialImages || [])
  }, [initialImages])

  const handleImageUpload = (imageUrl: string) => {
    if (!imageUrl) return

    // Crear nueva imagen
    const newImage: RestaurantImage = {
      id: Date.now().toString(),
      url: imageUrl,
      title: newImageTitle || "Nueva imagen",
      description: newImageDescription || "",
      isPrimary: images.length === 0, // Primera imagen es principal por defecto
      createdAt: new Date().toISOString(),
    }

    const updatedImages = [...images, newImage]
    setImages(updatedImages)
    onImagesChange(updatedImages)

    // Limpiar formulario
    setNewImageTitle("")
    setNewImageDescription("")
    setShowUpload(false)
  }

  const handleDeleteImage = (imageId: string) => {
    const updatedImages = images.filter((img) => img.id !== imageId)
    setImages(updatedImages)
    onImagesChange(updatedImages)
  }

  const handleSetPrimary = (imageId: string) => {
    const updatedImages = images.map((img) => ({
      ...img,
      isPrimary: img.id === imageId,
    }))
    setImages(updatedImages)
    onImagesChange(updatedImages)
  }

  const handleEditImage = (image: RestaurantImage) => {
    setEditingImage(image)
    setNewImageTitle(image.title)
    setNewImageDescription(image.description || "")
  }

  const handleSaveEdit = () => {
    if (!editingImage) return

    const updatedImages = images.map((img) =>
      img.id === editingImage.id
        ? {
            ...img,
            title: newImageTitle,
            description: newImageDescription,
          }
        : img,
    )

    setImages(updatedImages)
    onImagesChange(updatedImages)
    setEditingImage(null)
    setNewImageTitle("")
    setNewImageDescription("")
  }

  if (!restaurantId || restaurantId === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error: ID de restaurante no válido ({restaurantId})</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Galería de Imágenes</h3>
          <p className="text-sm text-gray-600">
            {images.length} {images.length === 1 ? "imagen" : "imágenes"}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Imagen
          </button>
        )}
      </div>

      {/* Upload Form */}
      {showUpload && canEdit && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h4 className="font-medium text-gray-900 mb-4">Subir Nueva Imagen</h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <input
                type="text"
                value={newImageTitle}
                onChange={(e) => setNewImageTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Título de la imagen"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
              <textarea
                value={newImageDescription}
                onChange={(e) => setNewImageDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={2}
                placeholder="Descripción de la imagen"
              />
            </div>

            <ImageUpload
              currentImage=""
              onImageChange={handleImageUpload}
              label="Seleccionar Imagen"
              aspectRatio="wide"
              restaurantId={restaurantId}
            />

            <div className="flex space-x-2">
              <button
                onClick={() => setShowUpload(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Images Grid */}
      {images.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay imágenes</h3>
          <p className="text-gray-600 mb-4">Agrega la primera imagen de tu restaurante</p>
          {canEdit && (
            <button
              onClick={() => setShowUpload(true)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Subir Primera Imagen
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative group bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* Image */}
              <div className="relative aspect-video">
                <Image
                  src={image.url || "/placeholder.svg"}
                  alt={image.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />

                {/* Primary Badge */}
                {image.isPrimary && (
                  <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                    <Star className="w-3 h-3 mr-1" />
                    Principal
                  </div>
                )}

                {/* Actions Overlay */}
                {canEdit && (
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
                      <button
                        onClick={() => handleEditImage(image)}
                        className="bg-white text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleSetPrimary(image.id)}
                        className={`p-2 rounded-full transition-colors ${
                          image.isPrimary ? "bg-yellow-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                        title={image.isPrimary ? "Es principal" : "Marcar como principal"}
                      >
                        {image.isPrimary ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleDeleteImage(image.id)}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Image Info */}
              <div className="p-3">
                <h4 className="font-medium text-gray-900 truncate">{image.title}</h4>
                {image.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{image.description}</p>}
                <p className="text-xs text-gray-500 mt-2">{new Date(image.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Editar Imagen</h3>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={newImageTitle}
                  onChange={(e) => setNewImageTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={newImageDescription}
                  onChange={(e) => setNewImageDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex space-x-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setEditingImage(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
