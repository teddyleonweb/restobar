"use client"

import type { MenuItem } from "@/types"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

interface MenuItemCardProps {
  item: MenuItem
  // Eliminar: onAddToCart: (item: MenuItem) => void;
}

export default function MenuItemCard({ item /* Eliminar: , onAddToCart */ }: MenuItemCardProps) {
  return (
    <Card className="bg-secondary text-secondary-foreground">
      <CardHeader>
        <CardTitle>{item.name}</CardTitle>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <h4 className="text-sm font-bold">Precio</h4>
            <p>{formatCurrency(item.price)}</p>
          </div>
          {item.is_available ? (
            <Badge variant="outline">Disponible</Badge>
          ) : (
            <Badge variant="destructive">No Disponible</Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {/* Eliminar este bloque completo */}
        {/* <Button onClick={() => onAddToCart(item)} className="w-full">
          Añadir al Carrito
        </Button> */}
      </CardFooter>
    </Card>
  )
}
