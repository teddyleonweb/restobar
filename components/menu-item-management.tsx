"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Utensils,
  Coffee,
  Tag,
  Percent,
  AlertCircle,
  CheckCircle,
  CircleDot,
  Vegan,
  Leaf,
  WheatOff,
  MilkOff,
  Flame,
  Star,
} from "lucide-react"
import { ApiClient, type MenuItem, type MenuCategory } from "@/lib/api-client" // Corrected import path
import { toast } from "@/hooks/use-toast"
import ImageUpload from "@/components/image-upload"

interface MenuItemManagementProps {
  restaurantId: number
  onClose: () => void
}

export default function MenuItemManagement({ restaurantId, onClose }: MenuItemManagementProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddEditItemModal, setShowAddEditItemModal] = useState(false)
  const [currentEditingItem, setCurrentEditingItem] = useState<MenuItem | null>(null)
  const [itemForm, setItemForm] = useState<Partial<MenuItem>>({
    type: "food",
    is_available: true,
    is_featured: false,
    is_vegetarian: false,
    is_vegan: false,
    is_gluten_free: false,
    is_lactose_free: false,
    is_spicy: false,
  })

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [newCategoryForm, setNewCategoryForm] = useState<Partial<MenuCategory>>({
    type: "food",
  })

  const fetchMenuItemsAndCategories = useCallback(async () => {
    console.log("DEBUG: ENTERING fetchMenuItemsAndCategories function.") // NUEVO LOG
    setIsLoading(true)
    setError(null)
    try {
      console.log("DEBUG: Attempting to fetch menu items and categories for restaurant ID:", restaurantId)
      const itemsResult = await ApiClient.getMenuItems(restaurantId)
      const categoriesResult = await ApiClient.getMenuCategories(restaurantId)

      if (itemsResult.success && categoriesResult.success) {
        console.log("DEBUG: Raw menu items from API (after fetch):", itemsResult.data?.menu_items)
        console.log("DEBUG: Raw menu categories from API (after fetch):", categoriesResult.data?.categories)

        setMenuItems(itemsResult.data?.menu_items || [])
        setMenuCategories(categoriesResult.data?.categories || [])

        console.log("DEBUG: Menu items state after setMenuItems:", itemsResult.data?.menu_items || [])
        console.log("DEBUG: Menu categories state after setMenuCategories:", categoriesResult.data?.categories || [])
      } else {
        setError(itemsResult.error || categoriesResult.error || "Error al cargar ítems y categorías del menú.")
        console.error("DEBUG: API response error during fetch:", itemsResult.error || categoriesResult.error)
      }
    } catch (err) {
      console.error("DEBUG: Error fetching menu data (catch block):", err)
      setError("Error de conexión al cargar los datos del menú.")
    } finally {
      setIsLoading(false)
      console.log("DEBUG: Exiting fetchMenuItemsAndCategories function. IsLoading set to false.") // NUEVO LOG
    }
  }, [restaurantId])

  useEffect(() => {
    if (restaurantId) {
      console.log("DEBUG: useEffect triggered for restaurantId:", restaurantId) // NUEVO LOG
      fetchMenuItemsAndCategories()
    }
  }, [restaurantId, fetchMenuItemsAndCategories])

  // --- Item Management ---
  const handleAddItemClick = () => {
    console.log("DEBUG: handleAddItemClick called. Setting showAddEditItemModal to true.")
    setCurrentEditingItem(null)
    setItemForm({
      type: "food",
      is_available: true,
      is_featured: false,
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: false,
      is_lactose_free: false,
      is_spicy: false,
      price: 0,
      name: "",
      description: "",
      image_url: "",
      category_id: null,
      calories: null,
      preparation_time: null,
      ingredients: "",
      allergens: "",
      sort_order: null,
      discount_percentage: null,
      discount_start_date: null,
      discount_end_date: null,
    })
    setShowAddEditItemModal(true)
  }

  const handleEditItemClick = (item: MenuItem) => {
    console.log("DEBUG: handleEditItemClick called. Setting showAddEditItemModal to true for item:", item.id)
    setCurrentEditingItem(item)
    setItemForm({
      ...item,
      // Ensure dates are in YYYY-MM-DD format for input type="date"
      discount_start_date: item.discount_start_date ? item.discount_start_date.split("T")[0] : null,
      discount_end_date: item.discount_end_date ? item.discount_end_date.split("T")[0] : null,
    })
    setShowAddEditItemModal(true)
  }

  const handleItemFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === "checkbox") {
      setItemForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else if (
      name === "price" ||
      name === "calories" ||
      name === "preparation_time" ||
      name === "discount_percentage" ||
      name === "category_id" ||
      name === "sort_order"
    ) {
      setItemForm((prev) => ({ ...prev, [name]: value === "" ? null : Number(value) }))
    } else {
      setItemForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleItemImageChange = (url: string) => {
    setItemForm((prev) => ({ ...prev, image_url: url }))
  }

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!itemForm.name || itemForm.price === undefined || itemForm.price === null || itemForm.type === undefined) {
      setError("Nombre, precio y tipo son campos requeridos.")
      return
    }

    if (
      itemForm.discount_percentage !== null &&
      (itemForm.discount_percentage < 0 || itemForm.discount_percentage > 100)
    ) {
      setError("El porcentaje de descuento debe estar entre 0 y 100.")
      return
    }

    if (itemForm.discount_start_date && itemForm.discount_end_date) {
      const startDate = new Date(itemForm.discount_start_date)
      const endDate = new Date(itemForm.discount_end_date)
      if (endDate < startDate) {
        setError("La fecha de fin de descuento no puede ser anterior a la fecha de inicio.")
        return
      }
    } else if (
      (itemForm.discount_start_date && !itemForm.discount_end_date) ||
      (!itemForm.discount_start_date && itemForm.discount_end_date)
    ) {
      setError("Si especificas una fecha de inicio o fin de descuento, debes especificar ambas.")
      return
    }

    setIsLoading(true)
    try {
      let result
      const itemDataToSend = {
        ...itemForm,
        restaurant_id: restaurantId,
        // Ensure nulls for empty strings or 0 for numbers if API expects it
        description: itemForm.description || null,
        image_url: itemForm.image_url || null,
        category_id: itemForm.category_id || null,
        calories: itemForm.calories || null,
        preparation_time: itemForm.preparation_time || null,
        ingredients: itemForm.ingredients || null,
        allergens: itemForm.allergens || null,
        sort_order: itemForm.sort_order || 0,
        discount_percentage: itemForm.discount_percentage || null,
        discount_start_date: itemForm.discount_start_date || null,
        discount_end_date: itemForm.discount_end_date || null,
      } as MenuItem // Cast to MenuItem to satisfy type checking

      console.log("DEBUG: Sending item data:", itemDataToSend)

      if (currentEditingItem) {
        // It's an update
        result = await ApiClient.updateMenuItem({ id: currentEditingItem.id, ...itemDataToSend })
        console.log("DEBUG: Update API call result:", result)
        if (result.success) {
          toast({
            title: "Ítem actualizado",
            description: result.message,
          })
          // Optimistic update: update the item in the local state
          setMenuItems((prevItems) =>
            prevItems.map((item) => (item.id === currentEditingItem.id ? { ...item, ...itemDataToSend } : item)),
          )
          setShowAddEditItemModal(false)
        } else {
          setError(result.error || "Error al actualizar el ítem del menú.")
          console.error("DEBUG: API response error during update:", result.error)
        }
      } else {
        // It's an add
        result = await ApiClient.addMenuItem(itemDataToSend)
        console.log("DEBUG: Add API call result:", result)
        if (result.success) {
          toast({
            title: "Ítem agregado",
            description: result.message,
          })
          setShowAddEditItemModal(false)
          // For new items, we still need to re-fetch to get the database-assigned ID
          console.log("DEBUG: Calling fetchMenuItemsAndCategories after successful add to get new ID.")
          fetchMenuItemsAndCategories()
        } else {
          setError(result.error || "Error al agregar el ítem del menú.")
          console.error("DEBUG: API response error during add:", result.error)
        }
      }
    } catch (err) {
      console.error("DEBUG: Error saving menu item (catch block):", err)
      setError(err instanceof Error ? err.message : "Error de conexión al guardar el ítem.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este ítem del menú? Esta acción no se puede deshacer.")) {
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await ApiClient.deleteMenuItem(Number(itemId))
      console.log("DEBUG: Delete API call result:", result)
      if (result.success) {
        toast({
          title: "Ítem eliminado",
          description: result.message,
        })
        // Re-fetch items after successful deletion to ensure UI is in sync
        console.log("DEBUG: Calling fetchMenuItemsAndCategories after successful delete.")
        fetchMenuItemsAndCategories() // <-- This line was added/modified
      } else {
        setError(result.error || "Error al eliminar el ítem del menú.")
        console.error("DEBUG: API response error during delete:", result.error)
      }
    } catch (err) {
      console.error("DEBUG: Error deleting menu item (catch block):", err)
      setError("Error de conexión al eliminar el ítem.")
    } finally {
      setIsLoading(false)
    }
  }

  // --- Category Management ---
  const handleAddCategoryClick = () => {
    console.log("DEBUG: handleAddCategoryClick called. Setting showAddCategoryModal to true.")
    setNewCategoryForm({ name: "", description: "", type: "food", sort_order: 0 })
    setShowAddCategoryModal(true)
  }

  const handleNewCategoryFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setNewCategoryForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!newCategoryForm.name || !newCategoryForm.type) {
      setError("Nombre y tipo de categoría son requeridos.")
      return
    }

    setIsLoading(true)
    try {
      const result = await ApiClient.addMenuCategory({
        restaurant_id: restaurantId,
        name: newCategoryForm.name,
        description: newCategoryForm.description || undefined,
        type: newCategoryForm.type as "food" | "drink" | "both",
        sort_order: newCategoryForm.sort_order || undefined,
      })
      console.log("DEBUG: Add Category API call result:", result)

      if (result.success && result.data?.category) {
        toast({
          title: "Categoría agregada",
          description: result.message,
        })
        setShowAddCategoryModal(false)
        // Actualización optimista del estado local
        setMenuCategories((prev) => [...prev, result.data.category])
      } else {
        setError(result.error || "Error al agregar la categoría.")
      }
    } catch (err) {
      console.error("DEBUG: Error saving category (catch block):", err)
      setError("Error de conexión al guardar la categoría.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCategory = async (categoryId: number) => {
    if (
      !confirm("¿Estás seguro de que quieres eliminar esta categoría? Esto también afectará a los ítems asociados.")
    ) {
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await ApiClient.deleteMenuCategory(Number(categoryId))
      console.log("DEBUG: Delete Category API call result:", result)
      if (result.success) {
        toast({
          title: "Categoría eliminada",
          description: result.message,
        })
        // Actualización optimista del estado local
        setMenuCategories((prev) => prev.filter((cat) => cat.id !== categoryId))
        // También actualizar items que podrían estar en esa categoría
        setMenuItems((prevItems) =>
          prevItems.map((item) => (item.category_id === categoryId ? { ...item, category_id: null } : item)),
        )
      } else {
        setError(result.error || "Error al eliminar la categoría.")
      }
    } catch (err) {
      console.error("DEBUG: Error deleting category (catch block):", err)
      setError("Error de conexión al eliminar la categoría.")
    } finally {
      setIsLoading(false)
    }
  }

  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return "Sin categoría"
    const category = menuCategories.find((cat) => cat.id === Number(categoryId))
    return category ? category.name : "Categoría desconocida"
  }

  const getCategoryOptions = (itemType: "food" | "drink") => {
    return menuCategories.filter((cat) => cat.type === itemType || cat.type === "both")
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Gestionar Ítems de Menú</h3>
            <p className="text-sm text-gray-600">Añade, edita y organiza los platos y bebidas de tu restaurante.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6 flex-grow overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p>Cargando ítems del menú...</p>
            </div>
          ) : error ? (
            <div className="bg-red-100 text-red-700 border border-red-300 p-4 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Categories Column */}
              <div className="lg:col-span-1 bg-gray-50 p-4 rounded-lg border">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-gray-900">Categorías ({menuCategories.length})</h4>
                  <button
                    onClick={handleAddCategoryClick}
                    className="flex items-center text-red-500 hover:text-red-600 text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Nueva
                  </button>
                </div>
                {menuCategories.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay categorías. Añade una para organizar tus ítems.</p>
                ) : (
                  <ul className="space-y-2">
                    {menuCategories.map((category) => (
                      <li
                        key={category.id}
                        className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm border"
                      >
                        <div className="flex items-center space-x-2">
                          {category.type === "food" && <Utensils className="w-4 h-4 text-gray-600" />}
                          {category.type === "drink" && <Coffee className="w-4 h-4 text-gray-600" />}
                          {category.type === "both" && <Tag className="w-4 h-4 text-gray-600" />}
                          <span className="font-medium text-gray-800">{category.name}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full"
                          title="Eliminar categoría"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Menu Items Column */}
              <div className="lg:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-gray-900">Ítems del Menú ({menuItems.length})</h4>
                  <button
                    onClick={handleAddItemClick}
                    className="flex items-center bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Ítem
                  </button>
                </div>

                {menuItems.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Utensils className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay ítems en el menú</h3>
                    <p className="text-gray-600 mb-4">Agrega tu primer plato o bebida.</p>
                    <button
                      onClick={handleAddItemClick}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Agregar Ítem
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {menuItems.map((item) => (
                      <div key={item.id} className="bg-white rounded-lg shadow-sm border overflow-hidden flex">
                        {item.image_url && (
                          <div className="relative w-24 h-24 flex-shrink-0">
                            <Image
                              src={item.image_url || "/placeholder.svg"}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="96px"
                            />
                          </div>
                        )}
                        <div className="p-3 flex-grow">
                          <h5 className="font-semibold text-gray-900 text-base truncate">{item.name}</h5>
                          <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-lg text-red-500">€{item.price?.toFixed(2)}</span>
                            <div className="flex space-x-1">
                              {item.is_available ? (
                                <span className="text-green-500" title="Disponible">
                                  <CheckCircle className="w-4 h-4" />
                                </span>
                              ) : (
                                <span className="text-gray-400" title="No disponible">
                                  <CircleDot className="w-4 h-4" />
                                </span>
                              )}
                              {item.is_featured && (
                                <span className="text-yellow-500" title="Destacado">
                                  <Star className="w-4 h-4" />
                                </span>
                              )}
                            </div>
                          </div>
                          {item.discount_percentage && (
                            <div className="text-xs text-green-600 mt-1 flex items-center">
                              <Percent className="w-3 h-3 mr-1" />
                              <span>{item.discount_percentage}% OFF</span>
                              {item.discount_end_date && (
                                <span className="ml-1">
                                  hasta {new Date(item.discount_end_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {getCategoryName(item.category_id)} • {item.type === "food" ? "Plato" : "Bebida"}
                          </div>
                          <div className="flex space-x-2 mt-2">
                            <button
                              onClick={() => handleEditItemClick(item)}
                              className="text-blue-500 hover:text-blue-700 p-1 rounded-full"
                              title="Editar ítem"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded-full"
                              title="Eliminar ítem"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add/Edit Item Modal */}
        {showAddEditItemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-bold text-gray-900">
                  {currentEditingItem ? "Editar Ítem del Menú" : "Agregar Nuevo Ítem al Menú"}
                </h3>
                <button
                  onClick={() => {
                    console.log("DEBUG: Closing Add/Edit Item Modal.")
                    setShowAddEditItemModal(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="flex-grow overflow-y-auto p-6 space-y-6">
                {error && (
                  <div className="bg-red-100 text-red-700 border border-red-300 p-3 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Información Básica</h4>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={itemForm.name || ""}
                      onChange={handleItemFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={itemForm.description || ""}
                      onChange={handleItemFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                        Precio (€) *
                      </label>
                      <input
                        type="number"
                        id="price"
                        name="price"
                        value={itemForm.price ?? ""}
                        onChange={handleItemFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo *
                      </label>
                      <select
                        id="type"
                        name="type"
                        value={itemForm.type || ""}
                        onChange={handleItemFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        required
                      >
                        <option value="food">Plato</option>
                        <option value="drink">Bebida</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Categoría
                    </label>
                    <select
                      id="category_id"
                      name="category_id"
                      value={itemForm.category_id || ""}
                      onChange={handleItemFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    >
                      <option value="">Seleccionar categoría</option>
                      {getCategoryOptions(itemForm.type || "food").map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        name="is_available"
                        checked={itemForm.is_available || false}
                        onChange={handleItemFormChange}
                        className="h-4 w-4 text-red-500 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="ml-2">Disponible</span>
                    </label>
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        name="is_featured"
                        checked={itemForm.is_featured || false}
                        onChange={handleItemFormChange}
                        className="h-4 w-4 text-red-500 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="ml-2">Destacado</span>
                    </label>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Imagen del Ítem</h4>
                  <ImageUpload
                    currentImage={itemForm.image_url || ""}
                    onImageChange={handleItemImageChange}
                    label="Subir Imagen del Plato/Bebida"
                    aspectRatio="square"
                    restaurantId={restaurantId}
                    placeholder="Imagen cuadrada recomendada"
                  />
                </div>

                {/* Dietary Info */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Opciones Dietéticas</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        name="is_vegetarian"
                        checked={itemForm.is_vegetarian || false}
                        onChange={handleItemFormChange}
                        className="h-4 w-4 text-green-500 border-gray-300 rounded focus:ring-green-500"
                      />
                      <Leaf className="w-4 h-4 ml-2 mr-1 text-green-600" />
                      <span className="ml-1">Vegetariano</span>
                    </label>
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        name="is_vegan"
                        checked={itemForm.is_vegan || false}
                        onChange={handleItemFormChange}
                        className="h-4 w-4 text-green-500 border-gray-300 rounded focus:ring-green-500"
                      />
                      <Vegan className="w-4 h-4 ml-2 mr-1 text-green-600" />
                      <span className="ml-1">Vegano</span>
                    </label>
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        name="is_gluten_free"
                        checked={itemForm.is_gluten_free || false}
                        onChange={handleItemFormChange}
                        className="h-4 w-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <WheatOff className="w-4 h-4 ml-2 mr-1 text-blue-600" />
                      <span className="ml-1">Sin Gluten</span>
                    </label>
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        name="is_lactose_free"
                        checked={itemForm.is_lactose_free || false}
                        onChange={handleItemFormChange}
                        className="h-4 w-4 text-purple-500 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <MilkOff className="w-4 h-4 ml-2 mr-1 text-purple-600" />
                      <span className="ml-1">Sin Lactosa</span>
                    </label>
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        name="is_spicy"
                        checked={itemForm.is_spicy || false}
                        onChange={handleItemFormChange}
                        className="h-4 w-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <Flame className="w-4 h-4 ml-2 mr-1 text-orange-600" />
                      <span className="ml-1">Picante</span>
                    </label>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Detalles Adicionales</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="calories" className="block text-sm font-medium text-gray-700 mb-1">
                        Calorías (kcal)
                      </label>
                      <input
                        type="number"
                        id="calories"
                        name="calories"
                        value={itemForm.calories ?? ""}
                        onChange={handleItemFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        min="0"
                      />
                    </div>
                    <div>
                      <label htmlFor="preparation_time" className="block text-sm font-medium text-gray-700 mb-1">
                        Tiempo de Prep. (min)
                      </label>
                      <input
                        type="number"
                        id="preparation_time"
                        name="preparation_time"
                        value={itemForm.preparation_time ?? ""}
                        onChange={handleItemFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="ingredients" className="block text-sm font-medium text-gray-700 mb-1">
                      Ingredientes
                    </label>
                    <textarea
                      id="ingredients"
                      name="ingredients"
                      value={itemForm.ingredients || ""}
                      onChange={handleItemFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label htmlFor="allergens" className="block text-sm font-medium text-gray-700 mb-1">
                      Alérgenos
                    </label>
                    <textarea
                      id="allergens"
                      name="allergens"
                      value={itemForm.allergens || ""}
                      onChange={handleItemFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label htmlFor="sort_order" className="block text-sm font-medium text-gray-700 mb-1">
                      Orden de visualización
                    </label>
                    <input
                      type="number"
                      id="sort_order"
                      name="sort_order"
                      value={itemForm.sort_order ?? ""}
                      onChange={handleItemFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      min="0"
                    />
                  </div>
                </div>

                {/* Discount Details */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Detalles de Descuento</h4>
                  <div>
                    <label htmlFor="discount_percentage" className="block text-sm font-medium text-gray-700 mb-1">
                      Porcentaje de Descuento (%)
                    </label>
                    <input
                      type="number"
                      id="discount_percentage"
                      name="discount_percentage"
                      value={itemForm.discount_percentage ?? ""}
                      onChange={handleItemFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="discount_start_date" className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Inicio
                      </label>
                      <input
                        type="date"
                        id="discount_start_date"
                        name="discount_start_date"
                        value={itemForm.discount_start_date || ""}
                        onChange={handleItemFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="discount_end_date" className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Fin
                      </label>
                      <input
                        type="date"
                        id="discount_end_date"
                        name="discount_end_date"
                        value={itemForm.discount_end_date || ""}
                        onChange={handleItemFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </form>

              <div className="flex space-x-3 p-4 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => {
                    console.log("DEBUG: Cancelling Add/Edit Item Modal.")
                    setShowAddEditItemModal(false)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  onClick={handleSaveItem}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
                  disabled={isLoading}
                >
                  {isLoading ? "Guardando..." : currentEditingItem ? "Actualizar Ítem" : "Agregar Ítem"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Category Modal */}
        {showAddCategoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-bold text-gray-900">Agregar Nueva Categoría</h3>
                <button
                  onClick={() => {
                    console.log("DEBUG: Closing Add Category Modal.")
                    setShowAddCategoryModal(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-100 text-red-700 border border-red-300 p-3 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                )}
                <div>
                  <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Categoría *
                  </label>
                  <input
                    type="text"
                    id="categoryName"
                    name="name"
                    value={newCategoryForm.name || ""}
                    onChange={handleNewCategoryFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="categoryDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    id="categoryDescription"
                    name="description"
                    value={newCategoryForm.description || ""}
                    onChange={handleNewCategoryFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    rows={2}
                  />
                </div>
                <div>
                  <label htmlFor="categoryType" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    id="categoryType"
                    name="type"
                    value={newCategoryForm.type || ""}
                    onChange={handleNewCategoryFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    required
                  >
                    <option value="food">Platos</option>
                    <option value="drink">Bebidas</option>
                    <option value="both">Ambos</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="categorySortOrder" className="block text-sm font-medium text-gray-700 mb-1">
                    Orden de visualización
                  </label>
                  <input
                    type="number"
                    id="categorySortOrder"
                    name="sort_order"
                    value={newCategoryForm.sort_order ?? ""}
                    onChange={handleNewCategoryFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    min="0"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      console.log("DEBUG: Cancelling Add Category Modal.")
                      setShowAddCategoryModal(false)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                    disabled={isLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? "Guardando..." : "Agregar Categoría"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
