import { getApiUrl } from "./api-config"

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Menu related types
export interface MenuCategory {
  id: number
  name: string
  description?: string
  type: "food" | "drink" | "both"
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface MenuItem {
  id: number
  name: string
  description?: string
  price: number
  image_url?: string
  type: "food" | "drink"
  category_id?: number
  category_name?: string
  is_available: boolean
  is_featured: boolean
  dietary: {
    is_vegetarian: boolean
    is_vegan: boolean
    is_gluten_free: boolean
    is_lactose_free: boolean
    is_spicy: boolean
  }
  calories?: number
  preparation_time?: number
  ingredients?: string
  allergens?: string
  sort_order: number
  created_at: string
}

// Generic API client class
export class ApiClient {
  private static getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("tubarresto_token")
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private static async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      const errorText = await response.text()
      console.error("API Error Response:", errorText)

      try {
        const errorData = JSON.parse(errorText)
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      } catch (parseError) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    }

    const result = await response.json()
    return result
  }

  // Authentication methods
  static async register(userData: {
    nombre: string
    apellido: string
    email: string
    telefono: string
    nombreRestaurante: string
    direccion: string
    ciudad: string
    aceptaTerminos: boolean
  }): Promise<ApiResponse> {
    const response = await fetch(getApiUrl("REGISTER"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "cors",
      body: JSON.stringify(userData),
    })

    return this.handleResponse(response)
  }

  static async login(credentials: {
    email: string
    password: string
  }): Promise<ApiResponse> {
    const response = await fetch(getApiUrl("LOGIN"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "cors",
      body: JSON.stringify(credentials),
    })

    return this.handleResponse(response)
  }

  // Restaurant methods
  static async addRestaurant(restaurantData: {
    name: string
    description?: string
    address: string
    city: string
    phone?: string
    email?: string
  }): Promise<ApiResponse> {
    const response = await fetch(getApiUrl("ADD_RESTAURANT"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(restaurantData),
    })

    return this.handleResponse(response)
  }

  static async updateRestaurant(restaurantData: {
    id: number
    name: string
    description?: string
    address: string
    city: string
    phone?: string
    email?: string
    logo_url?: string
    cover_image_url?: string
  }): Promise<ApiResponse> {
    const response = await fetch(getApiUrl("UPDATE_RESTAURANT"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(restaurantData),
    })

    return this.handleResponse(response)
  }

  static async deleteRestaurant(restaurantId: number): Promise<ApiResponse> {
    const response = await fetch(getApiUrl("DELETE_RESTAURANT"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ id: restaurantId }),
    })

    return this.handleResponse(response)
  }

  // Image upload method
  static async uploadImage(formData: FormData): Promise<ApiResponse> {
    const token = localStorage.getItem("tubarresto_token")
    const headers: HeadersInit = {}

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(getApiUrl("UPLOAD_IMAGE"), {
      method: "POST",
      headers,
      body: formData,
    })

    return this.handleResponse(response)
  }

  // Restaurant image methods
  static async addRestaurantImage(imageData: {
    restaurant_id: number
    file_name: string
    title: string
    description?: string
    file_url: string
    category?: string
    is_primary?: boolean
    file_size?: number
    mime_type?: string
    width?: number
    height?: number
    sort_order?: number
  }): Promise<ApiResponse> {
    const response = await fetch(getApiUrl("ADD_RESTAURANT_IMAGE"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(imageData),
    })

    return this.handleResponse(response)
  }

  static async updateRestaurantMainImage(imageData: {
    restaurant_id: number
    image_url: string
    type: "logo" | "cover"
  }): Promise<ApiResponse> {
    const response = await fetch(getApiUrl("UPDATE_RESTAURANT_MAIN_IMAGE"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(imageData),
    })

    return this.handleResponse(response)
  }

  static async getRestaurantImages(restaurantId: number): Promise<ApiResponse> {
    const response = await fetch(`${getApiUrl("GET_RESTAURANT_IMAGES")}&restaurant_id=${restaurantId}`, {
      headers: this.getAuthHeaders(),
    })

    return this.handleResponse(response)
  }

  static async deleteRestaurantImage(imageId: number, deleteFile = false): Promise<ApiResponse> {
    const response = await fetch(
      `${getApiUrl("DELETE_RESTAURANT_IMAGE")}?id=${imageId}&delete_file=${deleteFile ? 1 : 0}`,
      {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      },
    )

    return this.handleResponse(response)
  }

  // Menu methods
  static async getMenuItems(restaurantId: number, type?: "food" | "drink", categoryId?: number): Promise<ApiResponse> {
    // Añadir un timestamp para evitar la caché
    const timestamp = new Date().getTime()

    let url = `${getApiUrl("GET_MENU_ITEMS")}&restaurant_id=${restaurantId}&_t=${timestamp}`

    if (type) {
      url += `&type=${type}`
    }

    if (categoryId) {
      url += `&category_id=${categoryId}`
    }

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
      cache: "no-store", // Añadir esta opción para evitar la caché
    })

    return this.handleResponse(response)
  }

  static async addMenuItem(
    menuItemData: Omit<MenuItem, "id" | "created_at" | "category_name"> & { restaurant_id: number },
  ): Promise<ApiResponse> {
    const { dietary, ...rest } = menuItemData
    const payload = {
      ...rest,
      is_vegetarian: dietary.is_vegetarian,
      is_vegan: dietary.is_vegan,
      is_gluten_free: dietary.is_gluten_free,
      is_lactose_free: dietary.is_lactose_free,
      is_spicy: dietary.is_spicy,
    }
    const response = await fetch(getApiUrl("ADD_MENU_ITEM"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    return this.handleResponse(response)
  }

  static async updateMenuItem(
    menuItemData: Partial<Omit<MenuItem, "created_at" | "category_name">> & { id: number },
  ): Promise<ApiResponse> {
    const { dietary, ...rest } = menuItemData
    const payload: any = { ...rest }
    if (dietary) {
      payload.is_vegetarian = dietary.is_vegetarian
      payload.is_vegan = dietary.is_vegan
      payload.is_gluten_free = dietary.is_gluten_free
      payload.is_lactose_free = dietary.is_lactose_free
      payload.is_spicy = dietary.is_spicy
    }
    const response = await fetch(getApiUrl("UPDATE_MENU_ITEM"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    return this.handleResponse(response)
  }

  static async deleteMenuItem(itemId: number): Promise<ApiResponse> {
    const response = await fetch(getApiUrl("DELETE_MENU_ITEM"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ id: itemId }),
    })

    return this.handleResponse(response)
  }

  static async getMenuCategories(restaurantId: number, type?: "food" | "drink" | "both"): Promise<ApiResponse> {
    // Añadir un timestamp para evitar la caché
    const timestamp = new Date().getTime()

    let url = `${getApiUrl("GET_MENU_CATEGORIES")}&restaurant_id=${restaurantId}&_t=${timestamp}`

    if (type) {
      url += `&type=${type}`
    }

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
      cache: "no-store", // Añadir esta opción para evitar la caché
    })

    return this.handleResponse(response)
  }

  static async addMenuCategory(categoryData: {
    restaurant_id: number
    name: string
    description?: string
    type: "food" | "drink" | "both"
    sort_order?: number
  }): Promise<ApiResponse> {
    const response = await fetch(getApiUrl("ADD_MENU_CATEGORY"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(categoryData),
    })

    return this.handleResponse(response)
  }

  // Status check
  static async checkStatus(): Promise<ApiResponse> {
    const response = await fetch(getApiUrl("STATUS"), {
      method: "GET",
      mode: "cors",
      headers: { Accept: "application/json" },
    })

    return this.handleResponse(response)
  }
}
