"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface DataSyncOptions {
  endpoint: string
  interval?: number
  onDataChange?: (newData: any, oldData: any) => void
  enabled?: boolean
}

export function useDataSync<T>({ endpoint, interval = 5000, onDataChange, enabled = true }: DataSyncOptions) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout>()
  const lastDataRef = useRef<string>("")
  const onDataChangeRef = useRef(onDataChange)
  const isMountedRef = useRef(true)

  // Actualizar la referencia del callback sin causar re-renders
  useEffect(() => {
    onDataChangeRef.current = onDataChange
  }, [onDataChange])

  // Función para construir la URL correcta
  const buildUrl = useCallback((endpoint: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://tubarresto.somediave.com/api"

    // Si el endpoint ya incluye "api.php", usar directamente
    if (endpoint.includes("api.php")) {
      return `${apiUrl}/${endpoint}`
    }

    // Si no, agregar api.php
    return `${apiUrl}/api.php?action=${endpoint}`
  }, [])

  // Función para fetch de datos
  const fetchData = useCallback(async () => {
    if (!enabled || !isMountedRef.current) return

    const token = localStorage.getItem("tubarresto_token")
    if (!token) {
      setIsLoading(false)
      setError("No hay token de autenticación")
      return
    }

    try {
      setError(null)
      const url = buildUrl(endpoint)

      console.log("🔄 Fetching data from:", url)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        mode: "cors",
      })

      console.log("📥 Response status:", response.status)

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
        }
      } else if (!result.success) {
        throw new Error(result.error || "Error en la respuesta del servidor")
      }
    } catch (error) {
      console.error("❌ Error sincronizando datos:", error)

      let errorMessage = "Error desconocido"

      if (error instanceof TypeError) {
        if (error.message.includes("NetworkError") || error.message.includes("fetch")) {
          errorMessage = "Error de conexión. Verifica que el servidor esté disponible."
        } else {
          errorMessage = `Error de red: ${error.message}`
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      setError(errorMessage)
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [endpoint, enabled, buildUrl])

  // Efecto para configurar el polling
  useEffect(() => {
    if (!enabled) return

    // Fetch inicial
    fetchData()

    // Configurar polling
    intervalRef.current = setInterval(fetchData, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchData, interval, enabled])

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
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    lastUpdate,
    error,
    forceRefresh,
  }
}
