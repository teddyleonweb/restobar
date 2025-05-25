// Archivo de API mejorado con mejor manejo de errores y logging

const API_BASE_URL = "https://tubarresto.somediave.com/api.php"

// Función helper para hacer requests con mejor logging
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`

  console.log(`🌐 API Request: ${options.method || "GET"} ${url}`)
  if (options.body) {
    console.log("📤 Request body:", JSON.parse(options.body as string))
  }

  const token = localStorage.getItem("tubarresto_token")

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })

  console.log(`📥 API Response: ${response.status} ${response.statusText}`)

  if (!response.ok) {
    const errorText = await response.text()
    console.error("❌ API Error:", errorText)
    throw new Error(`API Error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  console.log("📊 Response data:", data)

  return data
}

// Auth API
export const authAPI = {
  async register(userData: any) {
    return apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  },

  async login(credentials: { email: string; password: string }) {
    return apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    })
  },

  async getUser() {
    return apiRequest("/auth/user")
  },
}

// Restaurants API
export const restaurantsAPI = {
  async getAll() {
    return apiRequest("/restaurants")
  },

  async create(restaurantData: any) {
    return apiRequest("/restaurants", {
      method: "POST",
      body: JSON.stringify(restaurantData),
    })
  },

  async update(id: number, restaurantData: any) {
    return apiRequest(`/restaurants/${id}`, {
      method: "PUT",
      body: JSON.stringify(restaurantData),
    })
  },

  async delete(id: number) {
    return apiRequest(`/restaurants/${id}`, {
      method: "DELETE",
    })
  },
}

// Tables API mejorado con mejor logging
export const tablesAPI = {
  async getByRestaurant(restaurantId: number) {
    console.log(`🪑 Obteniendo mesas para restaurante ${restaurantId}`)
    try {
      const tables = await apiRequest(`/restaurants/${restaurantId}/tables`)
      console.log(`✅ Mesas obtenidas: ${Array.isArray(tables) ? tables.length : "No es array"}`)
      return Array.isArray(tables) ? tables : []
    } catch (error) {
      console.error(`❌ Error obteniendo mesas para restaurante ${restaurantId}:`, error)
      throw error
    }
  },

  async create(restaurantId: number, tableData: any) {
    console.log(`🆕 Creando mesa para restaurante ${restaurantId}:`, tableData)
    try {
      const result = await apiRequest(`/restaurants/${restaurantId}/tables`, {
        method: "POST",
        body: JSON.stringify(tableData),
      })
      console.log("✅ Mesa creada exitosamente:", result)
      return result
    } catch (error) {
      console.error(`❌ Error creando mesa para restaurante ${restaurantId}:`, error)
      throw error
    }
  },

  async update(restaurantId: number, tableId: number, tableData: any) {
    console.log(`🔄 Actualizando mesa ${tableId} del restaurante ${restaurantId}:`, tableData)
    try {
      const result = await apiRequest(`/restaurants/${restaurantId}/tables/${tableId}`, {
        method: "PUT",
        body: JSON.stringify(tableData),
      })
      console.log("✅ Mesa actualizada exitosamente:", result)
      return result
    } catch (error) {
      console.error(`❌ Error actualizando mesa ${tableId} del restaurante ${restaurantId}:`, error)
      throw error
    }
  },

  async delete(restaurantId: number, tableId: number) {
    console.log(`🗑️ Eliminando mesa ${tableId} del restaurante ${restaurantId}`)
    try {
      const result = await apiRequest(`/restaurants/${restaurantId}/tables/${tableId}`, {
        method: "DELETE",
      })
      console.log("✅ Mesa eliminada exitosamente")
      return result
    } catch (error) {
      console.error(`❌ Error eliminando mesa ${tableId} del restaurante ${restaurantId}:`, error)
      throw error
    }
  },

  // Función de debug para diagnosticar problemas
  async debug(restaurantId: number) {
    console.log(`🔍 Debug de mesas para restaurante ${restaurantId}`)
    try {
      const debugData = await apiRequest(`/debug/restaurants/${restaurantId}/tables`)
      console.log("🔍 Debug data:", debugData)
      return debugData
    } catch (error) {
      console.error(`❌ Error en debug para restaurante ${restaurantId}:`, error)
      throw error
    }
  },
}

// Dishes API
export const dishesAPI = {
  async getByRestaurant(restaurantId: number) {
    return apiRequest(`/restaurants/${restaurantId}/dishes`)
  },

  async create(dishData: any) {
    return apiRequest("/dishes", {
      method: "POST",
      body: JSON.stringify(dishData),
    })
  },

  async update(id: number, dishData: any) {
    return apiRequest(`/dishes/${id}`, {
      method: "PUT",
      body: JSON.stringify(dishData),
    })
  },

  async delete(id: number) {
    return apiRequest(`/dishes/${id}`, {
      method: "DELETE",
    })
  },
}

// Test API
export const testAPI = {
  async status() {
    return apiRequest("/status")
  },

  async ping() {
    try {
      const response = await fetch(API_BASE_URL + "/status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url,
      }
    } catch (error) {
      throw new Error(`Ping failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  },
}

// Menu API
export const menuAPI = {
  async getByQR(qrCode: string) {
    return apiRequest(`/menu/${qrCode}`)
  },
}

// Types
export interface Restaurant {
  id: number
  name: string
  description?: string
  address: string
  city: string
  phone?: string
  email?: string
  logo?: string
  cover_image?: string
  coverImage?: string
  qr_code: string
  is_active: boolean
  images?: RestaurantImage[]
  tables?: RestaurantTable[]
  createdAt: string
}

export interface RestaurantTable {
  id?: number
  table_number: string
  tableNumber?: string
  seats: number
  location_description?: string
  location?: string
  is_available: boolean
  isAvailable?: boolean
  createdAt?: string
}

export interface RestaurantImage {
  id?: number
  image_url: string
  url?: string
  image_type: "logo" | "cover" | "gallery"
  alt_text?: string
  caption?: string
  sort_order?: number
  createdAt?: string
}

export interface Dish {
  id: number
  name: string
  description?: string
  price: number
  category: string
  image?: string
  is_available: boolean
  restaurantId: number
  restaurantName?: string
  images?: any[]
  createdAt: string
}
