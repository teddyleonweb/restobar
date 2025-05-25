"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Save, Upload, X, Plus, Trash2 } from "lucide-react"
import { restaurantsAPI, type RestaurantTable, type RestaurantImage, tablesAPI } from "@/lib/api"

export default function NewRestaurant() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    logo: "",
    cover_image: "",
    is_active: true,
  })
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [galleryImages, setGalleryImages] = useState<RestaurantImage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("tubarresto_token")
    if (!token) {
      router.push("/login")
      return
    }
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, imageType: "logo" | "cover" | "gallery") => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64String = event.target?.result as string

        if (imageType === "logo") {
          setFormData({ ...formData, logo: base64String })
        } else if (imageType === "cover") {
          setFormData({ ...formData, cover_image: base64String })
        } else if (imageType === "gallery") {
          const newImage: RestaurantImage = {
            image_url: base64String,
            image_type: "gallery",
            alt_text: `Imagen de galería ${galleryImages.length + 1}`,
            sort_order: galleryImages.length + 1,
          }
          setGalleryImages([...galleryImages, newImage])
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const removeGalleryImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index))
  }

  const addTable = () => {
    const newTable: RestaurantTable = {
      table_number: `Mesa ${tables.length + 1}`,
      seats: 4,
      is_available: true,
      location_description: "",
    }
    setTables([...tables, newTable])
  }

  const updateTable = (index: number, field: keyof RestaurantTable, value: any) => {
    const updatedTables = tables.map((table, i) => (i === index ? { ...table, [field]: value } : table))
    setTables(updatedTables)
  }

  const removeTable = (index: number) => {
    setTables(tables.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Validar datos requeridos
      if (!formData.name || !formData.address || !formData.city) {
        setError("Por favor completa todos los campos requeridos")
        return
      }

      const restaurantData = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        city: formData.city,
        phone: formData.phone,
        email: formData.email,
        logo: formData.logo,
        cover_image: formData.cover_image,
        gallery_images: galleryImages,
        is_active: formData.is_active ? 1 : 0,
      }

      console.log("Enviando datos del restaurante:", restaurantData)

      // La API devuelve directamente el restaurante creado
      const restaurant = await restaurantsAPI.create(restaurantData)
      console.log("Restaurante creado:", restaurant)

      if (restaurant && restaurant.id) {
        // Crear las mesas si existen
        if (tables.length > 0) {
          try {
            for (const table of tables) {
              await tablesAPI.create(restaurant.id, table)
              console.log("Mesa creada para nuevo restaurante:", table.table_number)
            }
          } catch (error) {
            console.error("Error creating tables:", error)
            // No fallar completamente, solo mostrar advertencia
            alert("Restaurante creado, pero hubo un error al crear algunas mesas")
          }
        }

        alert("¡Restaurante creado exitosamente!")
        router.push("/dashboard")
      } else {
        setError("Error al crear el restaurante")
      }
    } catch (error) {
      console.error("Error creating restaurant:", error)
      setError(error instanceof Error ? error.message : "Error al crear el restaurante")
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Agregar Nuevo Restaurante</h1>

          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Información básica */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Información Básica</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del restaurante *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ej: La Pizzería del Centro"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ej: Buenos Aires"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección *
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej: Av. Corrientes 1234"
                />
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
                  placeholder="Describe tu restaurante, especialidades, ambiente, etc..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ej: +54 11 1234-5678"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email del restaurante
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ej: info@mirestaurante.com"
                  />
                </div>
              </div>
            </div>

            {/* Imágenes */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Imágenes</h2>

              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo del restaurante</label>
                <div className="flex items-center space-x-4">
                  {formData.logo && (
                    <div className="relative">
                      <Image
                        src={formData.logo || "/placeholder.svg"}
                        alt="Logo"
                        width={100}
                        height={100}
                        className="rounded-lg object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "logo")}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md flex items-center"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Subir Logo
                    </label>
                  </div>
                </div>
              </div>

              {/* Imagen de portada */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Imagen de portada</label>
                <div className="flex items-center space-x-4">
                  {formData.cover_image && (
                    <div className="relative">
                      <Image
                        src={formData.cover_image || "/placeholder.svg"}
                        alt="Portada"
                        width={200}
                        height={120}
                        className="rounded-lg object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "cover")}
                      className="hidden"
                      id="cover-upload"
                    />
                    <label
                      htmlFor="cover-upload"
                      className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md flex items-center"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Subir Portada
                    </label>
                  </div>
                </div>
              </div>

              {/* Galería */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Galería de imágenes</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {galleryImages.map((image, index) => (
                    <div key={index} className="relative">
                      <Image
                        src={image.image_url || "/placeholder.svg"}
                        alt={image.alt_text}
                        width={150}
                        height={150}
                        className="rounded-lg object-cover w-full h-32"
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "gallery")}
                    className="hidden"
                    id="gallery-upload"
                  />
                  <label
                    htmlFor="gallery-upload"
                    className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md flex items-center w-fit"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Agregar a Galería
                  </label>
                </div>
              </div>
            </div>

            {/* Mesas */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Mesas del Restaurante</h2>
                <button
                  type="button"
                  onClick={addTable}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Mesa
                </button>
              </div>

              <div className="space-y-4">
                {tables.map((table, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Número de mesa</label>
                        <input
                          type="text"
                          value={table.table_number}
                          onChange={(e) => updateTable(index, "table_number", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Asientos</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={table.seats}
                          onChange={(e) => updateTable(index, "seats", Number.parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                        <input
                          type="text"
                          value={table.location_description}
                          onChange={(e) => updateTable(index, "location_description", e.target.value)}
                          placeholder="Ej: Terraza, Interior, Ventana"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={table.is_available}
                            onChange={(e) => updateTable(index, "is_available", e.target.checked)}
                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                          <label className="text-sm text-gray-700">Disponible</label>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTable(index)}
                          className="ml-4 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {tables.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay mesas configuradas. Agrega la primera mesa para comenzar.</p>
                </div>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Restaurante activo (visible para clientes)
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
                    Guardar Restaurante
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
