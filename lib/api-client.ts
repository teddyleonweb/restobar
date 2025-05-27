import { getApiUrl } from "./api-config"

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
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
