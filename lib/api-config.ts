// lib/api-config.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://tubarresto.somediave.com/api.php"
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://tubarresto.vercel.app"

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  APP_URL: APP_BASE_URL,
  ENDPOINTS: {
    REGISTER: `${API_BASE_URL}?action=register`,
    LOGIN: `${API_BASE_URL}?action=login`,
    ADD_RESTAURANT: `${API_BASE_URL}?action=add-restaurant`,
    UPDATE_RESTAURANT: `${API_BASE_URL}?action=update-restaurant`,
    DELETE_RESTAURANT: `${API_BASE_URL}?action=delete-restaurant`,
    UPLOAD_IMAGE: `${API_BASE_URL}?action=upload-image`,
    UPLOAD_MENU_FILE: `${API_BASE_URL}?action=upload-menu-file`,
    UPLOAD_QR_IMAGE: `${API_BASE_URL}?action=upload-qr-image`, // Nuevo endpoint para subir QR
    GET_RESTAURANT_MENUS: `${API_BASE_URL}?action=get-restaurant-menus`,
    DELETE_RESTAURANT_MENU: `${API_BASE_URL}?action=delete-restaurant-menu`,
    GET_MENU_ITEMS: `${API_BASE_URL}?action=get-menu-items`,
    ADD_MENU_ITEM: `${API_BASE_URL}?action=add-menu-item`,
    UPDATE_MENU_ITEM: `${API_BASE_URL}?action=update-menu-item`,
    DELETE_MENU_ITEM: `${API_BASE_URL}?action=delete-menu-item`,
    GET_MENU_CATEGORIES: `${API_BASE_URL}?action=get-menu-categories`,
    ADD_MENU_CATEGORY: `${API_BASE_URL}?action=add-menu-category`,
    UPDATE_MENU_CATEGORY: `${API_BASE_URL}?action=update-menu-category`,
    DELETE_MENU_CATEGORY: `${API_BASE_URL}?action=delete-menu-category`,
    ADD_TABLE: `${API_BASE_URL}?action=add-table`,
    GET_TABLES: `${API_BASE_URL}?action=get-tables`,
    UPDATE_TABLE: `${API_BASE_URL}?action=update-table`,
    DELETE_TABLE: `${API_BASE_URL}?action=delete-table`,
    GET_RESTAURANT_BY_SLUG: `${API_BASE_URL}?action=get-restaurant-by-slug`, // Endpoint público
    GET_TABLE_BY_ID: `${API_BASE_URL}?action=get-table-by-id`, // Endpoint público
    PLACE_ORDER: `${API_BASE_URL}?action=place-order`, // Endpoint público para pedidos
    GET_ORDERS: `${API_BASE_URL}?action=get-orders`, // Endpoint para obtener órdenes
    STATUS: `${API_BASE_URL}?action=status`,
  },
}

/**
 * Genera una URL de API completa para un endpoint dado.
 * @param {string} endpointName - El nombre del endpoint (ej. "LOGIN", "GET_MENU_ITEMS").
 * @param {Object} [params={}] - Un objeto de parámetros para añadir a la URL como query strings.
 * @returns {string} La URL completa de la API.
 */
export function getApiUrl(
  endpointName: keyof typeof API_CONFIG.ENDPOINTS,
  params: Record<string, string | number> = {},
): string {
  let url = API_CONFIG.ENDPOINTS[endpointName]
  const queryParams = new URLSearchParams()

  // Añadir parámetros específicos del endpoint si existen
  if (endpointName === "GET_MENU_ITEMS" && params.restaurant_id) {
    queryParams.append("restaurant_id", params.restaurant_id.toString())
    if (params.type) queryParams.append("type", params.type.toString())
    if (params.category_id) queryParams.append("category_id", params.category_id.toString())
  } else if (endpointName === "GET_MENU_CATEGORIES" && params.restaurant_id) {
    queryParams.append("restaurant_id", params.restaurant_id.toString())
    if (params.type) queryParams.append("type", params.type.toString())
  } else if (endpointName === "GET_RESTAURANT_BY_SLUG" && params.slug) {
    queryParams.append("slug", params.slug.toString())
  } else if (endpointName === "GET_TABLES" && params.restaurant_id) {
    queryParams.append("restaurant_id", params.restaurant_id.toString())
  } else if (endpointName === "GET_TABLE_BY_ID" && params.table_id) {
    queryParams.append("table_id", params.table_id.toString())
  } else if (endpointName === "GET_ORDERS" && params.restaurant_id) {
    queryParams.append("restaurant_id", params.restaurant_id.toString())
  }

  // Añadir cualquier otro parámetro genérico
  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key) && !queryParams.has(key)) {
      queryParams.append(key, params[key].toString())
    }
  }

  if (queryParams.toString()) {
    url += `&${queryParams.toString()}`
  }

  return url
}

/**
 * Obtiene la URL base de la API.
 * @returns {string} La URL base de la API.
 */
export function getBaseApiUrl(): string {
  return API_CONFIG.BASE_URL
}

/**
 * Obtiene una URL de API personalizada.
 * Esta función es útil si necesitas construir una URL que no se ajusta directamente a los ENDPOINTS predefinidos.
 * @param {string} action - La acción específica de la API (ej. "my-custom-action").
 * @param {Object} [params={}] - Un objeto de parámetros para añadir a la URL como query strings.
 * @returns {string} La URL completa de la API personalizada.
 */
export function getCustomApiUrl(action: string, params: Record<string, string | number> = {}): string {
  let url = `${API_CONFIG.BASE_URL}?action=${action}`
  const queryParams = new URLSearchParams()

  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      queryParams.append(key, params[key].toString())
    }
  }

  if (queryParams.toString()) {
    url += `&${queryParams.toString()}`
  }

  return url
}
