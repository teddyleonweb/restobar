import { getApiUrl } from "./api-config"

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Add this interface at the top of the file, near other interfaces
export interface RestaurantMenu {
  id: string
  title: string
  description?: string
  url: string
  fileType: "image" | "pdf"
  fileName: string
  fileSize: number
  mimeType: string
  width?: number
  height?: number
  sortOrder: number
  createdAt: string
}

export interface Restaurant {
  id: number
  name: string
  description?: string
  address: string
  city: string
  phone?: string
  email?: string
  logo_url?: string
  cover_image_url?: string
}

// NUEVA INTERFACE: MenuItem
export interface MenuItem {
  id: string
  restaurant_id: number
  category_id?: number | null
  name: string
  description?: string | null
  price: number
  image_url?: string | null
  type: "food" | "drink"
  is_available?: boolean
  is_featured?: boolean
  is_vegetarian?: boolean
  is_vegan?: boolean
  is_gluten_free?: boolean
  is_lactose_free?: boolean
  is_spicy?: boolean
  calories?: number | null
  preparation_time?: number | null
  ingredients?: string | null
  allergens?: string | null
  sort_order?: number | null
  created_at: string
  updated_at?: string
  // Discount fields
  discount_percentage?: number | null
  discount_start_date?: string | null // YYYY-MM-DD format
  discount_end_date?: string | null // YYYY-MM-DD format
  category_name?: string | null // Added for display from join
}

// NUEVA INTERFACE: MenuCategory
export interface MenuCategory {
  id: number // Cambiado de string a number
  restaurant_id: number
  name: string
  description?: string | null
  type: "food" | "drink" | "both"
  sort_order: number | null
  is_active: boolean
  created_at: string
  updated_at?: string
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
  }): Promise<
    ApiResponse<{
      message: string
      user: {
        id: number
        email: string
        first_name: string
        last_name: string
        phone: string
        status: string
        email_verified: boolean
      }
      restaurants: (Restaurant & { menus?: RestaurantMenu[] })[] // Add menus here
      token: string
    }>
  > {
    const response = await fetch(getApiUrl("LOGIN"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "cors",
      body: JSON.stringify(credentials),
    })

    const result = await this.handleResponse(response)
    if (result.success && result.data?.token) {
      localStorage.setItem("tubarresto_token", result.data.token) // <-- Añade esta línea
    }
    return result
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

  // Add this new method for uploading menu files
  static async uploadMenuFile(formData: FormData): Promise<ApiResponse> {
    const token = localStorage.getItem("tubarresto_token")
    const headers: HeadersInit = {}

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(getApiUrl("UPLOAD_MENU_FILE"), {
      method: "POST",
      headers, // Note: Content-Type is automatically set by browser for FormData
      body: formData,
    })

    return this.handleResponse(response)
  }

  // Add this new method for getting restaurant menus
  static async getRestaurantMenus(
    restaurantId: number,
  ): Promise<ApiResponse<{ menus: RestaurantMenu[]; total_menus: number }>> {
    const response = await fetch(getApiUrl("GET_RESTAURANT_MENUS") + `&restaurant_id=${restaurantId}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
      mode: "cors",
    })
    return this.handleResponse(response)
  }

  // Add this new method for deleting a restaurant menu
  static async deleteRestaurantMenu(menuId: number): Promise<ApiResponse> {
    const response = await fetch(getApiUrl("DELETE_RESTAURANT_MENU"), {
      method: "POST", // Using POST as per API.php
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ id: menuId }),
    })
    return this.handleResponse(response)
  }

  // NUEVO MÉTODO: Obtener ítems de menú
  static async getMenuItems(
    restaurantId: number,
    type?: "food" | "drink",
    categoryId?: number,
  ): Promise<ApiResponse<{ menu_items: MenuItem[]; categories: MenuCategory[]; total_items: number }>> {
    let url = getApiUrl("GET_MENU_ITEMS") + `&restaurant_id=${restaurantId}`
    if (type) url += `&type=${type}`
    if (categoryId) url += `&category_id=${categoryId}`

    console.log("DEBUG: Fetching menu items from URL:", url) // NUEVO LOG
    const response = await fetch(url, {
      method: "GET",
      headers: this.getAuthHeaders(),
      mode: "cors",
      cache: "no-store", // Aseguramos que no se use caché
    })
    return this.handleResponse(response)
  }

  // NUEVO MÉTODO: Obtener categorías de menú
  static async getMenuCategories(
    restaurantId: number,
    type?: "food" | "drink" | "both",
  ): Promise<ApiResponse<{ categories: MenuCategory[]; total_categories: number }>> {
    let url = getApiUrl("GET_MENU_CATEGORIES") + `&restaurant_id=${restaurantId}`
    if (type) url += `&type=${type}`

    console.log("DEBUG: Fetching menu categories from URL:", url) // NUEVO LOG
    const response = await fetch(url, {
      method: "GET",
      headers: this.getAuthHeaders(),
      mode: "cors",
      cache: "no-store", // Aseguramos que no se use caché
    })
    return this.handleResponse(response)
  }

  // Modify the `addMenuItem` method to include discount fields
  static async addMenuItem(itemData: {
    restaurant_id: number
    category_id?: number
    name: string
    description?: string
    price: number
    image_url?: string
    type: "food" | "drink"
    is_available?: boolean
    is_featured?: boolean
    is_vegetarian?: boolean
    is_vegan?: boolean
    is_gluten_free?: boolean
    is_lactose_free?: boolean
    is_spicy?: boolean
    calories?: number
    preparation_time?: number
    ingredients?: string
    allergens?: string
    sort_order?: number
    // --- NUEVA FUNCIONALIDAD: Campos de descuento ---
    discount_percentage?: number
    discount_start_date?: string
    discount_end_date?: string
    // --- FIN NUEVA FUNCIONALIDAD ---
  }): Promise<ApiResponse> {
    const response = await fetch(getApiUrl("ADD_MENU_ITEM"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(itemData),
    })
    return this.handleResponse(response)
  }

  // Modify the `updateMenuItem` method to include discount fields
  static async updateMenuItem(itemData: {
    id: number
    name?: string
    description?: string
    price?: number
    image_url?: string
    category_id?: number
    is_available?: boolean
    is_featured?: boolean
    is_vegetarian?: boolean
    is_vegan?: boolean
    is_gluten_free?: boolean
    is_lactose_free?: boolean
    is_spicy?: boolean
    calories?: number
    preparation_time?: number
    ingredients?: string
    allergens?: string
    sort_order?: number
    // --- NUEVA FUNCIONALIDAD: Campos de descuento ---
    discount_percentage?: number | null
    discount_start_date?: string | null
    discount_end_date?: string | null
    // --- FIN NUEVA FUNCIONALIDAD ---
  }): Promise<ApiResponse> {
    const response = await fetch(getApiUrl("UPDATE_MENU_ITEM"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(itemData),
    })
    return this.handleResponse(response)
  }

  // NUEVO MÉTODO: Eliminar ítem de menú
  static async deleteMenuItem(itemId: number): Promise<ApiResponse> {
    const response = await fetch(getApiUrl("DELETE_MENU_ITEM"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ id: itemId }),
    })
    return this.handleResponse(response)
  }

  // NUEVO MÉTODO: Añadir categoría de menú
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

  // NUEVO MÉTODO: Actualizar categoría de menú (si es necesario, no se pidió explícitamente pero es buena práctica)
  static async updateMenuCategory(categoryData: {
    id: number
    name?: string
    description?: string
    type?: "food" | "drink" | "both"
    sort_order?: number
    is_active?: boolean
  }): Promise<ApiResponse> {
    const response = await fetch(getApiUrl("UPDATE_MENU_CATEGORY"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(categoryData),
    })
    return this.handleResponse(response)
  }

  // NUEVO MÉTODO: Eliminar categoría de menú (si es necesario)
  static async deleteMenuCategory(categoryId: number): Promise<ApiResponse> {
    const response = await fetch(getApiUrl("DELETE_MENU_CATEGORY"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ id: categoryId }),
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
