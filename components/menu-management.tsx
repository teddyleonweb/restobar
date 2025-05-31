"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, ChefHat, Coffee, Tag, X, Eye, EyeOff } from "lucide-react"
import ImageUpload from "@/components/image-upload" // Add this line
import { toast } from "@/hooks/use-toast"
import { ApiClient, type MenuCategory, type MenuItem } from "@/lib/api-client"

interface MenuManagementProps {
  restaurantId: number
  restaurantName: string
}

export default function MenuManagement({ restaurantId, restaurantName }: MenuManagementProps) {
  const [activeTab, setActiveTab] = useState<"food" | "drink" | "categories">("food")
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)

  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: 0,
    type: "food" as "food" | "drink",
    category_id: null as number | null,
    is_available: true,
    is_featured: false,
    dietary: {
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: false,
      is_lactose_free: false,
      is_spicy: false,
    },
    calories: null as number | null,
    preparation_time: null as number | null,
    ingredients: "",
    allergens: "",
    sort_order: 0,
  })

  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    type: "food" as "food" | "drink" | "both",
    sort_order: 0,
  })

  useEffect(() => {
    console.log("🚀 [MenuManagement] useEffect activado. Llamando a loadMenuData().")
    loadMenuData()
  }, [restaurantId])

  const loadMenuData = async () => {
    setIsLoading(true)
    console.log("🔄 [MenuManagement] Iniciando carga de datos del menú.")
    try {
      const statusResult = await ApiClient.checkStatus()
      if (!statusResult.success) {
        console.error("❌ [MenuManagement] Error de conexión con la API:", statusResult.error)
        throw new Error("No se puede conectar con la API")
      }
      console.log("✅ [MenuManagement] Estado de la API verificado:", statusResult.data)

      if (
        !statusResult.data.database.menu_categories_table_exists ||
        !statusResult.data.database.menu_items_table_exists
      ) {
        toast({
          title: "Base de datos no configurada",
          description: "Las tablas de menú no existen. Por favor, ejecute el script SQL de creación de tablas.",
          variant: "destructive",
        })
        console.warn("⚠️ [MenuManagement] Tablas de menú no encontradas en la base de datos.")
        return
      }

      await Promise.all([loadMenuItems(), loadCategories()])
      console.log("🎉 [MenuManagement] Carga inicial de menú y categorías completada.")
    } catch (error) {
      console.error("💥 [MenuManagement] Error general al cargar datos del menú:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la información del menú. Verifique que las tablas estén creadas.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      console.log("🏁 [MenuManagement] Carga de datos del menú finalizada. isLoading = false.")
    }
  }

  const loadMenuItems = async () => {
    try {
      console.log("🔄 [MenuManagement] Intentando cargar elementos del menú para el restaurante ID:", restaurantId)
      const result = await ApiClient.getMenuItems(restaurantId)
      console.log("✅ [MenuManagement] Respuesta de la API para elementos del menú:", result)
      if (result.success) {
        const fetchedItems = result.data.menu_items || []
        setMenuItems(fetchedItems)
        console.log(
          "✨ [MenuManagement] Elementos del menú establecidos en el estado. Cantidad:",
          fetchedItems.length,
          fetchedItems,
        )
      } else {
        console.error("❌ [MenuManagement] Error al cargar elementos del menú:", result.error)
        if (result.error?.includes("doesn't exist")) {
          toast({
            title: "Tablas no encontradas",
            description: "Las tablas de menú no existen. Ejecute el script SQL de creación.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("💥 [MenuManagement] Error en loadMenuItems:", error)
    }
  }

  const loadCategories = async () => {
    try {
      console.log("🔄 [MenuManagement] Intentando cargar categorías del menú para el restaurante ID:", restaurantId)
      const result = await ApiClient.getMenuCategories(restaurantId)
      console.log("✅ [MenuManagement] Respuesta de la API para categorías:", result)
      if (result.success) {
        const fetchedCategories = result.data.categories || []
        setCategories(fetchedCategories)
        console.log(
          "✨ [MenuManagement] Categorías establecidas en el estado. Cantidad:",
          fetchedCategories.length,
          fetchedCategories,
        )
      }
    } catch (error) {
      console.error("💥 [MenuManagement] Error en loadCategories:", error)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("📝 [MenuManagement] Intentando agregar nuevo ítem:", newItem)

    if (!newItem.name || newItem.price <= 0) {
      toast({
        title: "Error",
        description: "Nombre y precio son requeridos",
        variant: "destructive",
      })
      console.warn("⚠️ [MenuManagement] Validación fallida: Nombre o precio no válidos.")
      return
    }

    try {
      const result = await ApiClient.addMenuItem({
        restaurant_id: restaurantId,
        ...newItem,
      })

      if (result.success) {
        console.log("✅ [MenuManagement] Ítem agregado exitosamente a la API. Recargando menú...")

        // Añadir el nuevo ítem al estado local inmediatamente
        if (result.data && result.data.menu_item) {
          setMenuItems((prevItems) => [...prevItems, result.data.menu_item])
        }

        // También recargar desde la API para asegurar sincronización
        await loadMenuItems()
        console.log("🔄 [MenuManagement] Menú recargado después de agregar. Elementos actuales:", menuItems)

        setShowAddItem(false)
        setNewItem({
          name: "",
          description: "",
          price: 0,
          type: "food",
          category_id: null,
          is_available: true,
          is_featured: false,
          dietary: {
            is_vegetarian: false,
            is_vegan: false,
            is_gluten_free: false,
            is_lactose_free: false,
            is_spicy: false,
          },
          calories: null,
          preparation_time: null,
          ingredients: "",
          allergens: "",
          sort_order: 0,
        })

        toast({
          title: "Éxito",
          description: `${newItem.type === "food" ? "Plato" : "Bebida"} agregado correctamente`,
        })
      } else {
        console.error("❌ [MenuManagement] Error al agregar ítem a la API:", result.error)
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("💥 [MenuManagement] Error en handleAddItem:", error)
      toast({
        title: "Error",
        description: "No se pudo agregar el elemento",
        variant: "destructive",
      })
    }
  }

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingItem) return

    console.log("📝 [MenuManagement] Intentando actualizar ítem:", editingItem)
    try {
      const result = await ApiClient.updateMenuItem(editingItem)

      if (result.success) {
        console.log("✅ [MenuManagement] Ítem actualizado exitosamente en la API. Recargando menú...")

        // Actualizar el ítem en el estado local inmediatamente
        setMenuItems((prevItems) =>
          prevItems.map((item) =>
            item.id === editingItem.id
              ? result.data && result.data.menu_item
                ? result.data.menu_item
                : editingItem
              : item,
          ),
        )

        // También recargar desde la API para asegurar sincronización
        await loadMenuItems()
        console.log("🔄 [MenuManagement] Menú recargado después de actualizar. Elementos actuales:", menuItems)

        setEditingItem(null)

        toast({
          title: "Éxito",
          description: "Elemento actualizado correctamente",
        })
      } else {
        console.error("❌ [MenuManagement] Error al actualizar ítem en la API:", result.error)
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("💥 [MenuManagement] Error en handleUpdateItem:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el elemento",
        variant: "destructive",
      })
    }
  }

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este elemento?")) return

    console.log("🗑️ [MenuManagement] Intentando eliminar ítem con ID:", itemId)
    try {
      const result = await ApiClient.deleteMenuItem(itemId)

      if (result.success) {
        console.log("✅ [MenuManagement] Ítem eliminado exitosamente de la API. Recargando menú...")

        // Eliminar el ítem del estado local inmediatamente para reflejar el cambio
        setMenuItems((prevItems) => prevItems.filter((item) => item.id !== itemId))

        // También recargar desde la API para asegurar sincronización
        await loadMenuItems()
        console.log("🔄 [MenuManagement] Menú recargado después de eliminar. Elementos actuales:", menuItems)

        toast({
          title: "Éxito",
          description: "Elemento eliminado correctamente",
        })
      } else {
        console.error("❌ [MenuManagement] Error al eliminar ítem de la API:", result.error)
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("💥 [MenuManagement] Error en handleDeleteItem:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el elemento",
        variant: "destructive",
      })
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("📝 [MenuManagement] Intentando agregar nueva categoría:", newCategory)

    if (!newCategory.name) {
      toast({
        title: "Error",
        description: "El nombre de la categoría es requerido",
        variant: "destructive",
      })
      console.warn("⚠️ [MenuManagement] Validación fallida: Nombre de categoría no válido.")
      return
    }

    try {
      const result = await ApiClient.addMenuCategory({
        restaurant_id: restaurantId,
        ...newCategory,
      })

      if (result.success) {
        console.log("✅ [MenuManagement] Categoría agregada exitosamente a la API. Recargando categorías...")
        await loadCategories()
        setShowAddCategory(false)
        setNewCategory({
          name: "",
          description: "",
          type: "food",
          sort_order: 0,
        })

        toast({
          title: "Éxito",
          description: "Categoría agregada correctamente",
        })
      } else {
        console.error("❌ [MenuManagement] Error al agregar categoría a la API:", result.error)
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("💥 [MenuManagement] Error en handleAddCategory:", error)
      toast({
        title: "Error",
        description: "No se pudo agregar la categoría",
        variant: "destructive",
      })
    }
  }

  const filteredItems = menuItems.filter((item) => (activeTab === "categories" ? true : item.type === activeTab))
  console.log("🔍 [MenuManagement] Elementos del menú (estado actual):", menuItems)
  console.log("🔍 [MenuManagement] Pestaña activa:", activeTab, "Elementos filtrados:", filteredItems)

  const filteredCategories = categories.filter((category) =>
    activeTab === "categories" ? true : category.type === activeTab || category.type === "both",
  )
  console.log("🔍 [MenuManagement] Categorías (estado actual):", categories)
  console.log("🔍 [MenuManagement] Pestaña activa:", activeTab, "Categorías filtradas:", filteredCategories)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        <span className="ml-2">Cargando menú...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("food")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "food"
                ? "border-red-500 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <ChefHat className="w-4 h-4 inline mr-2" />
            Platos ({menuItems.filter((item) => item.type === "food").length})
          </button>
          <button
            onClick={() => setActiveTab("drink")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "drink"
                ? "border-red-500 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Coffee className="w-4 h-4 inline mr-2" />
            Bebidas ({menuItems.filter((item) => item.type === "drink").length})
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "categories"
                ? "border-red-500 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Tag className="w-4 h-4 inline mr-2" />
            Categorías ({categories.length})
          </button>
        </nav>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          {activeTab === "food" && "Gestión de Platos"}
          {activeTab === "drink" && "Gestión de Bebidas"}
          {activeTab === "categories" && "Gestión de Categorías"}
        </h3>

        <div className="space-x-2">
          {activeTab !== "categories" && (
            <button
              onClick={() => {
                setNewItem({ ...newItem, type: activeTab })
                setShowAddItem(true)
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar {activeTab === "food" ? "Plato" : "Bebida"}
            </button>
          )}

          {activeTab === "categories" && (
            <button
              onClick={() => setShowAddCategory(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Categoría
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === "categories" ? (
        // Categories List
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => (
            <div key={category.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900">{category.name}</h4>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    category.type === "food"
                      ? "bg-orange-100 text-orange-800"
                      : category.type === "drink"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {category.type === "food" ? "Comida" : category.type === "drink" ? "Bebida" : "Ambos"}
                </span>
              </div>
              {category.description && <p className="text-sm text-gray-600 mb-3">{category.description}</p>}
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Orden: {category.sort_order}</span>
                <span>{category.is_active ? "Activa" : "Inactiva"}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Menu Items List
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {item.image_url && (
                <div className="h-32 bg-gray-200">
                  <img
                    src={item.image_url || "/placeholder.svg"}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900">{item.name}</h4>
                  <div className="flex items-center space-x-1">
                    {item.is_available ? (
                      <Eye className="w-4 h-4 text-green-500" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                    {item.is_featured && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Destacado</span>
                    )}
                  </div>
                </div>

                {item.description && <p className="text-sm text-gray-600 mb-2">{item.description}</p>}

                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-bold text-red-600">${item.price.toFixed(2)}</span>
                  {item.category_name && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{item.category_name}</span>
                  )}
                </div>

                {/* Dietary indicators */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.dietary.is_vegetarian && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">🌱 Vegetariano</span>
                  )}
                  {item.dietary.is_vegan && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">🌿 Vegano</span>
                  )}
                  {item.dietary.is_gluten_free && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Sin Gluten</span>
                  )}
                  {item.dietary.is_spicy && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">🌶️ Picante</span>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded text-sm flex items-center justify-center"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="bg-red-100 hover:bg-red-200 text-red-700 py-2 px-3 rounded text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">Agregar {newItem.type === "food" ? "Plato" : "Bebida"}</h3>
              <button onClick={() => setShowAddItem(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: Number.parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
              </div>

              {/* Add Image Upload for new item */}
              <div>
                <ImageUpload
                  currentImage={newItem.image_url}
                  onImageChange={(url) => setNewItem({ ...newItem, image_url: url || "" })}
                  label="Imagen del Plato/Bebida"
                  aspectRatio="wide"
                  placeholder="Imagen del plato o bebida"
                  restaurantId={restaurantId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  value={newItem.category_id || ""}
                  onChange={(e) =>
                    setNewItem({ ...newItem, category_id: e.target.value ? Number.parseInt(e.target.value) : null })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Sin categoría</option>
                  {filteredCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newItem.is_available}
                    onChange={(e) => setNewItem({ ...newItem, is_available: e.target.checked })}
                    className="mr-2"
                  />
                  Disponible
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newItem.is_featured}
                    onChange={(e) => setNewItem({ ...newItem, is_featured: e.target.checked })}
                    className="mr-2"
                  />
                  Destacado
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newItem.dietary.is_vegetarian}
                    onChange={(e) =>
                      setNewItem({ ...newItem, dietary: { ...newItem.dietary, is_vegetarian: e.target.checked } })
                    }
                    className="mr-2"
                  />
                  Vegetariano
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newItem.dietary.is_vegan}
                    onChange={(e) =>
                      setNewItem({ ...newItem, dietary: { ...newItem.dietary, is_vegan: e.target.checked } })
                    }
                    className="mr-2"
                  />
                  Vegano
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newItem.dietary.is_gluten_free}
                    onChange={(e) =>
                      setNewItem({ ...newItem, dietary: { ...newItem.dietary, is_gluten_free: e.target.checked } })
                    }
                    className="mr-2"
                  />
                  Sin Gluten
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newItem.dietary.is_lactose_free}
                    onChange={(e) =>
                      setNewItem({ ...newItem, dietary: { ...newItem.dietary, is_lactose_free: e.target.checked } })
                    }
                    className="mr-2"
                  />
                  Sin Lactosa
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newItem.dietary.is_spicy}
                    onChange={(e) =>
                      setNewItem({ ...newItem, dietary: { ...newItem.dietary, is_spicy: e.target.checked } })
                    }
                    className="mr-2"
                  />
                  Picante
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddItem(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">Agregar Categoría</h3>
              <button onClick={() => setShowAddCategory(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={newCategory.type}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, type: e.target.value as "food" | "drink" | "both" })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="food">Solo Comida</option>
                  <option value="drink">Solo Bebidas</option>
                  <option value="both">Ambos</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">Editar {editingItem.type === "food" ? "Plato" : "Bebida"}</h3>
              <button onClick={() => setEditingItem(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: Number.parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
              </div>

              {/* Add Image Upload for editing item */}
              <div>
                <ImageUpload
                  currentImage={editingItem.image_url}
                  onImageChange={(url) => setEditingItem({ ...editingItem, image_url: url || "" })}
                  label="Imagen del Plato/Bebida"
                  aspectRatio="wide"
                  placeholder="Imagen del plato o bebida"
                  restaurantId={restaurantId}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingItem.is_available}
                    onChange={(e) => setEditingItem({ ...editingItem, is_available: e.target.checked })}
                    className="mr-2"
                  />
                  Disponible
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingItem.is_featured}
                    onChange={(e) => setEditingItem({ ...editingItem, is_featured: e.target.checked })}
                    className="mr-2"
                  />
                  Destacado
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingItem.dietary.is_vegetarian}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        dietary: { ...editingItem.dietary, is_vegetarian: e.target.checked },
                      })
                    }
                    className="mr-2"
                  />
                  Vegetariano
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingItem.dietary.is_vegan}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        dietary: { ...editingItem.dietary, is_vegan: e.target.checked },
                      })
                    }
                    className="mr-2"
                  />
                  Vegano
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
