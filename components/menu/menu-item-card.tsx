"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea" // Importar Textarea
import type { MenuItem } from "@/lib/api-client"
import { PlusCircle } from "lucide-react"
import { useState } from "react"

interface MenuItemCardProps {
  item: MenuItem
  onAddToCart: (item: MenuItem, quantity: number, item_notes?: string) => void // Añadir item_notes
}

export default function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  const [quantity, setQuantity] = useState(1)
  const [itemNotes, setItemNotes] = useState("") // Nuevo estado para notas del ítem

  const handleAddToCart = () => {
    if (quantity > 0) {
      onAddToCart(item, quantity, itemNotes) // Pasar las notas
      setQuantity(1) // Resetear cantidad
      setItemNotes("") // Resetear notas
    }
  }

  const displayPrice = item.discount_percentage
    ? (item.price * (1 - item.discount_percentage / 100)).toFixed(2)
    : item.price.toFixed(2)

  return (
    <Card className="flex flex-col overflow-hidden">
      {item.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image_url || "/placeholder.svg"} alt={item.name} className="h-48 w-full object-cover" />
      )}
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{item.name}</CardTitle>
        <p className="text-sm text-gray-600">{item.description}</p>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-primary">${displayPrice}</span>
          {item.discount_percentage && (
            <span className="ml-2 text-sm text-gray-500 line-through">${item.price.toFixed(2)}</span>
          )}
        </div>
        {item.discount_percentage && (
          <p className="text-xs text-green-600">
            {item.discount_percentage}% de descuento hasta {item.discount_end_date}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <div className="w-full">
          <Label htmlFor={`notes-${item.id}`} className="sr-only">
            Notas para {item.name}
          </Label>
          <Textarea
            id={`notes-${item.id}`}
            placeholder="Ej: poca salsa, sin cebolla..."
            value={itemNotes}
            onChange={(e) => setItemNotes(e.target.value)}
            className="w-full resize-none"
            rows={2}
          />
        </div>
        <div className="flex w-full items-center gap-2">
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
            className="w-20"
          />
          <Button onClick={handleAddToCart} className="flex-grow">
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
