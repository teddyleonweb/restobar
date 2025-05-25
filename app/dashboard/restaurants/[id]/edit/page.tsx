"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Save, Upload, X, Plus, Trash2, AlertCircle, RefreshCw, Database } from "lucide-react"
import {
  restaurantsAPI,
  authAPI,
  tablesAPI,
  type Restaurant,
  type RestaurantTable,
  type RestaurantImage,
} from "@/lib/api"

// Función para validar si una URL es una imagen válida - MEJORADA
const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== "string" || url.trim() === "") return false

  // Verificar si es una URL base64
  if (url.startsWith("data:image/")) return true

  // Verificar si es una URL HTTP/HTTPS válida
  try {
    const urlObj = new URL(url)
    const validProtocols = ["http:", "https:"]
    if (!validProtocols.includes(urlObj.protocol)) return false

    // Verificar que no sea solo el dominio sin path
    if (urlObj.pathname === "/" || urlObj.pathname === "") return false

    // Verificar extensiones de imagen comunes
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]
    const hasImageExtension = imageExtensions.some((ext) => urlObj.pathname.toLowerCase().includes(ext))

    // Si la URL contiene estas palabras clave, probablemente es una imagen
    const imageKeywords = ["upload", "image", "img", "photo", "picture", "tubarresto", "wp-content"]
    const hasImageKeyword = imageKeywords.some(
      (keyword) => urlObj.pathname.toLowerCase().includes(keyword) || urlObj.hostname.toLowerCase().includes(keyword),
    )

    // Debe tener extensión de imagen O palabra clave Y un path válido
    return (hasImageExtension || hasImageKeyword) && urlObj.pathname.length > 1
  } catch {
    return false
  }
}

// Función para obtener URL de placeholder
const getPlaceholderUrl = (width: number, height: number, text: string) => {
  return `/placeholder.svg?height=${height}&width=${width}&text=${encodeURIComponent(text)}`
}

// Funciones para manejo de localStorage
const clearRestaurantCache = (restaurantId: string) => {
  const keys = Object.keys(localStorage)
  keys.forEach((key) => {
    if (key.includes(`restaurant_${restaurantId}`) || key.includes(`tables_${restaurantId}`)) {
      localStorage.removeItem(key)
      console.log(`🗑️ Removed from localStorage: ${key}`)
    }
  })
}

const getLocalStorageInfo = () => {
  const info: any = {}
  const keys = Object.keys(localStorage)
  keys.forEach((key) => {
    if (key.includes("tubarresto") || key.includes("restaurant") || key.includes("table")) {
      info[key] = localStorage.getItem(key)
    }
  })
  return info
}

// Función para generar un número de mesa único
const generateUniqueTableNumber = (existingTables: RestaurantTable[]): string => {
  const existingNumbers = new Set(existingTables.map((table) => table.table_number.toLowerCase().trim()))

  // Intentar con números simples primero
  for (let i = 1; i <= 100; i++) {
    const candidate = `Mesa ${i}`
    if (!existingNumbers.has(candidate.toLowerCase())) {
      return candidate
    }
  }

  // Si no encuentra, usar timestamp
  return `Mesa ${Date.now()}`
}

export default function EditRestaurant() {
  const router = useRouter()
  const params = useParams()
  const restaurantId = params.id as string

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
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
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [localStorageInfo, setLocalStorageInfo] = useState<any>({})
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("tubarresto_token")
    if (!token) {
      console.log("No hay token, redirigiendo a login")
      router.push("/login")
      return
    }

    console.log("Iniciando carga de restaurante, ID:", restaurantId)

    // Limpiar cache del restaurante al cargar
    clearRestaurantCache(restaurantId)

    // Obtener info del localStorage
    setLocalStorageInfo(getLocalStorageInfo())

    loadRestaurant()
  }, [router, restaurantId])

  // Función COMPLETAMENTE NUEVA para cargar datos del restaurante
  const loadRestaurant = async () => {
    try {
      setIsLoading(true)
      setError("")
      console.log("🔄 INICIANDO CARGA COMPLETA - Restaurante ID:", restaurantId)

      // PASO 1: Limpiar cualquier cache local
      clearRestaurantCache(restaurantId)

      // PASO 2: Obtener datos FRESCOS del usuario desde el servidor
      console.log("📡 Obteniendo datos frescos del servidor...")
      const userData = await authAPI.getUser()
      console.log("📊 Datos del usuario recibidos:", userData)

      const restaurants = userData.restaurants || []
      console.log("🏪 Restaurantes encontrados:", restaurants.length)

      const currentRestaurant = restaurants.find((r: Restaurant) => r.id.toString() === restaurantId)

      if (!currentRestaurant) {
        console.error("❌ Restaurante no encontrado. ID buscado:", restaurantId)
        console.error(
          "📋 IDs disponibles:",
          restaurants.map((r) => r.id),
        )
        throw new Error("Restaurante no encontrado")
      }

      console.log("✅ Restaurante encontrado:", currentRestaurant)
      setRestaurant(currentRestaurant)

      // PASO 3: Procesar datos básicos
      await processRestaurantData(currentRestaurant)

      // PASO 4: Cargar mesas DIRECTAMENTE desde la API (ignorar datos embebidos)
      console.log("🪑 Cargando mesas DIRECTAMENTE desde API...")
      await loadTablesFromAPI(currentRestaurant.id)

      console.log("✅ Carga completa finalizada")
    } catch (error) {
      console.error("❌ Error loading restaurant:", error)
      setError(`Error al cargar el restaurante: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Función para procesar datos básicos del restaurante
  const processRestaurantData = async (restaurantData: Restaurant) => {
    console.log("🔄 Procesando datos básicos del restaurante...")

    // Procesar URLs de imágenes
    const logoUrl = restaurantData.logo || ""
    const coverUrl = restaurantData.coverImage || restaurantData.cover_image || ""

    const validLogo = logoUrl && isValidImageUrl(logoUrl) ? logoUrl : ""
    const validCover = coverUrl && isValidImageUrl(coverUrl) ? coverUrl : ""

    // Actualizar formData
    setFormData({
      name: restaurantData.name || "",
      description: restaurantData.description || "",
      address: restaurantData.address || "",
      city: restaurantData.city || "",
      phone: restaurantData.phone || "",
      email: restaurantData.email || "",
      logo: validLogo,
      cover_image: validCover,
      is_active: restaurantData.is_active !== false,
    })

    // Procesar imágenes de galería
    if (restaurantData.images && Array.isArray(restaurantData.images)) {
      const validGalleryImages = restaurantData.images
        .filter((img) => {
          const imageUrl = img.url || img.image_url
          return imageUrl && isValidImageUrl(imageUrl)
        })
        .map((img) => ({
          id: img.id,
          image_url: img.url || img.image_url,
          image_type: "gallery" as const,
          alt_text: img.caption || img.alt_text || "Imagen de galería",
          sort_order: img.sort_order || 1,
        }))

      setGalleryImages(validGalleryImages)
    }

    console.log("✅ Datos básicos procesados")
  }

  // Función NUEVA para cargar mesas directamente desde la API
  const loadTablesFromAPI = async (restaurantId: number, forceRefresh = false) => {
    try {
      setIsRefreshing(true)
      console.log(`🪑 CARGANDO MESAS DESDE API - Restaurante: ${restaurantId}${forceRefresh ? " (FORZADO)" : ""}`)

      // Hacer llamada directa a la API
      const tablesData = await tablesAPI.getByRestaurant(restaurantId)
      console.log("📊 Respuesta RAW de la API:", tablesData)

      if (Array.isArray(tablesData)) {
        const processedTables = tablesData.map((table, index) => {
          console.log(`🔄 Procesando mesa ${index + 1}:`, table)
          return {
            id: table.id,
            table_number: table.table_number || table.tableNumber || `Mesa ${index + 1}`,
            seats: Number(table.seats) || 4,
            is_available: Boolean(table.is_available !== false && table.isAvailable !== false),
            location_description: table.location_description || table.location || "",
          }
        })

        console.log(`✅ MESAS PROCESADAS: ${processedTables.length}`)
        console.log("📋 Lista de mesas:", processedTables)

        // ACTUALIZAR ESTADO INMEDIATAMENTE
        setTables(processedTables)

        // Actualizar debug info
        setDebugInfo({
          restaurantId,
          tablesCount: processedTables.length,
          lastRefresh: new Date().toISOString(),
          source: "API_DIRECT",
          rawData: tablesData,
          processedData: processedTables,
          tableNumbers: processedTables.map((t) => t.table_number),
        })
      } else {
        console.log("⚠️ La respuesta no es un array:", typeof tablesData)
        setTables([])
      }
    } catch (error) {
      console.error("❌ Error cargando mesas desde API:", error)
      setTables([])
    } finally {
      setIsRefreshing(false)
    }
  }

  // Sistema de refresh mejorado
  const scheduleRefresh = useCallback(
    (delay = 1000) => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      refreshTimeoutRef.current = setTimeout(() => {
        if (restaurant) {
          console.log("🔄 REFRESH AUTOMÁTICO...")
          loadTablesFromAPI(restaurant.id, true)
        }
      }, delay)
    },
    [restaurant],
  )

  // Función para limpiar cache manualmente
  const clearCache = () => {
    console.log("🗑️ Limpiando cache manualmente...")
    clearRestaurantCache(restaurantId)
    setLocalStorageInfo(getLocalStorageInfo())
    if (restaurant) {
      loadTablesFromAPI(restaurant.id, true)
    }
  }

  // Función para debug de localStorage
  const debugLocalStorage = () => {
    const info = getLocalStorageInfo()
    setLocalStorageInfo(info)
    console.log("🔍 LocalStorage info:", info)
  }

  // Función mejorada para agregar mesa con validación robusta
  const addTable = async () => {
    if (!restaurant) return

    try {
      console.log("➕ INICIANDO CREACIÓN DE MESA...")

      // PASO 1: Obtener mesas FRESCAS del servidor para validación
      console.log("📡 Obteniendo mesas actuales del servidor...")
      const currentTables = await tablesAPI.getByRestaurant(restaurant.id)
      console.log("📊 Mesas actuales en servidor:", currentTables)

      // PASO 2: Generar número único basado en datos del servidor
      const uniqueTableNumber = generateUniqueTableNumber(currentTables)
      console.log("🎯 Número de mesa generado:", uniqueTableNumber)

      // PASO 3: Validar que no existe en el servidor
      const existsInServer = currentTables.some(
        (table) =>
          (table.table_number || table.tableNumber || "").toLowerCase().trim() ===
          uniqueTableNumber.toLowerCase().trim(),
      )

      if (existsInServer) {
        console.error("❌ El número generado ya existe en el servidor:", uniqueTableNumber)
        alert(`Error: El número de mesa "${uniqueTableNumber}" ya existe. Intenta recargar la página.`)
        return
      }

      const newTable: RestaurantTable = {
        table_number: uniqueTableNumber,
        seats: 4,
        is_available: true,
        location_description: "",
      }

      console.log("🆕 Creando mesa con datos:", newTable)

      // PASO 4: Crear mesa en el servidor
      const createdTable = await tablesAPI.create(restaurant.id, {
        tableNumber: newTable.table_number,
        table_number: newTable.table_number,
        seats: newTable.seats,
        location: newTable.location_description,
        location_description: newTable.location_description,
        isAvailable: newTable.is_available,
        is_available: newTable.is_available,
      })

      console.log("✅ Mesa creada exitosamente en servidor:", createdTable)

      // PASO 5: Recargar TODAS las mesas desde el servidor
      await loadTablesFromAPI(restaurant.id, true)

      console.log("✅ Proceso de creación de mesa completado")
    } catch (error) {
      console.error("❌ Error creando mesa:", error)

      // Mostrar error más específico
      let errorMessage = "Error desconocido"
      if (error instanceof Error) {
        if (error.message.includes("Ya existe una mesa")) {
          errorMessage =
            "Ya existe una mesa con ese número. La página se actualizará para mostrar los datos más recientes."
          // Recargar datos para sincronizar
          if (restaurant) {
            loadTablesFromAPI(restaurant.id, true)
          }
        } else {
          errorMessage = error.message
        }
      }

      alert(`Error al crear la mesa: ${errorMessage}`)
    }
  }

  // Función mejorada para actualizar mesa con validación robusta
  const updateTable = async (index: number, field: keyof RestaurantTable, value: any) => {
    console.log(`🔄 ACTUALIZANDO MESA ${index}, campo ${field}:`, value)

    // Validaciones locales básicas
    if (field === "seats" && (value < 1 || value > 20)) {
      alert("El número de asientos debe estar entre 1 y 20")
      return
    }

    if (field === "table_number" && (!value || !value.toString().trim())) {
      alert("El número de mesa no puede estar vacío")
      return
    }

    // Validación especial para números de mesa
    if (field === "table_number" && value) {
      const normalizedValue = value.toString().trim()

      // Verificar duplicados locales (excluyendo la mesa actual)
      const duplicateIndex = tables.findIndex(
        (table, i) => i !== index && table.table_number.toLowerCase().trim() === normalizedValue.toLowerCase(),
      )

      if (duplicateIndex !== -1) {
        alert(`Ya existe una mesa con el número "${normalizedValue}" en la posición ${duplicateIndex + 1}`)
        return
      }

      // Si la mesa tiene ID, verificar en el servidor también
      const table = tables[index]
      if (table.id && restaurant) {
        try {
          console.log("🔍 Verificando duplicados en servidor...")
          const serverTables = await tablesAPI.getByRestaurant(restaurant.id)
          const duplicateInServer = serverTables.find(
            (serverTable) =>
              serverTable.id !== table.id &&
              (serverTable.table_number || serverTable.tableNumber || "").toLowerCase().trim() ===
                normalizedValue.toLowerCase(),
          )

          if (duplicateInServer) {
            console.error("❌ Duplicado encontrado en servidor:", duplicateInServer)
            alert(`Ya existe una mesa con el número "${normalizedValue}" en el servidor (ID: ${duplicateInServer.id})`)
            // Recargar datos para sincronizar
            await loadTablesFromAPI(restaurant.id, true)
            return
          }
        } catch (error) {
          console.error("❌ Error verificando duplicados en servidor:", error)
          alert("Error al verificar duplicados. Intenta recargar la página.")
          return
        }
      }
    }

    // Actualización optimista local
    const updatedTables = tables.map((table, i) => {
      if (i === index) {
        return { ...table, [field]: value }
      }
      return table
    })
    setTables(updatedTables)

    // Actualizar en el servidor si la mesa tiene ID
    const table = tables[index]
    if (table.id && restaurant && typeof table.id === "number") {
      try {
        const updateData: any = {}

        if (field === "table_number") {
          updateData.tableNumber = value
          updateData.table_number = value
        } else if (field === "seats") {
          updateData.seats = value
        } else if (field === "location_description") {
          updateData.location = value
          updateData.location_description = value
        } else if (field === "is_available") {
          updateData.isAvailable = value
          updateData.is_available = value
        }

        console.log("📤 Enviando actualización al servidor:", updateData)
        await tablesAPI.update(restaurant.id, table.id, updateData)
        console.log("✅ Mesa actualizada en servidor")

        // Programar refresh para confirmar cambios
        scheduleRefresh(500)
      } catch (error) {
        console.error("❌ Error actualizando mesa:", error)

        // Revertir cambio local
        setTables(tables)

        // Mostrar error específico
        let errorMessage = "Error desconocido"
        if (error instanceof Error) {
          if (error.message.includes("Ya existe una mesa")) {
            errorMessage = "Ya existe una mesa con ese número. Los datos se actualizarán para mostrar el estado actual."
            // Recargar datos para sincronizar
            await loadTablesFromAPI(restaurant.id, true)
          } else {
            errorMessage = error.message
          }
        }

        alert(`Error al actualizar la mesa: ${errorMessage}`)
      }
    }
  }

  const removeTable = async (index: number) => {
    const table = tables[index]

    if (!table.id || !restaurant) {
      // Si no tiene ID, solo remover localmente
      setTables(tables.filter((_, i) => i !== index))
      return
    }

    try {
      console.log(`🗑️ Eliminando mesa ${table.id} (${table.table_number})`)

      // Eliminar del servidor PRIMERO
      await tablesAPI.delete(restaurant.id, table.id)
      console.log("✅ Mesa eliminada del servidor")

      // RECARGAR todas las mesas desde el servidor
      await loadTablesFromAPI(restaurant.id, true)
    } catch (error) {
      console.error("❌ Error eliminando mesa:", error)
      alert("Error al eliminar la mesa: " + (error instanceof Error ? error.message : "Error desconocido"))
    }
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
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
        coverImage: formData.cover_image,
        images: galleryImages,
        is_active: formData.is_active ? 1 : 0,
      }

      const response = await restaurantsAPI.update(Number.parseInt(restaurantId), restaurantData)

      if (response && response.success !== false) {
        alert("¡Restaurante actualizado exitosamente!")
        router.push("/dashboard")
      } else {
        setError(response.message || "Error al actualizar el restaurante")
      }
    } catch (error) {
      console.error("Error updating restaurant:", error)
      setError(error instanceof Error ? error.message : "Error al actualizar el restaurante")
    } finally {
      setIsLoading(false)
    }
  }

  // Función para recargar datos
  const reloadData = () => {
    console.log("🔄 RECARGA MANUAL COMPLETA...")
    loadRestaurant()
  }

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  if (isLoading && !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando restaurante...</p>
        </div>
      </div>
    )
  }

  if (error && !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
          <div className="space-x-4">
            <button onClick={reloadData} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
              Reintentar
            </button>
            <Link href="/dashboard" className="text-blue-500 hover:underline">
              Volver al Dashboard
            </Link>
          </div>
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
              <button
                onClick={clearCache}
                className="text-gray-500 hover:text-orange-500 transition-colors"
                title="Limpiar cache"
              >
                <Database className="w-5 h-5" />
              </button>
              <button
                onClick={debugLocalStorage}
                className="text-gray-500 hover:text-purple-500 transition-colors"
                title="Debug localStorage"
              >
                🔍
              </button>
              <button
                onClick={reloadData}
                disabled={isRefreshing}
                className={`transition-colors ${
                  isRefreshing ? "text-blue-500 animate-spin" : "text-gray-500 hover:text-blue-500"
                }`}
                title="Recargar datos"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <Link href="/dashboard" className="flex items-center text-gray-500 hover:text-red-500 transition-colors">
                <ArrowLeft className="w-5 h-5 mr-1" />
                Volver al Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar Restaurante</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          {restaurant && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Estado del Sistema</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Restaurante ID:</span> {restaurant.id}
                </div>
                <div>
                  <span className="font-medium">Mesas cargadas:</span> {tables.length}
                </div>
                <div>
                  <span className="font-medium">Estado:</span>{" "}
                  <span className={restaurant.is_active ? "text-green-600" : "text-red-600"}>
                    {restaurant.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Última actualización:</span>{" "}
                  {debugInfo?.lastRefresh ? new Date(debugInfo.lastRefresh).toLocaleTimeString() : "N/A"}
                  {isRefreshing && <span className="text-blue-600 ml-2">🔄</span>}
                </div>
                <div>
                  <span className="font-medium">Fuente de datos:</span> {debugInfo?.source || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Números de mesa:</span> {debugInfo?.tableNumbers?.join(", ") || "N/A"}
                </div>
              </div>
            </div>
          )}

          {/* Debug Info Detallado */}
          {process.env.NODE_ENV === "development" && debugInfo && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Debug Info Completo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-blue-800">Datos Procesados:</h4>
                  <pre className="text-xs text-blue-700 overflow-auto max-h-40">
                    {JSON.stringify(debugInfo.processedData, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800">LocalStorage:</h4>
                  <pre className="text-xs text-blue-700 overflow-auto max-h-40">
                    {JSON.stringify(localStorageInfo, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

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
                  {formData.logo && isValidImageUrl(formData.logo) && (
                    <div className="relative">
                      <Image
                        src={formData.logo || "/placeholder.svg"}
                        alt="Logo actual"
                        width={100}
                        height={100}
                        className="rounded-lg object-cover border"
                        onError={(e) => {
                          console.error("Error cargando logo:", formData.logo)
                          e.currentTarget.style.display = "none"
                          setFormData((prev) => ({ ...prev, logo: "" }))
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logo: "" })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
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
                      {formData.logo && isValidImageUrl(formData.logo) ? "Cambiar Logo" : "Subir Logo"}
                    </label>
                  </div>
                </div>
              </div>

              {/* Imagen de portada */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Imagen de portada</label>
                <div className="flex items-center space-x-4">
                  {formData.cover_image && isValidImageUrl(formData.cover_image) && (
                    <div className="relative">
                      <Image
                        src={formData.cover_image || "/placeholder.svg"}
                        alt="Portada actual"
                        width={200}
                        height={120}
                        className="rounded-lg object-cover border"
                        onError={(e) => {
                          console.error("Error cargando portada:", formData.cover_image)
                          e.currentTarget.style.display = "none"
                          setFormData((prev) => ({ ...prev, cover_image: "" }))
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, cover_image: "" })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
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
                      {formData.cover_image && isValidImageUrl(formData.cover_image)
                        ? "Cambiar Portada"
                        : "Subir Portada"}
                    </label>
                  </div>
                </div>
              </div>

              {/* Galería */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Galería de imágenes ({galleryImages.length})
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {galleryImages.map((image, index) => (
                    <div key={index} className="relative">
                      <Image
                        src={image.image_url || "/placeholder.svg"}
                        alt={image.alt_text}
                        width={150}
                        height={150}
                        className="rounded-lg object-cover w-full h-32"
                        onError={(e) => {
                          console.error("Error cargando imagen de galería:", image.image_url)
                          e.currentTarget.src = getPlaceholderUrl(150, 150, "Error")
                        }}
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
                <h2 className="text-xl font-semibold text-gray-900">
                  Mesas del Restaurante ({tables.length})
                  {isRefreshing && <span className="text-blue-600 ml-2 text-sm">🔄 Actualizando...</span>}
                </h2>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => restaurant && loadTablesFromAPI(restaurant.id, true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Recargar
                  </button>
                  <button
                    type="button"
                    onClick={addTable}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Mesa
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {tables.map((table, index) => (
                  <div
                    key={`${table.id || index}-${table.table_number}`}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Número de mesa
                          {table.id && <span className="text-xs text-gray-500 ml-1">(ID: {table.id})</span>}
                        </label>
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
                    Actualizando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Actualizar Restaurante
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
