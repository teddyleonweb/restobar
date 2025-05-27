/**
 * Construye URLs de API de forma segura evitando duplicaciones
 */
export function buildApiUrl(endpoint: string, params?: Record<string, string>): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://tubarresto.somediave.com"

  // Remover barras finales del baseUrl
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "")

  // Asegurar que el endpoint comience con /
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`

  // Construir URL base
  let url = `${cleanBaseUrl}${cleanEndpoint}`

  // Agregar parámetros si existen
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  return url
}

/**
 * Construye URLs específicas para la API de TuBarResto
 */
export const apiEndpoints = {
  status: () => buildApiUrl("/api.php", { action: "status" }),
  test: () => buildApiUrl("/api.php", { action: "test" }),
  register: () => buildApiUrl("/api.php", { action: "register" }),
  login: () => buildApiUrl("/api.php", { action: "login" }),
  custom: (action: string, extraParams?: Record<string, string>) => buildApiUrl("/api.php", { action, ...extraParams }),
}

/**
 * Función para hacer peticiones a la API con manejo de errores
 */
export async function apiRequest(url: string, options: RequestInit = {}) {
  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
    mode: "cors",
    ...options,
  }

  try {
    console.log("🌐 API Request:", url)
    const response = await fetch(url, defaultOptions)

    console.log("📊 API Response:", {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error("❌ API Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}
