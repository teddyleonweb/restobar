"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { MenuCategory } from "@/lib/api-client" // Corregida la ruta de importación

interface CategoryTabsProps {
  categories: MenuCategory[]
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function CategoryTabs({ categories, activeTab, setActiveTab }: CategoryTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 md:grid-cols-auto overflow-x-auto">
        <TabsTrigger value="all">Todo</TabsTrigger>
        <TabsTrigger value="food">Comida</TabsTrigger>
        <TabsTrigger value="drink">Bebida</TabsTrigger>
        {categories.map((category) => (
          <TabsTrigger key={category.id} value={category.id.toString()}>
            {category.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
