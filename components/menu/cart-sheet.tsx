"use client"

import type React from "react"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { ApiClient } from "@/lib/api-client"
import { getApiUrl } from "@/lib/api-config" // Asegúrate de que esta importación sea correcta

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  image_url?: string | null
  item_notes?: string // Notas por ítem
}

interface CartSheetProps {
  isOpen: boolean
  onClose: () => void
  cartItems: CartItem[]
  onUpdateQuantity: (itemId: number, quantity: number) => void
  onRemoveItem: (itemId: number) => void
  totalPrice: number
  restaurantId: number
  tableId: number
  customerFirstName: string // Prop para el nombre del cliente
  customerLastName: string // Prop para el apellido del cliente
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>> // Prop para limpiar el carrito
}

export default function CartSheet({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  totalPrice,
  restaurantId,
  tableId,
  customerFirstName,
  customerLastName,
  setCart, // Recibir setCart como prop
}: CartSheetProps) {
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)

  const handlePlaceOrder = async () => {
    console.log("handlePlaceOrder: Función iniciada.")
    setIsPlacingOrder(true)

    const orderItems = cartItems.map((item) => ({
      menu_item_id: item.id,
      quantity: item.quantity,
      price_at_order: item.price,
      item_notes: item.item_notes || null, // Incluir notas del ítem
    }))

    const orderData = {
      restaurant_id: restaurantId,
      table_id: tableId,
      customer_first_name: customerFirstName, // Incluir nombre del cliente
      customer_last_name: customerLastName, // Incluir apellido del cliente
      items: orderItems,
      total_amount: totalPrice,
    }

    console.log("handlePlaceOrder: Datos del pedido a enviar:", orderData)
    console.log("handlePlaceOrder: URL de la API para PLACE_ORDER:", getApiUrl("PLACE_ORDER"))

    try {
      const response = await ApiClient.placeOrder(orderData)
      console.log("handlePlaceOrder: Respuesta de la API:", response)

      if (response.success) {
        toast({
          title: "Pedido Realizado",
          description: "Tu pedido ha sido enviado con éxito.",
        })
        setCart([]) // Limpiar el carrito
        onClose() // Cerrar el sheet
      } else {
        toast({
          title: "Error al realizar pedido",
          description: response.error || "Hubo un problema al enviar tu pedido.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error placing order:", error)
      toast({
        title: "Error",
        description: `No se pudo realizar el pedido: ${error.message || "Error desconocido"}`,
        variant: "destructive",
      })
    } finally {
      setIsPlacingOrder(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Tu Pedido</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 py-4">
          {cartItems.length === 0 ? (
            <p className="text-center text-gray-500">Tu carrito está vacío.</p>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url || "/placeholder.svg"}
                      alt={item.name}
                      className="h-16 w-16 rounded-md object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-gray-500">
                      ${item.price.toFixed(2)} x {item.quantity}
                    </p>
                    {item.item_notes && <p className="text-xs text-gray-600 italic">Notas: {item.item_notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onUpdateQuantity(item.id, Number(e.target.value))}
                      className="w-16 text-center"
                      min="1"
                    />
                    <Button variant="outline" size="sm" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>
                      +
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onRemoveItem(item.id)}>
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <SheetFooter className="flex flex-col gap-2 p-4 border-t">
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>${totalPrice.toFixed(2)}</span>
          </div>
          <Button onClick={handlePlaceOrder} disabled={cartItems.length === 0 || isPlacingOrder}>
            {isPlacingOrder ? "Realizando Pedido..." : "Realizar Pedido"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
