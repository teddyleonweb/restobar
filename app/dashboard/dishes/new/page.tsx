"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"
import { dishesAPI, restaurantsAPI, type Restaurant } from "@/lib/api"

export default function NewDish() {
  const router = useRouter()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "General",
    restaurantId: "", // Cambiar de restaurant_id a restaurantId
    image: "",
    is_available: true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("tubarresto_token")
    if (!token) {
      router.push("/login")
      return
    }

    loadRestaurants()
  }, [router])

  const loadRestaurants = async () => {
    try {
      const restaurants = await restaurantsAPI.getAll()
      setRestaurants(restaurants)
    } catch (error) {
      console.error("Error loading restaurants:", error)
      setError("Error al cargar restaurantes")
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Validar datos
      if (!formData.name || !formData.price || !formData.restaurantId) {
        setError("Por favor completa todos los campos requeridos")
        return
      }

      const dishData = {
        name: formData.name,
        description: formData.description,
        price: Number.parseFloat(formData.price),
        category: formData.category,
        restaurantId: Number.parseInt(formData.restaurantId), // Usar restaurantId como espera la API
        image: formData.image,
        is_available: formData.is_available ? 1 : 0,
      }

      console.log("Enviando datos del plato:", dishData)

      // La API devuelve directamente el plato creado
      const dish = await dishesAPI.create(dishData)
      console.log("Plato creado:", dish)

      if (dish && dish.id) {
        alert("¡Plato creado exitosamente!")
        router.push("/dashboard")
      } else {
        setError("Error al crear el plato")
      }
    } catch (error) {
      console.error("Error creating dish:", error)
      setError(error instanceof Error ? error.message : "Error al crear el plato")
    } finally {
      setIsLoading(false)
    }
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
            <Link href="/dashboard" className="flex items-center text-gray-500 hover:text-red-500 transition-colors">
              <ArrowLeft className="w-5 h-5 mr-1" />
              Volver al Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Agregar Nuevo Plato</h1>

          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del plato *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej: Pizza Margherita"
                />
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Precio *
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="restaurantId" className="block text-sm font-medium text-gray-700 mb-1">
                  Restaurante *
                </label>
                <select
                  id="restaurantId"
                  name="restaurantId"
                  value={formData.restaurantId}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Selecciona un restaurante</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="General">General</option>
                  <option value="Entradas">Entradas</option>
                  <option value="Platos Principales">Platos Principales</option>
                  <option value="Postres">Postres</option>
                  <option value="Bebidas">Bebidas</option>
                  <option value="Ensaladas">Ensaladas</option>
                  <option value="Pizzas">Pizzas</option>
                  <option value="Pastas">Pastas</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Describe los ingredientes y características del plato..."
              />
            </div>

            <div>
              <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                URL de la imagen
              </label>
              <input
                type="url"
                id="image"
                name="image"
                value={formData.image}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="https://ejemplo.com/imagen.jpg"
              />
              <p className="text-sm text-gray-500 mt-1">Opcional: URL de una imagen del plato</p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_available"
                name="is_available"
                checked={formData.is_available}
                onChange={handleChange}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor="is_available" className="ml-2 block text-sm text-gray-900">
                Plato disponible
              </label>
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <Link
                href="/dashboard"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-md flex items-center transition-colors"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Plato
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
