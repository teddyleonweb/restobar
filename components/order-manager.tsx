"use client"

import { SheetFooter } from "@/components/ui/sheet"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { X, Loader2, RefreshCw, Eye } from "lucide-react" // Import Eye icon
import { ApiClient, type Order, type OrderItem } from "@/lib/api-client" // Import OrderItem
import { toast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area" // Import ScrollArea
import ResponsiveImage from "@/components/responsive-image" // Import ResponsiveImage

interface OrderManagerProps {
  restaurantId: number
  onClose: () => void
}

export default function OrderManager({ restaurantId, onClose }: OrderManagerProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null) // New state for selected order
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const fetchOrders = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await ApiClient.getOrders(restaurantId)
      if (response.success && response.data) {
        setOrders(response.data.orders)
      } else {
        setError(response.error || "Error al cargar las órdenes.")
        toast({
          title: "Error",
          description: response.error || "No se pudieron cargar las órdenes.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error fetching orders:", err)
      setError("Error de conexión al cargar las órdenes.")
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor para cargar las órdenes.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (restaurantId) {
      fetchOrders()
    }
  }, [restaurantId])

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
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleUpdateOrderStatus = async (orderId: number, newStatus: Order["status"]) => {
    setIsUpdatingStatus(true)
    try {
      const response = await ApiClient.updateOrderStatus(orderId, newStatus)
      if (response.success) {
        toast({
          title: "Estado Actualizado",
          description: `Orden #${orderId} actualizada a ${newStatus}.`,
        })
        fetchOrders() // Refresh orders list
        setSelectedOrder(null) // Close details dialog
      } else {
        toast({
          title: "Error al actualizar estado",
          description: response.error || "Ocurrió un error desconocido.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error updating order status:", err)
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor para actualizar el estado.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <DialogTitle className="text-2xl font-bold text-gray-900 font-playfair">Gestionar Órdenes</DialogTitle>
            <DialogDescription className="text-gray-600">
              Visualiza y gestiona las órdenes de tu restaurante.
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-gray-100">
            <X className="h-5 w-5" />
            <span className="sr-only">Cerrar</span>
          </Button>
        </DialogHeader>

        <div className="flex-grow overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Cargando órdenes...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-600">
              <p className="mb-2">{error}</p>
              <Button onClick={fetchOrders} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
              </Button>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-lg font-semibold mb-2">No hay órdenes para este restaurante.</p>
              <p className="text-sm">Cuando los clientes realicen pedidos, aparecerán aquí.</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(90vh-180px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Orden</TableHead>
                    <TableHead>Mesa</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Monto Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead> {/* New column for actions */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.table_number}</TableCell>
                      <TableCell>
                        {order.customer_first_name} {order.customer_last_name}
                      </TableCell>
                      <TableCell>${order.total_amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(order.created_at)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                          <Eye className="h-4 w-4 mr-2" /> Ver Detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      </DialogContent>

      {/* Order Details Dialog */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
            <DialogHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900 font-playfair">
                  Detalles de la Orden #{selectedOrder.id}
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Mesa: {selectedOrder.table_number} | Cliente: {selectedOrder.customer_first_name}{" "}
                  {selectedOrder.customer_last_name}
                </DialogDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(null)} className="hover:bg-gray-100">
                <X className="h-5 w-5" />
                <span className="sr-only">Cerrar</span>
              </Button>
            </DialogHeader>

            <ScrollArea className="flex-1 py-4 pr-4">
              <h3 className="text-lg font-semibold mb-3">Productos:</h3>
              {selectedOrder.items && selectedOrder.items.length > 0 ? (
                <div className="space-y-4">
                  {selectedOrder.items.map((item: OrderItem, index: number) => (
                    <div key={index} className="flex items-center gap-4 border-b pb-3 last:border-b-0">
                      <ResponsiveImage
                        src={item.image_url || "/placeholder.svg?height=64&width=64&text=No+Image"}
                        alt={item.menu_item_name || "Product image"}
                        width={64}
                        height={64}
                        className="rounded-md object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {item.quantity}x {item.menu_item_name}
                        </p>
                        {item.item_notes && (
                          <p className="text-xs text-gray-500 italic mt-1">Notas: {item.item_notes}</p>
                        )}
                      </div>
                      <p className="font-semibold text-gray-900">${(item.price_at_order * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">No hay productos en esta orden.</p>
              )}

              {selectedOrder.customer_notes && (
                <div className="mt-6 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <h3 className="text-md font-semibold mb-1">Notas Generales del Cliente:</h3>
                  <p className="text-gray-700">{selectedOrder.customer_notes}</p>
                </div>
              )}
            </ScrollArea>

            <SheetFooter className="flex flex-col gap-2 p-4 border-t">
              <div className="flex justify-between text-lg font-bold">
                <span>Total de la Orden:</span>
                <span>${selectedOrder.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                {selectedOrder.status === "pending" && (
                  <Button
                    onClick={() => handleUpdateOrderStatus(selectedOrder.id, "processing")}
                    disabled={isUpdatingStatus}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Marcar como En Proceso
                  </Button>
                )}
                {selectedOrder.status === "processing" && (
                  <Button
                    onClick={() => handleUpdateOrderStatus(selectedOrder.id, "completed")}
                    disabled={isUpdatingStatus}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Marcar como Completada
                  </Button>
                )}
                {(selectedOrder.status === "pending" || selectedOrder.status === "processing") && (
                  <Button
                    onClick={() => handleUpdateOrderStatus(selectedOrder.id, "cancelled")}
                    disabled={isUpdatingStatus}
                    variant="destructive"
                  >
                    {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Cancelar Orden
                  </Button>
                )}
              </div>
              <Button onClick={() => setSelectedOrder(null)} variant="outline">
                Cerrar
              </Button>
            </SheetFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}
