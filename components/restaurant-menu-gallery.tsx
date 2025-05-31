"use client"
import { useState, useEffect } from "react"
import Image from "next/image"
import { Edit3, Trash2, Plus, FileText, ImageIcon, ExternalLink } from "lucide-react"
import MenuFileUpload from "@/components/menu-file-upload"
import { ApiClient, type RestaurantMenu } from "@/lib/api-client"
import { toast } from "@/hooks/use-toast"

interface RestaurantMenuGalleryProps {
  restaurantId: number
  menus: RestaurantMenu[]
  onMenusChange: (menus: RestaurantMenu[]) => void
  canEdit?: boolean
}

export default function RestaurantMenuGallery({
  restaurantId,
  menus: initialMenus,
  onMenusChange,
  canEdit = false,
}: RestaurantMenuGalleryProps) {
  const [menus, setMenus] = useState<RestaurantMenu[]>(initialMenus || [])
  const [isLoading, setIsLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [editingMenu, setEditingMenu] = useState<RestaurantMenu | null>(null)
  const [newMenuTitle, setNewMenuTitle] = useState("")
  const [newMenuDescription, setNewMenuDescription] = useState("")

  useEffect(() => {
    setMenus(initialMenus || [])
  }, [initialMenus])

  const handleMenuFileUpload = (fileUrl: string, fileType: "image" | "pdf", fileName: string) => {
    if (!fileUrl) return

    // Create a dummy ID for immediate UI update
    const tempId = `temp-${Date.now()}`

    const newMenu: RestaurantMenu = {
      id: tempId, // Will be replaced by actual ID from DB on next fetch
      url: fileUrl,
      title: newMenuTitle || fileName,
      description: newMenuDescription || "",
      fileType: fileType,
      fileName: fileName,
      fileSize: 0, // Placeholder, actual size from API
      mimeType: fileType === "image" ? "image/jpeg" : "application/pdf", // Placeholder
      width: fileType === "image" ? 0 : undefined, // Placeholder
      height: fileType === "image" ? 0 : undefined, // Placeholder
      sortOrder: menus.length,
      createdAt: new Date().toISOString(),
    }

    const updatedMenus = [...menus, newMenu]
    setMenus(updatedMenus)
    onMenusChange(updatedMenus) // Notify parent immediately

    // Clear form
    setNewMenuTitle("")
    setNewMenuDescription("")
    setShowUpload(false)

    toast({
      title: "Menú subido",
      description: "El archivo de menú se ha subido correctamente.",
    })
  }

  const handleDeleteMenu = async (menuId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este menú? Esta acción no se puede deshacer.")) {
      return
    }

    setIsLoading(true)
    try {
      const result = await ApiClient.deleteRestaurantMenu(Number(menuId))
      if (result.success) {
        const updatedMenus = menus.filter((menu) => menu.id !== menuId)
        setMenus(updatedMenus)
        onMenusChange(updatedMenus)
        toast({
          title: "Menú eliminado",
          description: "El menú se ha eliminado correctamente.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo eliminar el menú.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor para eliminar el menú.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditMenu = (menu: RestaurantMenu) => {
    setEditingMenu(menu)
    setNewMenuTitle(menu.title)
    setNewMenuDescription(menu.description || "")
  }

  const handleSaveEdit = () => {
    if (!editingMenu) return

    // In a real app, you'd send an API request to update the menu details
    // For now, we'll just update the local state
    const updatedMenus = menus.map((menu) =>
      menu.id === editingMenu.id
        ? {
            ...menu,
            title: newMenuTitle,
            description: newMenuDescription,
          }
        : menu,
    )

    setMenus(updatedMenus)
    onMenusChange(updatedMenus)
    setEditingMenu(null)
    setNewMenuTitle("")
    setNewMenuDescription("")
    toast({
      title: "Menú actualizado",
      description: "La información del menú se ha actualizado correctamente.",
    })
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
          <h3 className="text-lg font-semibold text-gray-900">Menús Digitales</h3>
          <p className="text-sm text-gray-600">
            {menus.length} {menus.length === 1 ? "menú" : "menús"} subidos
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Subir Menú
          </button>
        )}
      </div>

      {/* Upload Form */}
      {showUpload && canEdit && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h4 className="font-medium text-gray-900 mb-4">Subir Nuevo Menú (Imagen o PDF)</h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título del Menú *</label>
              <input
                type="text"
                value={newMenuTitle}
                onChange={(e) => setNewMenuTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Menú de Verano 2024"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
              <textarea
                value={newMenuDescription}
                onChange={(e) => setNewMenuDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={2}
                placeholder="Menú especial con platos de temporada"
              />
            </div>

            <MenuFileUpload
              currentFileUrl=""
              onFileUpload={handleMenuFileUpload}
              label="Seleccionar Archivo de Menú"
              aspectRatio="tall" // Menus are often tall
              restaurantId={restaurantId}
              acceptedFormats={["image/jpeg", "image/png", "image/webp", "application/pdf"]}
              placeholder="Sube una imagen o un PDF de tu menú"
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

      {/* Menus Grid */}
      {menus.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay menús subidos</h3>
          <p className="text-gray-600 mb-4">Sube tu primer menú digital (imagen o PDF)</p>
          {canEdit && (
            <button
              onClick={() => setShowUpload(true)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Subir Primer Menú
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menus.map((menu) => (
            <div key={menu.id} className="relative group bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* File Preview */}
              <div className="relative aspect-video flex items-center justify-center bg-gray-100">
                {menu.fileType === "image" ? (
                  <Image
                    src={menu.url || "/placeholder.svg"}
                    alt={menu.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-red-500 p-4">
                    <FileText className="w-16 h-16 mb-2" />
                    <p className="text-sm font-medium text-center">Menú PDF</p>
                  </div>
                )}
                {/* Link to view file */}
                <a
                  href={menu.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 bg-white p-2 rounded-full shadow-md text-gray-700 hover:bg-gray-100 transition-colors"
                  title="Ver archivo"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Actions Overlay */}
              {canEdit && (
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
                    <button
                      onClick={() => handleEditMenu(menu)}
                      className="bg-white text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteMenu(menu.id)}
                      className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                      title="Eliminar"
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Menu Info */}
              <div className="p-3">
                <h4 className="font-medium text-gray-900 truncate">{menu.title}</h4>
                {menu.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{menu.description}</p>}
                <p className="text-xs text-gray-500 mt-2">
                  {menu.fileType === "image" ? (
                    <ImageIcon className="inline-block w-3 h-3 mr-1" />
                  ) : (
                    <FileText className="inline-block w-3 h-3 mr-1" />
                  )}
                  {menu.fileType.toUpperCase()} • {new Date(menu.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Editar Menú</h3>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={newMenuTitle}
                  onChange={(e) => setNewMenuTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={newMenuDescription}
                  onChange={(e) => setNewMenuDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex space-x-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setEditingMenu(null)}
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
