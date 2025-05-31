// Centralized API configuration
export const API_CONFIG = {
  // Assuming NEXT_PUBLIC_API_BASE_URL might already include /api.php.
  // If your actual API base is just "https://tubarresto.somediave.com",
  // you should set NEXT_PUBLIC_API_BASE_URL to that value in Vercel,
  // and then revert the ENDPOINTS below to start with "/api.php".
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "https://tubarresto.somediave.com/api.php",
  ENDPOINTS: {
    REGISTER: "?action=register",
    LOGIN: "?action=login",
    ADD_RESTAURANT: "?action=add-restaurant",
    UPDATE_RESTAURANT: "?action=update-restaurant",
    DELETE_RESTAURANT: "?action=delete-restaurant",
    UPLOAD_IMAGE: "?action=upload-image",
    UPLOAD_MENU_FILE: "?action=upload-menu-file",
    GET_RESTAURANT_MENUS: "?action=get-restaurant-menus",
    DELETE_RESTAURANT_MENU: "?action=delete-restaurant-menu",
    STATUS: "?action=status",
    GET_MENU_ITEMS: "?action=get-menu-items",
    GET_MENU_CATEGORIES: "?action=get-menu-categories",
    ADD_MENU_ITEM: "?action=add-menu-item",
    UPDATE_MENU_ITEM: "?action=update-menu-item",
    DELETE_MENU_ITEM: "?action=delete-menu-item",
    ADD_MENU_CATEGORY: "?action=add-menu-category",
    UPDATE_MENU_CATEGORY: "?action=update-menu-category",
    DELETE_MENU_CATEGORY: "?action=delete-menu-category",
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
