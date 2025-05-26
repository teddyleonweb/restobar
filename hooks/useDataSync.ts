"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface DataSyncOptions {
  endpoint: string
  interval?: number
  onDataChange?: (newData: any, oldData: any) => void
  enabled?: boolean
  fallbackToLocal?: boolean
}

export function useDataSync<T>({
  endpoint,
  interval = 5000,
  onDataChange,
  enabled = true,
  fallbackToLocal = true,
}: DataSyncOptions) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout>()
  const lastDataRef = useRef<string>("")
  const onDataChangeRef = useRef(onDataChange)
  const isMountedRef = useRef(true)
  const retryCountRef = useRef(0)
  const maxRetries = 3

  // Actualizar la referencia del callback sin causar re-renders
  useEffect(() => {
    onDataChangeRef.current = onDataChange
  }, [onDataChange])

  // Función para obtener datos del localStorage como fallback
  const getLocalData = useCallback(() => {
    try {
      const localData = localStorage.getItem(`tubarresto_${endpoint}`)
      if (localData) {
        return JSON.parse(localData)
      }
    } catch (error) {
      console.error("Error leyendo datos locales:", error)
    }
    return null
  }, [endpoint])

  // Función para guardar datos en localStorage
  const saveLocalData = useCallback(
    (data: any) => {
      try {
        localStorage.setItem(`tubarresto_${endpoint}`, JSON.stringify(data))
      } catch (error) {
        console.error("Error guardando datos locales:", error)
      }
    },
    [endpoint],
  )

  // Función para construir la URL correcta
  const buildUrl = useCallback((endpoint: string) => {
    // Verificar si estamos en desarrollo o producción
    const isDevelopment = process.env.NODE_ENV === "development"

    // URLs de API
    const apiUrls = [
      process.env.NEXT_PUBLIC_API_URL,
      "https://tubarresto.somediave.com/api",
      "https://tubarresto.com/api",
      "http://localhost/tubarresto/api", // Para desarrollo local
    ].filter(Boolean)

    const baseUrl = apiUrls[0] || "https://tubarresto.somediave.com/api"

    // Construir URL final
    if (endpoint.includes("api.php")) {
      return `${baseUrl}/${endpoint}`
    }

    return `${baseUrl}/api.php?action=${endpoint}`
  }, [])

  // Función para fetch de datos
  const fetchData = useCallback(async () => {
    if (!enabled || !isMountedRef.current) return

    const token = localStorage.getItem("tubarresto_token")
    if (!token) {
      setIsLoading(false)
      setError("No hay token de autenticación")

      // Cargar datos locales si están disponibles
      if (fallbackToLocal) {
        const localData = getLocalData()
        if (localData) {
          setData(localData)
          setIsOffline(true)
        }
      }
      return
    }

    try {
      setError(null)
      const url = buildUrl(endpoint)

      console.log("🔄 Fetching data from:", url)
      console.log("🔑 Token:", token.substring(0, 20) + "...")

      // Configurar timeout para la petición
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos timeout

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          Accept: "application/json",
        },
        mode: "cors",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log("📥 Response status:", response.status)
      console.log("📥 Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      if (!isMountedRef.current) return

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("❌ Respuesta no es JSON:", text.substring(0, 200))
        throw new Error("El servidor no devolvió JSON válido")
      }

      const result = await response.json()
      console.log("📊 Data received:", result)

      if (result.success && isMountedRef.current) {
        const newDataString = JSON.stringify(result.data)

        // Solo actualizar si los datos realmente cambiaron
        if (newDataString !== lastDataRef.current) {
          setData((prevData) => {
            setLastUpdate(new Date())
            setIsOffline(false)
            retryCountRef.current = 0

            // Guardar en localStorage
            saveLocalData(result.data)

            // Notificar cambio
            if (onDataChangeRef.current && lastDataRef.current !== "") {
              onDataChangeRef.current(result.data, prevData)
            }

            lastDataRef.current = newDataString
            console.log("✅ Datos actualizados:", endpoint)
            return result.data
          })
        } else {
          console.log("📊 Sin cambios en los datos")
          setIsOffline(false)
          retryCountRef.current = 0
        }
      } else if (!result.success) {
        throw new Error(result.error || "Error en la respuesta del servidor")
      }
    } catch (error) {
      console.error("❌ Error sincronizando datos:", error)

      let errorMessage = "Error desconocido"

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Timeout: La petición tardó demasiado"
        } else if (error.message.includes("NetworkError") || error.message.includes("fetch")) {
          errorMessage = "Error de conexión. Trabajando en modo offline."

          // Cargar datos locales como fallback
          if (fallbackToLocal && retryCountRef.current < maxRetries) {
            const localData = getLocalData()
            if (localData) {
              setData(localData)
              setIsOffline(true)
              setLastUpdate(new Date(localStorage.getItem(`tubarresto_${endpoint}_timestamp`) || Date.now()))
            }
          }
        } else if (error.message.includes("CORS")) {
          errorMessage = "Error de CORS. Verifica la configuración del servidor."
        } else {
          errorMessage = error.message
        }
      }

      setError(errorMessage)
      retryCountRef.current++

      // Si hemos agotado los reintentos, activar modo offline
      if (retryCountRef.current >= maxRetries && fallbackToLocal) {
        setIsOffline(true)
        const localData = getLocalData()
        if (localData) {
          setData(localData)
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [endpoint, enabled, buildUrl, getLocalData, saveLocalData, fallbackToLocal])

  // Efecto para configurar el polling
  useEffect(() => {
    if (!enabled) return

    // Cargar datos locales inmediatamente si están disponibles
    if (fallbackToLocal) {
      const localData = getLocalData()
      if (localData) {
        setData(localData)
        setIsOffline(true)
        setIsLoading(false)
      }
    }

    // Fetch inicial
    fetchData()

    // Configurar polling solo si no estamos en modo offline
    if (!isOffline) {
      intervalRef.current = setInterval(fetchData, interval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchData, interval, enabled, isOffline, fallbackToLocal, getLocalData])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const forceRefresh = useCallback(() => {
    retryCountRef.current = 0
    setError(null)
    setIsOffline(false)
    fetchData()
  }, [fetchData])

  const goOffline = useCallback(() => {
    setIsOffline(true)
    setError(null)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Cargar datos locales
    const localData = getLocalData()
    if (localData) {
      setData(localData)
    }
  }, [getLocalData])

  return {
    data,
    isLoading,
    lastUpdate,
    error,
    isOffline,
    forceRefresh,
    goOffline,
  }
}
