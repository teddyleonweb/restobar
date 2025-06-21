"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { ApiClient, type Order, type Table } from "@/lib/api-client" // Import Table type
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, RefreshCw, Utensils } from "lucide-react" // Import Utensils icon
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // Import Select components
import { Button } from "@/components/ui/button" // Import Button for the refresh button
import Image from "next/image"

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
  const tableIdFromUrl = Number.parseInt(params.tableId as string) // Renombrado para claridad

  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState<string>("Cargando Restaurante...")
  const [restaurantId, setRestaurantId] = useState<number | null>(null) // Almacenar restaurantId
  const [availableTables, setAvailableTables] = useState<Table[]>([]) // Almacenar todas las mesas para el filtro
  const [selectedTableFilter, setSelectedTableFilter] = useState<string>(tableIdFromUrl.toString()) // Estado para el filtro de mesa, inicializado con la mesa de la URL
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<Order["status"] | "all">("pending") // Estado para el filtro de estado, por defecto "pending"
  const [restaurantDetailsResponse, setRestaurantDetailsResponse] = useState<any>(null)

  const fetchOrders = async () => {
    setIsLoading(true)
    setError(null)
    try {
      let currentRestaurantId = restaurantId

      // Si restaurantId no está establecido (primera carga), obtener detalles de la mesa y el restaurante
      if (currentRestaurantId === null) {
        const tableResponse = await ApiClient.getTableById(tableIdFromUrl)
        if (!tableResponse.success || !tableResponse.data?.table) {
          throw new Error(tableResponse.error || "Mesa no encontrada.")
        }
        currentRestaurantId = tableResponse.data.table.restaurantId
        setRestaurantId(currentRestaurantId) // Guardar restaurantId

        const restaurantSlug = tableResponse.data.table.qrCodeData.split("/")[4] // Extraer slug de la URL de qrCodeData
        const restaurantDetailsResponse = await ApiClient.getRestaurantBySlug(restaurantSlug)
        setRestaurantDetailsResponse(restaurantDetailsResponse)
        if (restaurantDetailsResponse.success && restaurantDetailsResponse.data?.restaurant) {
          setRestaurantName(restaurantDetailsResponse.data.restaurant.name)
        } else {
          setRestaurantName("Restaurante Desconocido")
        }

        // Obtener todas las mesas del restaurante para poblar el dropdown de filtro
        const tablesResponse = await ApiClient.getTables(currentRestaurantId)
        if (tablesResponse.success && tablesResponse.data) {
          setAvailableTables(tablesResponse.data.tables)
        } else {
          console.warn("No se pudieron cargar las mesas para el filtro:", tablesResponse.error)
        }
      }

      if (currentRestaurantId === null) {
        throw new Error("No se pudo determinar el ID del restaurante.")
      }

      // Determinar tableId a enviar a la API (si "all" está seleccionado, enviar undefined)
      const apiTableId = selectedTableFilter === "all" ? undefined : Number(selectedTableFilter)
      // Determinar status a enviar a la API (si "all" está seleccionado, enviar undefined)
      const apiStatus = selectedStatusFilter === "all" ? undefined : selectedStatusFilter

      // Obtener órdenes usando los filtros seleccionados
      const ordersResponse = await ApiClient.getOrders(currentRestaurantId, apiTableId, apiStatus)
      if (ordersResponse.success && ordersResponse.data) {
        // No se necesita filtrado del lado del cliente, la API lo maneja
        ordersResponse.data.orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setOrders(ordersResponse.data.orders)
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

  // Carga inicial y recarga cuando los filtros cambian
  useEffect(() => {
    if (tableIdFromUrl) {
      fetchOrders()
    }
  }, [tableIdFromUrl, selectedTableFilter, selectedStatusFilter, restaurantId]) // Añadir restaurantId a las dependencias

  // Auto-refresh cada 10 segundos
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
    return new Date(dateString).toLocaleString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true, // Formato de 12 horas
    })
  }

  if (isLoading && orders.length === 0) {
    // Mostrar loader solo si no hay órdenes cargadas aún
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-red-500 mb-4" />
        <p className="text-lg text-gray-600">Cargando órdenes...</p>
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
      <header className="bg-white shadow-sm p-4 mb-6 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          {" "}
          {/* Contenedor para logo y título */}
          {restaurantDetailsResponse?.data?.restaurant?.logo_url && (
            <div className="flex-shrink-0">
              <Image
                src={restaurantDetailsResponse.data.restaurant.logo_url || "/placeholder.svg"}
                alt={`${restaurantName} Logo`}
                width={80} // Ajusta el tamaño según sea necesario
                height={80} // Ajusta el tamaño según sea necesario
                className="rounded-full object-cover"
              />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-playfair">Órdenes de {restaurantName}</h1>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* Filtro por Mesa */}
          <Select value={selectedTableFilter} onValueChange={setSelectedTableFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por Mesa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Mesas</SelectItem>
              {availableTables.map((table) => (
                <SelectItem key={table.id} value={table.id.toString()}>
                  Mesa {table.tableNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por Estado */}
          <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Estados</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="processing">En Proceso</SelectItem>
              <SelectItem value="completed">Completado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={fetchOrders}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center w-full sm:w-auto"
            disabled={isLoading} // Deshabilitar el botón mientras carga
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <RefreshCw className="h-5 w-5 mr-2" />}
            Actualizar
          </Button>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-150px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.length === 0 && !isLoading ? ( // Mostrar mensaje si no hay órdenes y no está cargando
            <div className="col-span-full text-center py-12 text-gray-500">
              <p className="text-lg font-semibold mb-2">No hay órdenes que coincidan con los filtros.</p>
              <p className="text-sm">Intenta ajustar los filtros o espera nuevos pedidos.</p>
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
                          : order.status === "completed"
                            ? "Completado"
                            : "Cancelado"}
                    </span>
                  </div>
                  <p className="text-xl text-gray-800 mt-1 flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-red-600" /> Mesa:{" "}
                    <span className="font-extrabold text-red-600">{order.table_number}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Cliente: {order.customer_first_name} {order.customer_last_name}
                  </p>
                  <p className="text-sm text-gray-600">Fecha y Hora: {formatDate(order.created_at)}</p>
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
