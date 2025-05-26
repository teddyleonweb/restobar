"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useWebSocket } from "@/hooks/useWebSocket"

interface RealtimeContextType {
  isConnected: boolean
  connectionStatus: string
  subscribeToRestaurant: (restaurantId: number) => void
  sendUpdate: (type: string, data: any) => void
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (context === undefined) {
    throw new Error("useRealtime must be used within a RealtimeProvider")
  }
  return context
}

interface RealtimeProviderProps {
  children: React.ReactNode
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])

  // Obtener token del localStorage
  const token = typeof window !== "undefined" ? localStorage.getItem("tubarresto_token") : null

  const handleMessage = (message: any) => {
    console.log("🔔 Actualización en tiempo real:", message)

    switch (message.type) {
      case "restaurant_updated":
        setRestaurants((prev) => prev.map((r) => (r.id === message.data.id ? { ...r, ...message.data } : r)))
        // Mostrar notificación
        showNotification("Restaurante actualizado", "success")
        break

      case "new_order":
        setOrders((prev) => [message.data, ...prev])
        showNotification(`Nuevo pedido #${message.data.order_number}`, "info")
        break

      case "order_updated":
        setOrders((prev) => prev.map((o) => (o.id === message.data.id ? { ...o, ...message.data } : o)))
        showNotification(`Pedido #${message.data.order_number} actualizado`, "info")
        break

      case "menu_item_updated":
        setMenuItems((prev) => prev.map((item) => (item.id === message.data.id ? { ...item, ...message.data } : item)))
        showNotification("Menú actualizado", "success")
        break

      case "restaurant_deleted":
        setRestaurants((prev) => prev.filter((r) => r.id !== message.data.id))
        showNotification("Restaurante eliminado", "warning")
        break

      case "auth_success":
        console.log("✅ Autenticación WebSocket exitosa")
        break

      case "subscription_success":
        console.log(`✅ Suscrito al restaurante ${message.restaurant_id}`)
        break

      case "pong":
        // Respuesta al ping, conexión activa
        break

      default:
        console.log("📨 Mensaje no manejado:", message)
    }
  }

  const showNotification = (message: string, type: "success" | "error" | "info" | "warning") => {
    // Aquí puedes integrar con tu sistema de notificaciones
    // Por ejemplo, usando react-hot-toast, react-toastify, etc.
    console.log(`🔔 ${type.toUpperCase()}: ${message}`)

    // Ejemplo básico con notificación del navegador
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Tu Bar Resto", {
        body: message,
        icon: "/tubarresto-logo.png",
      })
    }
  }

  const { isConnected, connectionStatus, sendMessage, subscribeToRestaurant } = useWebSocket({
    url: "ws://localhost:8080", // Cambiar por tu URL de WebSocket
    token: token || undefined,
    onMessage: handleMessage,
    onConnect: () => {
      console.log("🎉 Conectado al servidor en tiempo real")
      // Solicitar permisos de notificación
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission()
      }
    },
    onDisconnect: () => {
      console.log("😞 Desconectado del servidor en tiempo real")
    },
    onError: (error) => {
      console.error("❌ Error en conexión en tiempo real:", error)
    },
  })

  const sendUpdate = (type: string, data: any) => {
    sendMessage({ type, data })
  }

  // Efecto para actualizar el estado local cuando cambian los datos
  useEffect(() => {
    // Aquí puedes sincronizar con el estado global de tu aplicación
    // Por ejemplo, actualizar el contexto de restaurantes, pedidos, etc.
  }, [restaurants, orders, menuItems])

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        connectionStatus,
        subscribeToRestaurant,
        sendUpdate,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  )
}
