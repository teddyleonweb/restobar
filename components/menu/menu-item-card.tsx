"use client"

import Image from "next/image" // Import Image component
import type { MenuItem } from "@/lib/api-client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

interface MenuItemCardProps {
  item: MenuItem
  // Eliminar: onAddToCart: (item: MenuItem) => void;
}

export default function MenuItemCard({ item /* Eliminar: , onAddToCart */ }: MenuItemCardProps) {
  return (
    <Card className="bg-secondary text-secondary-foreground overflow-hidden">
      {" "}
      {/* Added overflow-hidden for rounded corners */}
      {item.image_url && (
        <div className="relative w-full h-48">
          {" "}
          {/* Container for the image */}
          <Image
            src={item.image_url || "/placeholder.svg"}
            alt={item.name}
            layout="fill" // Use fill to make the image cover the container
            objectFit="cover" // Crop the image to cover the area
            className="rounded-t-lg" // Apply rounded corners to the top
            priority={false} // Not a priority image
            loading="lazy" // Lazy load images
            placeholder="blur" // Optional: add a blur placeholder if blurDataURL is provided
            blurDataURL="/placeholder.svg?height=100&width=100" // Placeholder for blur effect
          />
        </div>
      )}
      <CardHeader className="p-4 pb-2">
        {" "}
        {/* Adjusted padding */}
        <CardTitle className="text-lg font-semibold">{item.name}</CardTitle> {/* Adjusted font size */}
        <CardDescription className="text-sm text-secondary-foreground/80">{item.description}</CardDescription>{" "}
        {/* Adjusted font size and color */}
      </CardHeader>
      <CardContent className="p-4 pt-0 grid gap-2">
        {" "}
        {/* Adjusted padding */}
        <div className="flex items-center justify-between">
          {" "}
          {/* Changed to justify-between */}
          <div className="flex items-center space-x-2">
            {" "}
            {/* Group price and label */}
            <h4 className="text-base font-bold">Precio:</h4> {/* Adjusted font size */}
            <p className="text-base">{formatCurrency(item.price)}</p> {/* Adjusted font size */}
          </div>
          {item.is_available ? (
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Disponible
            </Badge> // Added color to badge
          ) : (
            <Badge variant="destructive" className="bg-red-100 text-red-800">
              No Disponible
            </Badge> // Added color to badge
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
