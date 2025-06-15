"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { ApiClient, type Order } from "@/lib/api-client"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, RefreshCw } from "lucide-react"

// Custom hook for setting up an interval
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)

  // Remember the latest callback if it changes.
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current()
    }
    if (delay !== null) {
      const id = setInterval(tick, delay)
      return () => clearInterval(id)
    }
  }, [delay])
}

export default function TableOrdersPage() {
  const params = useParams()
  const tableId = Number.parseInt(params.tableId as string)

  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState<string>("Cargando Restaurante...")

  const fetchOrders = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // First, get restaurant details to display its name
      const tableResponse = await ApiClient.getTableById(tableId)
      if (!tableResponse.success || !tableResponse.data?.table) {
        throw new Error(tableResponse.error || "Mesa no encontrada.")
      }
      const restaurantId = tableResponse.data.table.restaurantId
      const restaurantSlug = tableResponse.data.table.qrCodeData.split("/")[4] // Extract slug from qrCodeData URL
      const restaurantDetailsResponse = await ApiClient.getRestaurantBySlug(restaurantSlug)
      if (restaurantDetailsResponse.success && restaurantDetailsResponse.data?.restaurant) {
        setRestaurantName(restaurantDetailsResponse.data.restaurant.name)
      } else {
        setRestaurantName("Restaurante Desconocido")
      }

      // Then, fetch orders for this table
      const ordersResponse = await ApiClient.getOrders(restaurantId, tableId)
      if (ordersResponse.success && ordersResponse.data) {
        // Filter for pending and processing orders
        const activeOrders = ordersResponse.data.orders.filter(
          (order) => order.status === "pending" || order.status === "processing",
        )
        // Sort by creation date, newest first
        activeOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setOrders(activeOrders)
      } else {
        setError(ordersResponse.error || "Error al cargar las órdenes.")
        toast({
          title: "Error",
          description: ordersResponse.error || "No se pudieron cargar las órdenes.",
          variant: "destructive",
        })
      }
    } catch (err: any) {
      console.error("Error fetching orders:", err)
      setError(err.message || "Error de conexión al cargar las órdenes.")
      toast({
        title: "Error de conexión",
        description: err.message || "No se pudo conectar con el servidor para cargar las órdenes.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (tableId) {
      fetchOrders()
    }
  }, [tableId])

  // Auto-refresh every 10 seconds
  useInterval(fetchOrders, 10000)

  const getStatusBadgeClass = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-red-500 mb-4" />
        <p className="text-lg text-gray-600">Cargando órdenes para la Mesa {tableId}...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-red-600">
        <p className="text-xl font-semibold">Error al cargar las órdenes:</p>
        <p className="mt-2 text-center">{error}</p>
        <button
          onClick={fetchOrders}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="bg-white shadow-sm p-4 mb-6 rounded-lg flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-playfair">Órdenes de {restaurantName}</h1>
          <p className="text-xl text-gray-600">
            Mesa: <span className="font-semibold">{tableId}</span>
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
        >
          <RefreshCw className="h-5 w-5 mr-2" /> Actualizar
        </button>
      </header>

      <ScrollArea className="h-[calc(100vh-150px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <p className="text-lg font-semibold mb-2">No hay órdenes pendientes o en proceso para esta mesa.</p>
              <p className="text-sm">Los nuevos pedidos aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            orders.map((order) => (
              <Card key={order.id} className="shadow-md border-l-4 border-red-500">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-bold text-gray-900">Orden #{order.id}</CardTitle>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(order.status)}`}>
                      {order.status === "pending"
                        ? "Pendiente"
                        : order.status === "processing"
                          ? "En Proceso"
                          : order.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Cliente: {order.customer_first_name} {order.customer_last_name}
                  </p>
                  <p className="text-sm text-gray-600">Hora: {formatDate(order.created_at)}</p>
                </CardHeader>
                <CardContent className="pt-3">
                  <h3 className="text-md font-semibold mb-2">Productos:</h3>
                  <ul className="space-y-2">
                    {order.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex justify-between items-start text-sm">
                        <div>
                          <p className="font-medium">
                            {item.quantity}x {item.menu_item_name}
                          </p>
                          {item.item_notes && <p className="text-xs text-gray-500 italic">Notas: {item.item_notes}</p>}
                        </div>
                        <p className="font-semibold">${(item.price_at_order * item.quantity).toFixed(2)}</p>
                      </li>
                    ))}
                  </ul>
                  {order.customer_notes && (
                    <div className="mt-4 p-2 bg-gray-100 rounded-md text-sm text-gray-700">
                      <p className="font-semibold">Notas del Cliente:</p>
                      <p>{order.customer_notes}</p>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-lg font-bold">Total:</span>
                    <span className="text-lg font-bold">${order.total_amount.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
