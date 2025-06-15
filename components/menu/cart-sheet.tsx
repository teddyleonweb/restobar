"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MinusCircle, PlusCircle, Trash2, ShoppingCart } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ApiClient } from "@/lib/api-client" // Importar ApiClient
import { getApiUrl } from "@/lib/api-config" // Importar getApiUrl desde api-config

// Define el tipo para un ítem en el carrito (debe coincidir con el de page.tsx)
interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  image_url?: string | null
  item_notes?: string // NUEVO: Notas por ítem
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
  customerFirstName: string // NUEVO
  customerLastName: string // NUEVO
  setCart: (items: CartItem[]) => void // NUEVO: Prop para limpiar el carrito
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
  customerFirstName, // NUEVO
  customerLastName, // NUEVO
  setCart, // NUEVO
}: CartSheetProps) {
  const handlePlaceOrder = async () => {
    console.log("handlePlaceOrder: Función iniciada.")
    if (cartItems.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "No puedes realizar un pedido con el carrito vacío.",
        variant: "destructive",
      })
      return
    }

    if (!customerFirstName || !customerLastName) {
      toast({
        title: "Información del Cliente Requerida",
        description: "Por favor, ingresa tu nombre y apellido para realizar el pedido.",
        variant: "destructive",
      })
      return
    }

    try {
      const orderData = {
        restaurant_id: restaurantId,
        table_id: tableId,
        customer_first_name: customerFirstName, // NUEVO
        customer_last_name: customerLastName, // NUEVO
        items: cartItems.map((item) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          item_notes: item.item_notes || null, // NUEVO: Enviar notas del ítem
        })),
        total_amount: totalPrice,
        // Otros campos como notas generales del cliente (customer_notes) si se añaden
      }
      console.log("handlePlaceOrder: Datos del pedido a enviar:", orderData) // Log antes de la llamada a la API
      console.log("handlePlaceOrder: URL de la API para PLACE_ORDER:", getApiUrl("PLACE_ORDER"))
      const response = await ApiClient.placeOrder(orderData)
      console.log("handlePlaceOrder: Respuesta de la API:", response) // Log después de la llamada a la API

      if (response.success) {
        console.log("handlePlaceOrder: API response success is true. About to call toast().")
        toast({
          title: "Pedido Realizado",
          description: "Tu pedido ha sido enviado exitosamente.",
        })
        console.log("handlePlaceOrder: toast() called. About to call setCart().")
        setCart([]) // Asumiendo que setCart es accesible o se pasa un callback para limpiar
        console.log("handlePlaceOrder: setCart() called. About to call onClose().")
        onClose()
        console.log("handlePlaceOrder: onClose() called. Order process complete.")
      } else {
        console.log("handlePlaceOrder: API response success is false. About to show error toast.")
        toast({
          title: "Error al realizar pedido",
          description: response.error || "Ocurrió un error desconocido.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error placing order:", error)
      toast({
        title: "Error de conexión",
        description: error.message || "No se pudo conectar con el servidor para realizar el pedido.",
        variant: "destructive",
      })
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Tu Carrito
          </SheetTitle>
          <SheetDescription>Revisa los ítems en tu carrito antes de realizar el pedido.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-grow py-4">
          {cartItems.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p>Tu carrito está vacío.</p>
              <p>¡Añade algunos platos deliciosos!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-2 border rounded-md bg-white">
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url || "/placeholder.svg"}
                      alt={item.name}
                      className="h-16 w-16 object-cover rounded-md"
                    />
                  )}
                  <div className="flex-grow">
                    <h4 className="font-semibold text-base">{item.name}</h4>
                    <p className="text-sm text-gray-600">${item.price.toFixed(2)} c/u</p>
                    {item.item_notes && ( // Mostrar notas del ítem si existen
                      <p className="text-xs text-gray-500 italic">Nota: {item.item_notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    >
                      <MinusCircle className="h-4 w-4" />
                    </Button>
                    <span className="font-medium w-6 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(item.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <SheetFooter className="border-t pt-4">
          <div className="w-full flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-2xl font-bold text-primary">${totalPrice.toFixed(2)}</span>
          </div>
          <Button
            onClick={() => {
              console.log("Botón 'Realizar Pedido' clickeado.")
              handlePlaceOrder()
            }}
            className="w-full"
            disabled={cartItems.length === 0}
          >
            Realizar Pedido
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
