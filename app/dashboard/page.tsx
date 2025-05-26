"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  LogOut,
  Plus,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Store,
  User,
  Settings,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react"
import { useDataSync } from "@/hooks/useDataSync"
import { useStorageSync } from "@/hooks/useStorageSync"

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
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
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

  // Callback para manejar cambios en restaurantes
  const handleRestaurantsChange = useCallback((newData: Restaurant[], oldData: Restaurant[] | null) => {
    if (oldData && newData.length !== oldData.length) {
      const isNew = newData.length > oldData.length
      setMessage({
        type: "success",
        text: isNew ? "🆕 Nuevo restaurante agregado" : "🗑️ Restaurante eliminado",
      })

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage({ type: "", text: "" }), 3000)
    }
  }, [])

  // Hook para sincronización con localStorage
  const { data: restaurants, updateData: updateRestaurants } = useStorageSync<Restaurant[]>({
    key: "tubarresto_restaurants",
    onDataChange: handleRestaurantsChange,
  })

  // Callback para manejar datos del servidor
  const handleServerDataChange = useCallback(
    (newData: { restaurants: Restaurant[] }, oldData: { restaurants: Restaurant[] } | null) => {
      if (newData.restaurants) {
        updateRestaurants(newData.restaurants)
      }
    },
    [updateRestaurants],
  )

  // Auto-sync con fallback a datos locales
  const {
    lastUpdate,
    error: syncError,
    isOffline,
    forceRefresh,
    goOffline,
  } = useDataSync<{ restaurants: Restaurant[] }>({
    endpoint: "get-restaurants",
    interval: 15000, // 15 segundos para reducir carga
    onDataChange: handleServerDataChange,
    enabled: !!user,
    fallbackToLocal: true,
  })

  useEffect(() => {
    // Verificar autenticación
    const userData = localStorage.getItem("tubarresto_user")
    const token = localStorage.getItem("tubarresto_token")

    if (!userData || !token) {
      router.push("/login")
      return
    }

    setUser(JSON.parse(userData))
    setIsLoading(false)

    // Solicitar permisos de notificación
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
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

    // Si estamos offline, agregar solo localmente
    if (isOffline) {
      const newRestaurantData: Restaurant = {
        id: Date.now(), // ID temporal
        name: newRestaurant.name,
        slug: newRestaurant.name.toLowerCase().replace(/\s+/g, "-"),
        description: newRestaurant.description,
        address: newRestaurant.address,
        city: newRestaurant.city,
        phone: newRestaurant.phone,
        email: newRestaurant.email,
        status: "trial",
        trial_start_date: new Date().toISOString(),
        trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      }

      const currentRestaurants = restaurants || []
      updateRestaurants([newRestaurantData, ...currentRestaurants])

      setNewRestaurant({
        name: "",
        description: "",
        address: "",
        city: "",
        phone: "",
        email: "",
      })
      setShowAddRestaurant(false)
      setMessage({
        type: "success",
        text: "✅ Restaurante agregado localmente (se sincronizará cuando vuelva la conexión)",
      })
      return
    }

    const token = localStorage.getItem("tubarresto_token")

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://tubarresto.somediave.com/api"

      const response = await fetch(`${apiUrl}/api.php?action=add-restaurant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newRestaurant),
      })

      const result = await response.json()

      if (result.success) {
        const newRestaurantData = result.data.restaurant
        const currentRestaurants = restaurants || []

        updateRestaurants([newRestaurantData, ...currentRestaurants])

        setNewRestaurant({
          name: "",
          description: "",
          address: "",
          city: "",
          phone: "",
          email: "",
        })
        setShowAddRestaurant(false)
        setMessage({ type: "success", text: "✅ Restaurante agregado exitosamente" })

        setTimeout(() => forceRefresh(), 1000)
      } else {
        setMessage({ type: "error", text: result.error || "Error al agregar restaurante" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión. Trabajando en modo offline." })
      goOffline()
    }
  }

  // Función para probar la conexión
  const testConnection = async () => {
    try {
      setMessage({ type: "info", text: "🔄 Probando conexión..." })

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://tubarresto.somediave.com/api"
      const testUrl = `${apiUrl}/api.php?action=status`

      console.log("🧪 Probando conexión a:", testUrl)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(testUrl, {
        method: "GET",
        mode: "cors",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log("📊 Test - Status:", response.status)

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setMessage({
            type: "success",
            text: `✅ API funcionando. DB: ${result.data.database.users_count} usuarios, ${result.data.database.restaurants_count} restaurantes`,
          })
        } else {
          setMessage({ type: "error", text: `❌ Error API: ${result.error}` })
        }
      } else {
        setMessage({
          type: "error",
          text: `❌ Error HTTP ${response.status}: ${response.statusText}`,
        })
      }
    } catch (error) {
      console.error("💥 Error test conexión:", error)
      if (error instanceof Error && error.name === "AbortError") {
        setMessage({
          type: "error",
          text: "❌ Timeout: El servidor no responde",
        })
      } else {
        setMessage({
          type: "error",
          text: "❌ No se puede conectar. Trabajando en modo offline.",
        })
      }
    }
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
              {/* Indicador de conexión */}
              <div className="flex items-center text-sm text-gray-500">
                {isOffline ? (
                  <WifiOff className="w-4 h-4 mr-1 text-orange-500" />
                ) : (
                  <Wifi className="w-4 h-4 mr-1 text-green-500" />
                )}
                <span className="hidden sm:inline">
                  {isOffline
                    ? "Modo offline"
                    : lastUpdate
                      ? `Actualizado: ${lastUpdate.toLocaleTimeString()}`
                      : "Sincronizando..."}
                </span>
                <button
                  onClick={forceRefresh}
                  className="ml-2 text-blue-500 hover:text-blue-600"
                  title="Actualizar ahora"
                >
                  🔄
                </button>
                {syncError && (
                  <button
                    onClick={testConnection}
                    className="ml-2 text-red-500 hover:text-red-600"
                    title={`Error: ${syncError}`}
                  >
                    <AlertCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

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
                : message.type === "info"
                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                  : "bg-red-100 text-red-700 border border-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Modo offline */}
        {isOffline && (
          <div className="mb-6 p-4 rounded-lg bg-orange-100 text-orange-700 border border-orange-300">
            <div className="flex items-center">
              <WifiOff className="w-5 h-5 mr-2" />
              <span>Trabajando en modo offline. Los cambios se sincronizarán cuando vuelva la conexión.</span>
              <button onClick={forceRefresh} className="ml-auto text-orange-600 hover:text-orange-800 underline">
                Intentar reconectar
              </button>
            </div>
          </div>
        )}

        {/* Error de sincronización */}
        {syncError && !isOffline && (
          <div className="mb-6 p-4 rounded-lg bg-yellow-100 text-yellow-700 border border-yellow-300">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>Error de sincronización: {syncError}</span>
              <button onClick={testConnection} className="ml-auto text-yellow-600 hover:text-yellow-800 underline">
                Probar conexión
              </button>
            </div>
          </div>
        )}

        {/* Bienvenida */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 font-playfair">¡Hola, {user?.first_name}!</h1>
          <p className="text-gray-600">Gestiona tus restaurantes y menús desde aquí</p>
          <p className="text-sm text-green-600 mt-1">
            {isOffline
              ? "📱 Modo offline activado - Los datos se guardan localmente"
              : "🔄 Auto-sincronización activada - Los cambios se detectan automáticamente cada 15 segundos"}
          </p>

          {/* Información de debug */}
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
            <p>
              <strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || "https://tubarresto.somediave.com/api"}
            </p>
            <p>
              <strong>Estado:</strong> {isOffline ? "Offline" : "Online"}
            </p>
            <button onClick={testConnection} className="mt-1 text-blue-500 hover:text-blue-600 underline">
              🔧 Probar conexión al servidor
            </button>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Store className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Restaurantes</p>
                <p className="text-2xl font-bold text-gray-900">{restaurants?.length || 0}</p>
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
              {isOffline ? (
                <WifiOff className="w-8 h-8 text-orange-500 mr-3" />
              ) : (
                <Settings className="w-8 h-8 text-blue-500 mr-3" />
              )}
              <div>
                <p className="text-sm text-gray-600">{isOffline ? "Modo" : "Email"}</p>
                <p className="text-sm font-medium text-gray-900">{isOffline ? "Offline" : user?.email}</p>
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
            {!restaurants || restaurants.length === 0 ? (
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
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow relative"
                  >
                    {/* Indicador de sincronización */}
                    <div className="absolute top-2 right-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isOffline ? "bg-orange-400" : syncError ? "bg-red-400" : "bg-green-400 animate-pulse"
                        }`}
                        title={isOffline ? "Modo offline" : syncError ? "Error de sincronización" : "Sincronizado"}
                      ></div>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{restaurant.name}</h3>
                      {restaurant.description && <p className="text-gray-600 text-sm mb-3">{restaurant.description}</p>}
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
                      <div className="flex justify-between items-center">
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
              <h3 className="text-lg font-bold text-gray-900 mb-4 font-playfair">
                Agregar Nuevo Restaurante
                {isOffline && <span className="text-orange-500 text-sm ml-2">(Modo offline)</span>}
              </h3>

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
                    {isOffline ? "Agregar (offline)" : "Agregar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
