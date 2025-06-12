"use client"

import type { MenuItem } from "@/lib/api-client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

// Importar el componente `Image` de `next/image`
import Image from "next/image"

interface MenuItemCardProps {
  item: MenuItem
  // Eliminar: onAddToCart: (item: MenuItem) => void;
}

export default function MenuItemCard({ item /* Eliminar: , onAddToCart */ }: MenuItemCardProps) {
  return (
    // Modificar el componente `Card` para que tenga `overflow-hidden`
    <Card className="bg-secondary text-secondary-foreground overflow-hidden">
      {/* Añadir el bloque de la imagen justo después de la etiqueta `<Card>` de apertura */}
      {item.image_url && (
        <div className="relative w-full h-48">
          <Image
            src={item.image_url || "/placeholder.svg"}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            className="rounded-t-lg"
            priority={false}
            loading="lazy"
            placeholder="blur"
            blurDataURL="/placeholder.svg?height=100&width=100"
          />
        </div>
      )}

      {/* Ajustar el `CardHeader` y `CardContent` para el padding y el tamaño de fuente */}
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-lg font-semibold">{item.name}</CardTitle>
        <CardDescription className="text-sm text-secondary-foreground/80">{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 grid gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h4 className="text-base font-bold">Precio:</h4>
            <p className="text-base">{formatCurrency(item.price)}</p>
          </div>
          {item.is_available ? (
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Disponible
            </Badge>
          ) : (
            <Badge variant="destructive" className="bg-red-100 text-red-800">
              No Disponible
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between p-4 pt-0">
        {/* Eliminar este bloque completo */}
        {/* <Button onClick={() => onAddToCart(item)} className="w-full">
          Añadir al Carrito
        </Button> */}
      </CardFooter>
    </Card>
  )
}
