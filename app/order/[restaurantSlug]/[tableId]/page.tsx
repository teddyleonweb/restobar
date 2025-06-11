"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import { ApiClient, type MenuItem, type MenuCategory, type Restaurant } from "@/lib/api-client"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import MenuItemCard from "@/components/menu/menu-item-card"
import CategoryTabs from "@/components/menu/category-tabs"

export default function OrderPage() {
  const params = useParams()
  const restaurantSlug = params.restaurantSlug as string
  const tableId = params.tableId as string

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("all") // 'all', 'food', 'drink', or category ID

  // Simulación de obtención de restaurantId a partir del slug
  // En un entorno real, necesitarías una API para obtener el ID del restaurante por su slug.
  // Por ahora, usaremos un ID fijo o una lógica de mapeo simple.
  const restaurantId = useMemo(() => {
    // Esto es un placeholder. Deberías tener una API que te devuelva el ID real
    // basado en el slug. Por ejemplo: ApiClient.getRestaurantBySlug(restaurantSlug)
    // Para la demostración, asumimos que el slug 'demo-restaurant' corresponde al ID 1.
    if (restaurantSlug === "demo-restaurant") return 1
    // Si tienes múltiples restaurantes, podrías tener un mapeo o una llamada a la API aquí.
    return null // O un ID por defecto si no se encuentra
  }, [restaurantSlug])

  useEffect(() => {
    const fetchMenuData = async () => {
      if (!restaurantId) {
        setError("Restaurant not found or invalid slug.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        // Fetch restaurant details (if needed, to display name/logo)
        // This would ideally be a specific API call like getRestaurantById or getRestaurantBySlug
        // For now, we'll just set a placeholder restaurant name.
        setRestaurant({
          id: restaurantId,
          name: "Mi Restaurante Digital",
          description: "Disfruta de nuestros deliciosos platos.",
          address: "Calle Falsa 123",
          city: "Ciudad Digital",
          phone: "123-456-7890",
          email: "info@mirestaurantedigital.com",
          logo_url: "/placeholder-logo.png", // Placeholder logo
          cover_image_url: "/hero-restaurant-digital.png", // Placeholder cover
        })

        const [itemsResponse, categoriesResponse] = await Promise.all([
          ApiClient.getMenuItems(restaurantId),
          ApiClient.getMenuCategories(restaurantId),
        ])

        if (itemsResponse.success && itemsResponse.data) {
          setMenuItems(itemsResponse.data.menu_items)
        } else {
          setError(itemsResponse.error || "Failed to fetch menu items.")
        }

        if (categoriesResponse.success && categoriesResponse.data) {
          setCategories(categoriesResponse.data.categories)
        } else {
          setError(categoriesResponse.error || "Failed to fetch categories.")
        }
      } catch (err) {
        console.error("Error fetching menu data:", err)
        setError("Failed to load menu. Please try again later.")
        toast({
          title: "Error",
          description: "No se pudo cargar el menú. Inténtalo de nuevo.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchMenuData()
  }, [restaurantId])

  const filteredMenuItems = useMemo(() => {
    if (activeTab === "all") {
      return menuItems
    }
    if (activeTab === "food") {
      return menuItems.filter((item) => item.type === "food")
    }
    if (activeTab === "drink") {
      return menuItems.filter((item) => item.type === "drink")
    }
    // Filter by category ID
    return menuItems.filter((item) => item.category_id?.toString() === activeTab)
  }, [menuItems, activeTab])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <p className="mt-4 text-lg text-gray-600">Cargando menú...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-red-600">
        <p className="text-xl font-semibold">Error al cargar el menú:</p>
        <p className="mt-2 text-center">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4">
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header del Restaurante */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={restaurant.logo_url || "/placeholder.svg"}
                alt={`${restaurant.name} logo`}
                className="h-10 w-10 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-playfair">
                {restaurant?.name || "Cargando Restaurante..."}
              </h1>
              <p className="text-sm text-gray-600">Mesa: {tableId}</p>
            </div>
          </div>
          {/* Eliminar el botón del carrito aquí */}
        </div>
      </header>

      {/* Contenido del Menú */}
      <main className="max-w-4xl mx-auto p-4 pb-20">
        {" "}
        {/* Added pb-20 for cart button space */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-center font-playfair">Nuestro Menú</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryTabs categories={categories} activeTab={activeTab} setActiveTab={setActiveTab} />

            <ScrollArea className="h-[calc(100vh-250px)] mt-4 pr-4">
              {" "}
              {/* Adjust height based on header/tabs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMenuItems.length > 0 ? (
                  filteredMenuItems.map((item) => <MenuItemCard key={item.id} item={item} />) // Eliminar onAddToCart={addToCart}
                ) : (
                  <p className="col-span-full text-center text-gray-500">No hay ítems en esta categoría.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
