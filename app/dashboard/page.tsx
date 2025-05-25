"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Plus, Store, ChefHat, QrCode, LogOut, Edit, Trash2, ExternalLink } from "lucide-react"
import { authAPI, restaurantsAPI, dishesAPI, type Restaurant, type Dish, type User } from "@/lib/api"

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [dishes, setDishes] = useState<Dish[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"restaurants" | "dishes">("restaurants")

  useEffect(() => {
    const token = localStorage.getItem("tubarresto_token")
    const userData = localStorage.getItem("tubarresto_user")

    if (!token || !userData) {
      router.push("/login")
      return
    }

    setUser(JSON.parse(userData))
    loadData()
  }, [router])

  const loadData = async () => {
    try {
      const data = await authAPI.getUser()
      setRestaurants(data.restaurants)
      setDishes(data.dishes)
    } catch (error) {
      console.error("Error loading data:", error)
      // Si hay error de autenticación, redirigir al login
      if (error instanceof Error && error.message.includes("autorizado")) {
        localStorage.removeItem("tubarresto_token")
        localStorage.removeItem("tubarresto_user")
        router.push("/login")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("tubarresto_token")
    localStorage.removeItem("tubarresto_user")
    router.push("/")
  }

  const handleDeleteRestaurant = async (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este restaurante? Se eliminarán todos sus platos.")) {
      try {
        await restaurantsAPI.delete(id)
        await loadData() // Recargar datos
      } catch (error) {
        alert("Error al eliminar restaurante")
      }
    }
  }

  const handleDeleteDish = async (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este plato?")) {
      try {
        await dishesAPI.delete(id)
        await loadData() // Recargar datos
      } catch (error) {
        alert("Error al eliminar plato")
      }
    }
  }

  const handleViewMenu = (qrCode: string) => {
    // Abrir el menú en una nueva pestaña
    const menuUrl = `/menu/${qrCode}`
    window.open(menuUrl, "_blank")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-lato">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <span className="text-gray-700">Hola, {user?.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-500 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-1" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Store className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Restaurantes</p>
                <p className="text-2xl font-semibold text-gray-900">{restaurants.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ChefHat className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Platos</p>
                <p className="text-2xl font-semibold text-gray-900">{dishes.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <QrCode className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Códigos QR</p>
                <p className="text-2xl font-semibold text-gray-900">{restaurants.filter((r) => r.is_active).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab("restaurants")}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === "restaurants"
                    ? "border-red-500 text-red-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Store className="w-5 h-5 inline mr-2" />
                Restaurantes
              </button>
              <button
                onClick={() => setActiveTab("dishes")}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === "dishes"
                    ? "border-red-500 text-red-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <ChefHat className="w-5 h-5 inline mr-2" />
                Platos
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "restaurants" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Mis Restaurantes</h2>
                  <Link
                    href="/dashboard/restaurants/new"
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Restaurante
                  </Link>
                </div>

                {restaurants.length === 0 ? (
                  <div className="text-center py-12">
                    <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes restaurantes</h3>
                    <p className="text-gray-500 mb-4">Crea tu primer restaurante para comenzar</p>
                    <Link
                      href="/dashboard/restaurants/new"
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg inline-flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Restaurante
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {restaurants.map((restaurant) => (
                      <div key={restaurant.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        {restaurant.logo && (
                          <img
                            src={restaurant.logo || "/placeholder.svg"}
                            alt={restaurant.name}
                            className="w-full h-32 object-cover rounded-lg mb-4"
                          />
                        )}
                        <h3 className="font-semibold text-lg mb-2">{restaurant.name}</h3>
                        <p className="text-gray-600 text-sm mb-2">
                          {restaurant.address}, {restaurant.city}
                        </p>
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              restaurant.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {restaurant.is_active ? "Activo" : "Inactivo"}
                          </span>
                          <span className="text-xs text-gray-500">QR: {restaurant.qr_code}</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewMenu(restaurant.qr_code)}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-3 rounded flex items-center justify-center transition-colors"
                            title="Ver menú público"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Ver Menú
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/restaurants/${restaurant.id}/edit`)}
                            className="bg-gray-500 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded flex items-center justify-center transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRestaurant(restaurant.id)}
                            className="bg-red-500 hover:bg-red-600 text-white text-sm py-2 px-3 rounded flex items-center justify-center transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "dishes" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Mis Platos</h2>
                  <Link
                    href="/dashboard/dishes/new"
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Plato
                  </Link>
                </div>

                {dishes.length === 0 ? (
                  <div className="text-center py-12">
                    <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes platos</h3>
                    <p className="text-gray-500 mb-4">Agrega platos a tus restaurantes</p>
                    <Link
                      href="/dashboard/dishes/new"
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg inline-flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Plato
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dishes.map((dish) => (
                      <div key={dish.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        {dish.image && (
                          <img
                            src={dish.image || "/placeholder.svg"}
                            alt={dish.name}
                            className="w-full h-32 object-cover rounded-lg mb-4"
                          />
                        )}
                        <h3 className="font-semibold text-lg mb-2">{dish.name}</h3>
                        <p className="text-gray-600 text-sm mb-2">{dish.description}</p>
                        <p className="text-red-600 font-semibold mb-2">${dish.price}</p>
                        <p className="text-gray-500 text-xs mb-2">{dish.restaurantName}</p>
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              dish.is_available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {dish.is_available ? "Disponible" : "No disponible"}
                          </span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => router.push(`/dashboard/dishes/${dish.id}/edit`)}
                              className="text-gray-600 hover:text-gray-800"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDish(dish.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Eliminar"
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
