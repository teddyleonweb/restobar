"use client"

import { useEffect, useState, useCallback, useRef } from "react"

// Custom event para sincronización
const SYNC_EVENT = "tubarresto-data-sync"

interface StorageSyncOptions {
  key: string
  onDataChange?: (newData: any, oldData: any) => void
}

export function useStorageSync<T>({ key, onDataChange }: StorageSyncOptions) {
  const [data, setData] = useState<T | null>(null)
  const onDataChangeRef = useRef(onDataChange)

  // Actualizar la referencia sin causar re-renders
  useEffect(() => {
    onDataChangeRef.current = onDataChange
  }, [onDataChange])

  // Función para actualizar datos y notificar a otros componentes
  const updateData = useCallback(
    (newData: T) => {
      setData((prevData) => {
        // Solo actualizar si los datos realmente cambiaron
        if (JSON.stringify(prevData) === JSON.stringify(newData)) {
          return prevData
        }

        // Guardar en localStorage
        localStorage.setItem(key, JSON.stringify(newData))

        // Disparar evento personalizado para notificar a otros componentes
        window.dispatchEvent(
          new CustomEvent(SYNC_EVENT, {
            detail: { key, newData, oldData: prevData },
          }),
        )

        // Llamar callback si existe
        if (onDataChangeRef.current) {
          onDataChangeRef.current(newData, prevData)
        }

        return newData
      })
    },
    [key],
  )

  // Efecto para cargar datos iniciales y configurar listeners
  useEffect(() => {
    // Cargar datos iniciales solo una vez
    const storedData = localStorage.getItem(key)
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData)
        setData(parsedData)
      } catch (error) {
        console.error("Error parsing stored data:", error)
      }
    }

    // Handler para eventos de sincronización
    const handleStorageSync = (event: CustomEvent) => {
      if (event.detail.key === key) {
        setData(event.detail.newData)
        if (onDataChangeRef.current) {
          onDataChangeRef.current(event.detail.newData, event.detail.oldData)
        }
      }
    }

    // Handler para cambios en localStorage de otras pestañas
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        try {
          const newData = JSON.parse(event.newValue)
          setData(newData)
        } catch (error) {
          console.error("Error parsing storage change:", error)
        }
      }
    }

    // Agregar listeners
    window.addEventListener(SYNC_EVENT, handleStorageSync as EventListener)
    window.addEventListener("storage", handleStorageChange)

    // Cleanup
    return () => {
      window.removeEventListener(SYNC_EVENT, handleStorageSync as EventListener)
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [key]) // Solo depende de 'key'

  return {
    data,
    updateData,
  }
}
