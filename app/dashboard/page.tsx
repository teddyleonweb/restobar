"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { LogOut, Plus, MapPin, Phone, Mail, Calendar, Store, User, Settings, X } from "lucide-react"
import ImageUpload from "@/components/image-upload"
import RestaurantImageGallery from "@/components/restaurant-image-gallery"

// Add this import at the top of the file
import { toast } from "@/hooks/use-toast"
import { getApiUrl } from "@/lib/api-config"

interface UserType {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string
  status: string
  email_verified: boolean
}

interface Restaurant {
  id: number
  name: string
  slug: string
  description?: string
  address: string
  city: string
  phone?: string
  email?: string
  status: string
  trial_start_date: string
  trial_end_date: string
  created_at: string
  logo_url?: string
  cover_image_url?: string
  images?: RestaurantImage[]
}

interface RestaurantImage {
  id: string
  url: string
  title: string
  description?: string
  isPrimary?: boolean
  createdAt: string
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState({ type: "", text: "" })
  const [showAddRestaurant, setShowAddRestaurant] = useState(false)
  const [newRestaurant, setNewRestaurant] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    phone: "",
    email: "",
  })

  const [showEditRestaurant, setShowEditRestaurant] = useState(false)
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null)

  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [showImageGallery, setShowImageGallery] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null)

  useEffect(() => {
    // Verificar si el usuario está autenticado
    const userData = localStorage.getItem("tubarresto_user")
    const token = localStorage.getItem("tubarresto_token")
    const restaurantsData = localStorage.getItem("tubarresto_restaurants")

    if (!userData || !token) {
      router.push("/login")
      return
    }

    setUser(JSON.parse(userData))
    if (restaurantsData) {
      setRestaurants(JSON.parse(restaurantsData))
    }
    setIsLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("tubarresto_user")
    localStorage.removeItem("tubarresto_token")
    localStorage.removeItem("tubarresto_restaurants")
    router.push("/")
  }

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newRestaurant.name || !newRestaurant.address || !newRestaurant.city) {
      setMessage({ type: "error", text: "Nombre, dirección y ciudad son requeridos" })
      return
    }

    const token = localStorage.getItem("tubarresto_token")

    try {
      // Replace this line:
      // const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://tubarresto.somediave.com"

      // const response = await fetch(`${apiUrl}/api.php?action=add-restaurant`, {
      const response = await fetch(getApiUrl("ADD_RESTAURANT"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newRestaurant),
      })

      const result = await response.json()

      if (result.success) {
        setRestaurants([result.data.restaurant, ...restaurants])
        setNewRestaurant({
          name: "",
          description: "",
          address: "",
          city: "",
          phone: "",
          email: "",
        })
        setShowAddRestaurant(false)
        setMessage({ type: "success", text: "Restaurante agregado exitosamente" })
      } else {
        setMessage({ type: "error", text: result.error || "Error al agregar restaurante" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" })
    }
  }

  const handleEditRestaurant = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingRestaurant || !editingRestaurant.name || !editingRestaurant.address || !editingRestaurant.city) {
      setMessage({ type: "error", text: "Nombre, dirección y ciudad son requeridos" })
      return
    }

    const token = localStorage.getItem("tubarresto_token")

    // Debug: Log the data being sent
    console.log("Updating restaurant with data:", {
      id: editingRestaurant.id,
      name: editingRestaurant.name,
      logo_url: editingRestaurant.logo_url,
      cover_image_url: editingRestaurant.cover_image_url,
    })

    try {
      // Replace this line:
      // const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://tubarresto.somediave.com"

      // const response = await fetch(`${apiUrl}/api.php?action=update-restaurant`, {
      const response = await fetch(getApiUrl("UPDATE_RESTAURANT"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingRestaurant.id,
          name: editingRestaurant.name,
          description: editingRestaurant.description,
          address: editingRestaurant.address,
          city: editingRestaurant.city,
          phone: editingRestaurant.phone,
          email: editingRestaurant.email,
          logo_url: editingRestaurant.logo_url,
          cover_image_url: editingRestaurant.cover_image_url,
        }),
      })

      const result = await response.json()
      console.log("Update restaurant result:", result)

      if (result.success) {
        // Actualizar la lista de restaurantes
        const updatedRestaurants = restaurants.map((r) => (r.id === editingRestaurant.id ? result.data.restaurant : r))
        setRestaurants(updatedRestaurants)
        localStorage.setItem("tubarresto_restaurants", JSON.stringify(updatedRestaurants))

        toast({
          title: "Restaurante actualizado",
          description: "La información del restaurante se ha actualizado correctamente.",
        })

        setShowEditRestaurant(false)
        setEditingRestaurant(null)
        setMessage({ type: "success", text: "Restaurante actualizado exitosamente" })
      } else {
        console.error("Update error:", result.error)
        toast({
          title: "Error",
          description: result.error || "No se pudo actualizar el restaurante.",
          variant: "destructive",
        })
        setMessage({ type: "error", text: result.error || "Error al actualizar restaurante" })
      }
    } catch (error) {
      console.error("Network error:", error)
      setMessage({ type: "error", text: "Error de conexión" })
    }
  }

  const handleDeleteRestaurant = async () => {
    if (!restaurantToDelete) return

    const token = localStorage.getItem("tubarresto_token")

    try {
      // Replace this line:
      // const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://tubarresto.somediave.com"

      // const response = await fetch(`${apiUrl}/api.php?action=delete-restaurant`, {
      const response = await fetch(getApiUrl("DELETE_RESTAURANT"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: restaurantToDelete.id,
        }),
      })

      console.log("Delete response status:", response.status)
      console.log("Delete response headers:", response.headers)

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Get response text first to debug
      const responseText = await response.text()
      console.log("Delete response text:", responseText)

      // Try to parse as JSON
      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error("JSON parse error:", parseError)
        console.error("Response text:", responseText)
        throw new Error("Invalid JSON response from server")
      }

      console.log("Delete restaurant result:", result)

      if (result.success) {
        // Actualizar la lista de restaurantes
        const updatedRestaurants = restaurants.filter((r) => r.id !== restaurantToDelete.id)
        setRestaurants(updatedRestaurants)
        localStorage.setItem("tubarresto_restaurants", JSON.stringify(updatedRestaurants))

        toast({
          title: "Restaurante eliminado",
          description: "El restaurante se ha eliminado correctamente.",
        })

        setShowDeleteConfirm(false)
        setRestaurantToDelete(null)
        setMessage({ type: "success", text: "Restaurante eliminado exitosamente" })
      } else {
        console.error("Delete error:", result.error)
        toast({
          title: "Error",
          description: result.error || "No se pudo eliminar el restaurante.",
          variant: "destructive",
        })
        setMessage({ type: "error", text: result.error || "Error al eliminar restaurante" })
      }
    } catch (error) {
      console.error("Network error:", error)

      let errorMessage = "Error de conexión"
      if (error instanceof Error) {
        errorMessage = error.message
      }

      toast({
        title: "Error de conexión",
        description: errorMessage,
        variant: "destructive",
      })
      setMessage({ type: "error", text: errorMessage })
    }
  }

  const openDeleteConfirm = (restaurant: Restaurant) => {
    setRestaurantToDelete(restaurant)
    setShowDeleteConfirm(true)
  }

  const openEditModal = (restaurant: Restaurant) => {
    console.log("Opening edit modal for restaurant:", restaurant)
    setEditingRestaurant({ ...restaurant })
    setShowEditRestaurant(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleRestaurantImagesChange = (images: RestaurantImage[]) => {
    if (selectedRestaurant) {
      const updatedRestaurant = { ...selectedRestaurant, images }
      const updatedRestaurants = restaurants.map((r) => (r.id === selectedRestaurant.id ? updatedRestaurant : r))
      setRestaurants(updatedRestaurants)
      setSelectedRestaurant(updatedRestaurant)
      localStorage.setItem("tubarresto_restaurants", JSON.stringify(updatedRestaurants))
    }
  }

  const openImageGallery = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setShowImageGallery(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-lato">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Image
                src="https://tubarresto.com/wp-content/uploads/2025/05/cropped-cropped-cropped-ChatGPT-Image-9-may-2025-12_44_56-a.m-1-101x49.png"
                alt="Tu Bar Resto Logo"
                width={101}
                height={49}
                className="h-auto"
                unoptimized={true}
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-700">
                <User className="w-5 h-5 mr-2" />
                <span>
                  {user?.first_name} {user?.last_name}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-700 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-1" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Mensaje */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-red-100 text-red-700 border border-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Bienvenida */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 font-playfair">¡Hola, {user?.first_name}!</h1>
          <p className="text-gray-600">Gestiona tus restaurantes y menús desde aquí</p>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Store className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Restaurantes</p>
                <p className="text-2xl font-bold text-gray-900">{restaurants.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Estado</p>
                <p className="text-lg font-semibold text-green-600">Periodo de prueba</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Restaurantes */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 font-playfair">Mis Restaurantes</h2>
              <button
                onClick={() => setShowAddRestaurant(true)}
                className="flex items-center bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Agregar Restaurante
              </button>
            </div>
          </div>

          <div className="p-6">
            {restaurants.length === 0 ? (
              <div className="text-center py-12">
                <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes restaurantes aún</h3>
                <p className="text-gray-600 mb-4">Agrega tu primer restaurante para comenzar</p>
                <button
                  onClick={() => setShowAddRestaurant(true)}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Agregar Restaurante
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {restaurants.map((restaurant) => (
                  <div
                    key={restaurant.id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Restaurant header with logo */}
                    <div className="relative h-32 bg-gradient-to-r from-red-500 to-red-600">
                      {restaurant.cover_image_url && (
                        <Image
                          src={restaurant.cover_image_url || "/placeholder.svg"}
                          alt={`${restaurant.name} cover`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-20"></div>

                      {/* Logo */}
                      {restaurant.logo_url && (
                        <div className="absolute bottom-4 left-4 w-16 h-16 bg-white rounded-full p-1 shadow-lg">
                          <div className="relative w-full h-full">
                            <Image
                              src={restaurant.logo_url || "/placeholder.svg"}
                              alt={`${restaurant.name} logo`}
                              fill
                              className="object-cover rounded-full"
                              sizes="64px"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{restaurant.name}</h3>
                        {restaurant.description && (
                          <p className="text-gray-600 text-sm mb-3">{restaurant.description}</p>
                        )}
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span>
                            {restaurant.address}, {restaurant.city}
                          </span>
                        </div>
                        {restaurant.phone && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2" />
                            <span>{restaurant.phone}</span>
                          </div>
                        )}
                        {restaurant.email && (
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2" />
                            <span>{restaurant.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              restaurant.status === "trial"
                                ? "bg-yellow-100 text-yellow-800"
                                : restaurant.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {restaurant.status === "trial" ? "Prueba" : restaurant.status}
                          </span>
                          {restaurant.status === "trial" && (
                            <span className="text-xs text-gray-500">
                              {getDaysRemaining(restaurant.trial_end_date)} días restantes
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          <button
                            onClick={() => openEditModal(restaurant)}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors text-sm"
                          >
                            Editar Información
                          </button>
                          <button
                            onClick={() => openImageGallery(restaurant)}
                            className="w-full bg-red-100 hover:bg-red-200 text-red-700 py-2 px-4 rounded-lg transition-colors text-sm"
                          >
                            Gestionar Imágenes
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(restaurant)}
                            className="w-full bg-red-100 hover:bg-red-200 text-red-700 py-2 px-4 rounded-lg transition-colors text-sm border border-red-300"
                          >
                            Eliminar Restaurante
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal para agregar restaurante */}
        {showAddRestaurant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4 font-playfair">Agregar Nuevo Restaurante</h3>

              <form onSubmit={handleAddRestaurant} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del restaurante *</label>
                  <input
                    type="text"
                    value={newRestaurant.name}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={newRestaurant.description}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
                  <input
                    type="text"
                    value={newRestaurant.address}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
                  <input
                    type="text"
                    value={newRestaurant.city}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={newRestaurant.phone}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newRestaurant.email}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddRestaurant(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  >
                    Agregar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal para editar restaurante */}
        {showEditRestaurant && editingRestaurant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-bold text-gray-900 font-playfair">Editar Restaurante</h3>
                <button
                  onClick={() => {
                    setShowEditRestaurant(false)
                    setEditingRestaurant(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                <form onSubmit={handleEditRestaurant} className="p-6 space-y-6">
                  {/* Información básica */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Información Básica</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                        <input
                          type="text"
                          value={editingRestaurant.name}
                          onChange={(e) => setEditingRestaurant({ ...editingRestaurant, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
                        <input
                          type="text"
                          value={editingRestaurant.city}
                          onChange={(e) => setEditingRestaurant({ ...editingRestaurant, city: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
                      <input
                        type="text"
                        value={editingRestaurant.address}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                      <textarea
                        value={editingRestaurant.description || ""}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                        <input
                          type="tel"
                          value={editingRestaurant.phone || ""}
                          onChange={(e) => setEditingRestaurant({ ...editingRestaurant, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={editingRestaurant.email || ""}
                          onChange={(e) => setEditingRestaurant({ ...editingRestaurant, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Imágenes */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Imágenes</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <ImageUpload
                          currentImage={editingRestaurant.logo_url}
                          onImageChange={(url) => setEditingRestaurant({ ...editingRestaurant, logo_url: url })}
                          label="Logo del Restaurante"
                          aspectRatio="square"
                          placeholder="Logo cuadrado recomendado"
                          restaurantId={editingRestaurant.id}
                        />
                      </div>

                      <div>
                        <ImageUpload
                          currentImage={editingRestaurant.cover_image_url}
                          onImageChange={(url) => setEditingRestaurant({ ...editingRestaurant, cover_image_url: url })}
                          label="Imagen de Portada"
                          aspectRatio="wide"
                          placeholder="Imagen panorámica del restaurante"
                          restaurantId={editingRestaurant.id}
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="flex space-x-3 p-4 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditRestaurant(false)
                    setEditingRestaurant(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditRestaurant}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
                >
                  Actualizar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Gallery Modal */}
        {showImageGallery && selectedRestaurant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Imágenes de {selectedRestaurant.name}</h3>
                  <p className="text-sm text-gray-600">Gestiona el logo, fotos y otras imágenes de tu restaurante</p>
                </div>
                <button onClick={() => setShowImageGallery(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <RestaurantImageGallery
                  restaurantId={selectedRestaurant.id}
                  images={selectedRestaurant.images || []}
                  onImagesChange={handleRestaurantImagesChange}
                  canEdit={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación de eliminación */}
        {showDeleteConfirm && restaurantToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmar Eliminación</h3>

              <div className="mb-6">
                <p className="text-gray-600 mb-2">¿Estás seguro de que deseas eliminar el restaurante?</p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="font-semibold text-red-800">{restaurantToDelete.name}</p>
                  <p className="text-sm text-red-600">
                    {restaurantToDelete.address}, {restaurantToDelete.city}
                  </p>
                </div>
                <p className="text-sm text-red-600 mt-3">
                  <strong>Esta acción no se puede deshacer.</strong> Se eliminarán todos los datos asociados al
                  restaurante.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setRestaurantToDelete(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteRestaurant}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
