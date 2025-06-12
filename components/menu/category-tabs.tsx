"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { MenuCategory } from "@/lib/api-client"
import { Utensils, Coffee, ListFilter } from "lucide-react" // Importar iconos

interface CategoryTabsProps {
  categories: MenuCategory[]
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function CategoryTabs({ categories, activeTab, setActiveTab }: CategoryTabsProps) {
  return (
    <div className="w-full flex justify-center">
      <Select value={activeTab} onValueChange={setActiveTab}>
        <SelectTrigger className="w-[200px] md:w-[250px]">
          <SelectValue placeholder="Filtrar por categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4" />
              <span>Todo</span>
            </div>
          </SelectItem>
          <SelectItem value="food">
            <div className="flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              <span>Comida</span>
            </div>
          </SelectItem>
          <SelectItem value="drink">
            <div className="flex items-center gap-2">
              <Coffee className="h-4 w-4" />
              <span>Bebida</span>
            </div>
          </SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id.toString()}>
              <div className="flex items-center gap-2">
                {category.type === "food" && <Utensils className="h-4 w-4" />}
                {category.type === "drink" && <Coffee className="h-4 w-4" />}
                {category.type === "both" && <ListFilter className="h-4 w-4" />} {/* Default for 'both' */}
                <span>{category.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
