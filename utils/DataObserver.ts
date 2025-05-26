"use client"

import { useCallback } from "react"

import { useEffect } from "react"

import { useState } from "react"

type DataChangeCallback = (newData: any, oldData: any, changeType: string) => void

class DataObserver {
  private observers: Map<string, DataChangeCallback[]> = new Map()
  private data: Map<string, any> = new Map()

  // Suscribirse a cambios en un tipo de dato específico
  subscribe(dataType: string, callback: DataChangeCallback) {
    if (!this.observers.has(dataType)) {
      this.observers.set(dataType, [])
    }
    this.observers.get(dataType)!.push(callback)

    // Retornar función para desuscribirse
    return () => {
      const callbacks = this.observers.get(dataType)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  // Notificar cambios
  notify(dataType: string, newData: any, changeType = "update") {
    const oldData = this.data.get(dataType)
    this.data.set(dataType, newData)

    const callbacks = this.observers.get(dataType)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(newData, oldData, changeType)
        } catch (error) {
          console.error("Error en callback del observer:", error)
        }
      })
    }

    // Mostrar notificación visual
    this.showNotification(dataType, changeType, newData)
  }

  // Obtener datos actuales
  getData(dataType: string) {
    return this.data.get(dataType)
  }

  // Mostrar notificación visual
  private showNotification(dataType: string, changeType: string, data: any) {
    const messages = {
      restaurants: {
        update: "🏪 Restaurante actualizado",
        create: "🆕 Nuevo restaurante agregado",
        delete: "🗑️ Restaurante eliminado",
      },
      orders: {
        update: "📋 Pedido actualizado",
        create: "🔔 Nuevo pedido recibido",
        delete: "❌ Pedido cancelado",
      },
      menu: {
        update: "🍽️ Menú actualizado",
        create: "➕ Nuevo plato agregado",
        delete: "➖ Plato eliminado",
      },
    }

    const message =
      messages[dataType as keyof typeof messages]?.[changeType as keyof (typeof messages)["restaurants"]] ||
      `${dataType} ${changeType}`

    // Notificación del navegador
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Tu Bar Resto", {
        body: message,
        icon: "/tubarresto-logo.png",
        tag: `${dataType}-${changeType}`,
      })
    }

    // Notificación visual en la app (puedes personalizar esto)
    console.log(`🔔 ${message}`, data)
  }
}

// Instancia global del observer
export const dataObserver = new DataObserver()

// Hook para usar el observer
export function useDataObserver<T>(dataType: string) {
  const [data, setData] = useState<T | null>(() => dataObserver.getData(dataType))

  useEffect(() => {
    const unsubscribe = dataObserver.subscribe(dataType, (newData, oldData, changeType) => {
      setData(newData)
    })

    return unsubscribe
  }, [dataType])

  const updateData = useCallback(
    (newData: T, changeType = "update") => {
      dataObserver.notify(dataType, newData, changeType)
    },
    [dataType],
  )

  return {
    data,
    updateData,
  }
}
