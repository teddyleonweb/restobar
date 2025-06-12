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
  const [apiTestResult, setApiTestResult] = useState<string | null>(null)
  const [isTestingApi, setIsTestingApi] = useState(false)

  // Simulación de obtención de restaurantId a partir del slug
  // En un entorno real, necesitarías una API para obtener el ID del restaurante por su slug.
  // Por ahora, usaremos un ID fijo o una lógica de mapeo simple.

  const handleTestApi = async () => {
    setIsTestingApi(true)
    setApiTestResult(null)
    try {
      // Use a hardcoded slug for testing, or the current restaurantSlug if available
      const testSlug = restaurantSlug || "your-default-test-slug" // Replace "your-default-test-slug" with a known slug from your database for testing
      const response = await ApiClient.getRestaurantBySlug(testSlug)
      if (response.success) {
        setApiTestResult("API Test SUCCESS: " + JSON.stringify(response.data, null, 2))
      } else {
        setApiTestResult("API Test FAILED: " + (response.error || "Unknown error"))
      }
    } catch (err: any) {
      setApiTestResult("API Test EXCEPTION: " + err.message)
      console.error("API Test Exception:", err)
    } finally {
      setIsTestingApi(false)
    }
  }

  useEffect(() => {
    const fetchMenuData = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await ApiClient.getRestaurantBySlug(restaurantSlug)

        if (response.success && response.data) {
          setRestaurant(response.data.restaurant)
          setMenuItems(response.data.menu_items)
          setCategories(response.data.categories)
        } else {
          setError(response.error || "Restaurant not found or invalid slug.")
          toast({
            title: "Error",
            description: response.error || "No se pudo cargar el menú. Restaurante no encontrado o slug inválido.",
            variant: "destructive",
          })
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
  }, [restaurantSlug]) // Dependencia solo del slug

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
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Reintentar
        </button>
        <button
          onClick={handleTestApi}
          disabled={isTestingApi}
          className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50"
        >
          {isTestingApi ? "Probando API..." : "Probar API"}
        </button>
        {apiTestResult && (
          <div className="mt-4 p-4 bg-gray-200 text-gray-800 rounded-md w-full max-w-md overflow-auto text-sm">
            <h3 className="font-bold mb-2">Resultado de la prueba de API:</h3>
            <pre className="whitespace-pre-wrap break-words">{apiTestResult}</pre>
          </div>
        )}
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
