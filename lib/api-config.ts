// Centralized API configuration
export const API_CONFIG = {
  // Assuming NEXT_PUBLIC_API_BASE_URL might already include /api.php.
  // If your actual API base is just "https://tubarresto.somediave.com",
  // you should set NEXT_PUBLIC_API_BASE_URL to that value in Vercel,
  // and then revert the ENDPOINTS below to start with "/api.php".
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "https://tubarresto.somediave.com",
  ENDPOINTS: {
    REGISTER: "/api.php?action=register",
    LOGIN: "/api.php?action=login",
    ADD_RESTAURANT: "/api.php?action=add-restaurant",
    UPDATE_RESTAURANT: "/api.php?action=update-restaurant",
    DELETE_RESTAURANT: "/api.php?action=delete-restaurant",
    UPLOAD_IMAGE: "/api.php?action=upload-image",
    UPLOAD_MENU_FILE: "/api.php?action=upload-menu-file",
    UPLOAD_QR_IMAGE: "/api.php?action=upload-qr-image",
    GET_RESTAURANT_MENUS: "/api.php?action=get-restaurant-menus",
    DELETE_RESTAURANT_MENU: "/api.php?action=delete-restaurant-menu",
    STATUS: "/api.php?action=status",
    GET_MENU_ITEMS: "/api.php?action=get-menu-items",
    GET_MENU_CATEGORIES: "/api.php?action=get-menu-categories",
    ADD_MENU_ITEM: "/api.php?action=add-menu-item",
    UPDATE_MENU_ITEM: "/api.php?action=update-menu-item",
    DELETE_MENU_ITEM: "/api.php?action=delete-menu-item",
    ADD_MENU_CATEGORY: "/api.php?action=add-menu-category",
    UPDATE_MENU_CATEGORY: "/api.php?action=update-menu-category",
    DELETE_MENU_CATEGORY: "/api.php?action=delete-menu-category",
    ADD_TABLE: "/api.php?action=add-table",
    GET_TABLES: "/api.php?action=get-tables",
    UPDATE_TABLE: "/api.php?action=update-table",
    DELETE_TABLE: "/api.php?action=delete-table",
    GET_RESTAURANT_BY_SLUG: "/api.php?action=get-restaurant-by-slug",
    GET_TABLE_BY_ID: "/api.php?action=get-table-by-id", // Aseguramos que este endpoint esté presente
    PLACE_ORDER: "/api.php?action=place-order", // Aseguramos que este endpoint esté presente
  },
} as const

// Helper function to get API URLs
export function getApiUrl(endpoint: keyof typeof API_CONFIG.ENDPOINTS): string {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS[endpoint]}`
}

// Helper function for custom endpoints
export function getCustomApiUrl(customEndpoint: string): string {
  return `${API_CONFIG.BASE_URL}${customEndpoint}`
}

// Get base API URL
export function getBaseApiUrl(): string {
  return API_CONFIG.BASE_URL
}
