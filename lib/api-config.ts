export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  ENDPOINTS: {
    REGISTER: "/register",
    LOGIN: "/login",
    ADD_RESTAURANT: "/add-restaurant",
    UPDATE_RESTAURANT: "/update-restaurant",
    DELETE_RESTAURANT: "/delete-restaurant",
    UPLOAD_IMAGE: "/upload-image",
    UPLOAD_MENU_FILE: "/upload-menu-file",
    UPLOAD_QR_IMAGE: "/upload-qr-image", // Nuevo endpoint para subir imágenes QR
    GET_RESTAURANT_MENUS: "/get-restaurant-menus",
    DELETE_RESTAURANT_MENU: "/delete-restaurant-menu",
    GET_MENU_ITEMS: "/get-menu-items",
    ADD_MENU_ITEM: "/add-menu-item",
    UPDATE_MENU_ITEM: "/update-menu-item",
    DELETE_MENU_ITEM: "/delete-menu-item",
    GET_MENU_CATEGORIES: "/get-menu-categories",
    ADD_MENU_CATEGORY: "/add-menu-category",
    UPDATE_MENU_CATEGORY: "/update-menu-category",
    DELETE_MENU_CATEGORY: "/delete-menu-category",
    ADD_TABLE: "/add-table",
    GET_TABLES: "/get-tables",
    UPDATE_TABLE: "/update-table",
    DELETE_TABLE: "/delete-table",
    GET_RESTAURANT_BY_SLUG: "/get-restaurant-by-slug", // Endpoint público para obtener restaurante y menú
    GET_TABLE_BY_ID: "/get-table-by-id", // Endpoint público para obtener mesa por ID
    PLACE_ORDER: "/place-order", // Endpoint público para realizar pedidos
    GET_ORDERS: "/get-orders", // Endpoint para obtener órdenes (admin)
    STATUS: "/status",
  },
}

export function getApiUrl(endpointKey: keyof typeof API_CONFIG.ENDPOINTS) {
  const endpoint = API_CONFIG.ENDPOINTS[endpointKey]
  if (!endpoint) {
    console.error(`Endpoint "${endpointKey}" not found in API_CONFIG.ENDPOINTS`)
    // Fallback to a generic error or throw an error
    throw new Error(`Configuration error: Endpoint "${endpointKey}" is not defined.`)
  }
  return API_CONFIG.BASE_URL + endpoint
}

export function getCustomApiUrl(customEndpoint: string): string {
  return `${API_CONFIG.BASE_URL}${customEndpoint}`
}
