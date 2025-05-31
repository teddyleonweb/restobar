// Configuración de la API para Tu Bar Resto
const API_CONFIG = {
  BASE_URL: "https://tubarresto.somediave.com/api.php",
  ENDPOINTS: {
    // Autenticación
    REGISTER: "register",
    LOGIN: "login",

    // Restaurantes
    ADD_RESTAURANT: "add-restaurant",
    UPDATE_RESTAURANT: "update-restaurant",
    DELETE_RESTAURANT: "delete-restaurant",

    // Imágenes
    UPLOAD_IMAGE: "upload-image",
    ADD_RESTAURANT_IMAGE: "add-restaurant-image",
    UPDATE_RESTAURANT_MAIN_IMAGE: "update-restaurant-main-image",
    GET_RESTAURANT_IMAGES: "get-restaurant-images",
    DELETE_RESTAURANT_IMAGE: "delete-restaurant-image",

    // Menú - Elementos
    GET_MENU_ITEMS: "get-menu-items",
    ADD_MENU_ITEM: "add-menu-item",
    UPDATE_MENU_ITEM: "update-menu-item",
    DELETE_MENU_ITEM: "delete-menu-item",

    // Menú - Categorías
    GET_MENU_CATEGORIES: "get-menu-categories",
    ADD_MENU_CATEGORY: "add-menu-category",
    UPDATE_MENU_CATEGORY: "update-menu-category",
    DELETE_MENU_CATEGORY: "delete-menu-category",

    // Estado
    STATUS: "status",
  },
}

export function getApiUrl(endpoint: keyof typeof API_CONFIG.ENDPOINTS): string {
  const action = API_CONFIG.ENDPOINTS[endpoint]
  return `${API_CONFIG.BASE_URL}?action=${action}`
}

export function getCustomApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || API_CONFIG.BASE_URL.split("?")[0]
  return `${baseUrl}${path}`
}

export { API_CONFIG }
