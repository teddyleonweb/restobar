"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface WebSocketMessage {
  type: string
  [key: string]: any
}

interface UseWebSocketOptions {
  url: string
  token?: string
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  autoReconnect?: boolean
  reconnectInterval?: number
}

export function useWebSocket({
  url,
  token,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  autoReconnect = true,
  reconnectInterval = 3000,
}: UseWebSocketOptions) {
  const ws = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error">(
    "disconnected",
  )
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return
    }

    setConnectionStatus("connecting")

    try {
      ws.current = new WebSocket(url)

      ws.current.onopen = () => {
        console.log("🔌 WebSocket conectado")
        setIsConnected(true)
        setConnectionStatus("connected")
        reconnectAttemptsRef.current = 0

        // Autenticar si tenemos token
        if (token) {
          sendMessage({ type: "auth", token })
        }

        onConnect?.()
      }

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log("📨 Mensaje recibido:", message)
          onMessage?.(message)
        } catch (error) {
          console.error("❌ Error parseando mensaje WebSocket:", error)
        }
      }

      ws.current.onclose = () => {
        console.log("🔌 WebSocket desconectado")
        setIsConnected(false)
        setConnectionStatus("disconnected")
        onDisconnect?.()

        // Auto-reconectar si está habilitado
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          console.log(`🔄 Reintentando conexión (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`)

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        }
      }

      ws.current.onerror = (error) => {
        console.error("❌ Error WebSocket:", error)
        setConnectionStatus("error")
        onError?.(error)
      }
    } catch (error) {
      console.error("❌ Error creando WebSocket:", error)
      setConnectionStatus("error")
    }
  }, [url, token, onMessage, onConnect, onDisconnect, onError, autoReconnect, reconnectInterval])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    if (ws.current) {
      ws.current.close()
      ws.current = null
    }

    setIsConnected(false)
    setConnectionStatus("disconnected")
  }, [])

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message))
      console.log("📤 Mensaje enviado:", message)
    } else {
      console.warn("⚠️ WebSocket no está conectado")
    }
  }, [])

  const subscribeToRestaurant = useCallback(
    (restaurantId: number) => {
      sendMessage({ type: "subscribe_restaurant", restaurant_id: restaurantId })
    },
    [sendMessage],
  )

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Ping periódico para mantener la conexión viva
  useEffect(() => {
    if (!isConnected) return

    const pingInterval = setInterval(() => {
      sendMessage({ type: "ping" })
    }, 30000) // Ping cada 30 segundos

    return () => clearInterval(pingInterval)
  }, [isConnected, sendMessage])

  return {
    isConnected,
    connectionStatus,
    sendMessage,
    subscribeToRestaurant,
    connect,
    disconnect,
  }
}
