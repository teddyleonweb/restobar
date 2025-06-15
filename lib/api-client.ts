import { getApiUrl } from "./api-config"

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

interface Restaurant {
  id: number
  name: string
  slug: string
  logo_url: string | null
  status: string
}

interface MenuCategory {
  id: number
  name: string
  restaurant_id: number
}

interface MenuItem {
  id: number
  name: string
  description: string | null
  price: number
  image_url: string | null
  category_id: number | null
  type: "food" | "drink"
  restaurant_id: number
}

interface Table {
  id: number
  restaurant_id: number
  table_number: string
  qr_code_url: string | null
}

interface OrderItemPayload {
  menu_item_id: number
  quantity: number
  price_at_order: number
  item_notes?: string | null
}

interface PlaceOrderPayload {
  restaurant_id: number
  table_id: number
  customer_first_name: string
  customer_last_name: string
  items: OrderItemPayload[]
  total_amount: number
}

interface Order {
  id: number
  restaurant_id: number
  table_id: number
  customer_first_name: string
  customer_last_name: string
  total_amount: number
  status: string
  created_at: string
}

interface OrderItem {
  id: number
  order_id: number
  menu_item_id: number
  quantity: number
  price_at_order: number
  item_notes: string | null
  menu_item_name: string // Added for display purposes
}

class ApiClient {
  private static async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error: ${response.status} ${response.statusText} - ${errorText}`)
      return { success: false, error: `Error: ${response.status} ${response.statusText}` }
    }
    try {
      const data = await response.json()
      return { success: true, data }
    } catch (error: any) {
      console.error("Error parsing JSON response:", error)
      return { success: false, error: "Invalid JSON response from server." }
    }
  }

  static async getRestaurantBySlug(
    slug: string,
  ): Promise<ApiResponse<{ restaurant: Restaurant; menu_items: MenuItem[]; categories: MenuCategory[] }>> {
    const url = getApiUrl("GET_RESTAURANT_BY_SLUG", { slug })
    try {
      const response = await fetch(url)
      return this.handleResponse(response)
    } catch (error: any) {
      console.error("Network error fetching restaurant by slug:", error)
      return { success: false, error: `Network error: ${error.message}` }
    }
  }

  static async getTables(restaurantId: number): Promise<ApiResponse<Table[]>> {
    const url = getApiUrl("GET_TABLES", { restaurantId })
    try {
      const response = await fetch(url)
      return this.handleResponse(response)
    } catch (error: any) {
      console.error("Network error fetching tables:", error)
      return { success: false, error: `Network error: ${error.message}` }
    }
  }

  static async addTable(restaurantId: number, tableNumber: string): Promise<ApiResponse<Table>> {
    const url = getApiUrl("ADD_TABLE")
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurantId, table_number: tableNumber }),
      })
      return this.handleResponse(response)
    } catch (error: any) {
      console.error("Network error adding table:", error)
      return { success: false, error: `Network error: ${error.message}` }
    }
  }

  static async updateTable(
    tableId: number,
    tableNumber: string,
    qrCodeUrl: string | null,
  ): Promise<ApiResponse<Table>> {
    const url = getApiUrl("UPDATE_TABLE", { tableId })
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_number: tableNumber, qr_code_url: qrCodeUrl }),
      })
      return this.handleResponse(response)
    } catch (error: any) {
      console.error("Network error updating table:", error)
      return { success: false, error: `Network error: ${error.message}` }
    }
  }

  static async deleteTable(tableId: number): Promise<ApiResponse<void>> {
    const url = getApiUrl("DELETE_TABLE", { tableId })
    try {
      const response = await fetch(url, { method: "DELETE" })
      return this.handleResponse(response)
    } catch (error: any) {
      console.error("Network error deleting table:", error)
      return { success: false, error: `Network error: ${error.message}` }
    }
  }

  static async uploadQrCode(file: File, tableId: number): Promise<ApiResponse<{ url: string }>> {
    const url = getApiUrl("UPLOAD_QR_CODE")
    const formData = new FormData()
    formData.append("qr_code", file)
    formData.append("table_id", tableId.toString())

    try {
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      })
      return this.handleResponse(response)
    } catch (error: any) {
      console.error("Network error uploading QR code:", error)
      return { success: false, error: `Network error: ${error.message}` }
    }
  }

  static async placeOrder(payload: PlaceOrderPayload): Promise<ApiResponse<Order>> {
    const url = getApiUrl("PLACE_ORDER")
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      return this.handleResponse(response)
    } catch (error: any) {
      console.error("Network error placing order:", error)
      return { success: false, error: `Network error: ${error.message}` }
    }
  }

  static async getOrders(restaurantId: number): Promise<ApiResponse<Order[]>> {
    const url = getApiUrl("GET_ORDERS", { restaurantId })
    try {
      const response = await fetch(url)
      return this.handleResponse(response)
    } catch (error: any) {
      console.error("Network error fetching orders:", error)
      return { success: false, error: `Network error: ${error.message}` }
    }
  }

  static async getOrderDetails(orderId: number): Promise<ApiResponse<{ order: Order; items: OrderItem[] }>> {
    const url = getApiUrl("GET_ORDER_DETAILS", { orderId })
    try {
      const response = await fetch(url)
      return this.handleResponse(response)
    } catch (error: any) {
      console.error("Network error fetching order details:", error)
      return { success: false, error: `Network error: ${error.message}` }
    }
  }

  static async updateOrderStatus(orderId: number, status: string): Promise<ApiResponse<Order>> {
    const url = getApiUrl("UPDATE_ORDER_STATUS", { orderId })
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      return this.handleResponse(response)
    } catch (error: any) {
      console.error("Network error updating order status:", error)
      return { success: false, error: `Network error: ${error.message}` }
    }
  }
}

export { ApiClient }
export type { Restaurant, MenuCategory, MenuItem, Table, Order, OrderItem }
