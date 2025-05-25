"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, MapPin, Phone, Mail, Clock } from "lucide-react"
import { menuAPI, type Restaurant, type Dish } from "@/lib/api"

export default function MenuPage() {
  const params = useParams()
  const qrCode = params.qrCode as string

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  // Agrupar platos por categoría
  const dishesByCategory = dishes.reduce(
    (acc, dish) => {
      const category = dish.category || "General"
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(dish)
      return acc
    },
    {} as Record<string, Dish[]>,
  )

  useEffect(() => {
    loadMenu()
  }, [qrCode])

  const loadMenu = async () => {
    try {
      setIsLoading(true)
      const data = await menuAPI.getByQR(qrCode)
      setRestaurant(data.restaurant)
      setDishes(data.dishes)
    } catch (error) {
      console.error("Error loading menu:", error)
      setError("No se pudo cargar el menú. Verifica que el código QR sea válido.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando menú...</p>
        </div>
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">😞</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Menú no encontrado</h1>
          <p className="text-gray-600 mb-6">{error || "El restaurante que buscas no existe o no está disponible."}</p>
          <Link
            href="/"
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg inline-flex items-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-lato">
      {/* Header del restaurante */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-start space-x-4">
            {restaurant.logo && (
              <div className="flex-shrink-0">
                <img
                  src={restaurant.logo || "/placeholder.svg"}
                  alt={`Logo de ${restaurant.name}`}
                  className="w-20 h-20 object-cover rounded-lg"
                />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 font-playfair">{restaurant.name}</h1>
              {restaurant.description && <p className="text-gray-600 mb-4">{restaurant.description}</p>}
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>
                    {restaurant.address}, {restaurant.city}
                  </span>
                </div>
                {restaurant.phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    <span>{restaurant.phone}</span>
                  </div>
                )}
                {restaurant.email && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    <span>{restaurant.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menú */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {dishes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🍽️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Menú en construcción</h2>
            <p className="text-gray-600">Este restaurante aún no ha agregado platos a su menú.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 font-playfair">Nuestro Menú</h2>
              <p className="text-gray-600 mt-2">Descubre nuestras deliciosas opciones</p>
            </div>

            {Object.entries(dishesByCategory).map(([category, categoryDishes]) => (
              <div key={category} className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 font-playfair border-b border-gray-200 pb-2">
                  {category}
                </h3>
                <div className="grid gap-4">
                  {categoryDishes.map((dish) => (
                    <div
                      key={dish.id}
                      className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      {dish.image && (
                        <div className="flex-shrink-0">
                          <img
                            src={dish.image || "/placeholder.svg"}
                            alt={dish.name}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">{dish.name}</h4>
                            {dish.description && <p className="text-gray-600 text-sm mt-1">{dish.description}</p>}
                          </div>
                          <div className="text-right ml-4">
                            <span className="text-xl font-bold text-red-600">${dish.price}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-12 bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <Clock className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-gray-600">Menú digital powered by</span>
          </div>
          <Link href="/" className="inline-block">
            <Image
              src="https://tubarresto.com/wp-content/uploads/2025/05/cropped-cropped-cropped-ChatGPT-Image-9-may-2025-12_44_56-a.m-1-101x49.png"
              alt="Tu Bar Resto"
              width={101}
              height={49}
              className="h-auto opacity-60 hover:opacity-100 transition-opacity"
              unoptimized={true}
            />
          </Link>
        </div>
      </div>
    </div>
  )
}
