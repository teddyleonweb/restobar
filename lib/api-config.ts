// Centralized API configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "https://tubarresto.somediave.com",
  ENDPOINTS: {
    REGISTER: "/api.php?action=register",
    LOGIN: "/api.php?action=login",
    ADD_RESTAURANT: "/api.php?action=add-restaurant",
    UPDATE_RESTAURANT: "/api.php?action=update-restaurant",
    DELETE_RESTAURANT: "/api.php?action=delete-restaurant",
    UPLOAD_IMAGE: "/api.php?action=upload-image",
    STATUS: "/api.php?action=status",
  },
} as const
