"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { X, Loader2, RefreshCw } from "lucide-react"
import { ApiClient, type Order } from "@/lib/api-client"
import { toast } from "@/hooks/use-toast"

interface OrderManagerProps {
  restaurantId: number
  onClose: () => void
}

export default function OrderManager({ restaurantId, onClose }: OrderManagerProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
                    <TableHead>Monto Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Notas del Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.table_id}</TableCell>
                      <TableCell>${order.total_amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{order.customer_notes || "N/A"}</TableCell>
                      <TableCell>{formatDate(order.created_at)}</TableCell>
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
    </Dialog>
  )
}
