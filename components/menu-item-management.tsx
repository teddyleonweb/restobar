"use client"

// components/menu-item-management.tsx

import { useState, useEffect } from "react"
import { apiClient } from "../api/apiClient"

interface MenuItem {
  id: number
  name: string
  description: string
  price: number
  image_url: string
}

const MenuItemManagement = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [newItemName, setNewItemName] = useState("")
  const [newItemDescription, setNewItemDescription] = useState("")
  const [newItemPrice, setNewItemPrice] = useState<number>(0)
  const [newItemImageUrl, setNewItemImageUrl] = useState("")

  useEffect(() => {
    fetchMenuItems()
  }, [])

  const fetchMenuItems = async () => {
    try {
      const token = localStorage.getItem("tubarresto_token")
      if (!token) {
        alert("Token de autenticación no encontrado. Por favor, inicia sesión de nuevo.")
        return
      }
      const items = await apiClient.getMenuItems(token)
      setMenuItems(items)
    } catch (err: any) {
      alert(`Error al obtener elementos del menú: ${err.message}`)
    }
  }

  const handleCreateMenuItem = async () => {
    try {
      const token = localStorage.getItem("tubarresto_token")
      if (!token) {
        alert("Token de autenticación no encontrado. Por favor, inicia sesión de nuevo.")
        return
      }
      const newMenuItem = {
        name: newItemName,
        description: newItemDescription,
        price: newItemPrice,
        image_url: newItemImageUrl,
      }
      await apiClient.createMenuItem(newMenuItem, token)
      alert("Elemento creado exitosamente!")
      setNewItemName("")
      setNewItemDescription("")
      setNewItemPrice(0)
      setNewItemImageUrl("")
      fetchMenuItems()
    } catch (err: any) {
      alert(`Error al crear elemento: ${err.message}`)
    }
  }

  const handleDeleteMenuItem = async (itemId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este elemento?")) {
      return
    }
    try {
      const token = localStorage.getItem("tubarresto_token")
      if (!token) {
        alert("Token de autenticación no encontrado. Por favor, inicia sesión de nuevo.")
        return
      }
      await apiClient.deleteMenuItem(itemId, token)
      alert("Elemento eliminado exitosamente!")
      fetchMenuItems()
    } catch (err: any) {
      alert(`Error al eliminar elemento: ${err.message}`)
    }
  }

  return (
    <div>
      <h2>Administración de Elementos del Menú</h2>

      <h3>Crear Nuevo Elemento</h3>
      <input type="text" placeholder="Nombre" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
      <input
        type="text"
        placeholder="Descripción"
        value={newItemDescription}
        onChange={(e) => setNewItemDescription(e.target.value)}
      />
      <input
        type="number"
        placeholder="Precio"
        value={newItemPrice}
        onChange={(e) => setNewItemPrice(Number(e.target.value))}
      />
      <input
        type="text"
        placeholder="URL de la Imagen"
        value={newItemImageUrl}
        onChange={(e) => setNewItemImageUrl(e.target.value)}
      />
      <button onClick={handleCreateMenuItem}>Crear Elemento</button>

      <h3>Lista de Elementos</h3>
      <ul>
        {menuItems.map((item) => (
          <li key={item.id}>
            {item.name} - ${item.price}
            <button onClick={() => handleDeleteMenuItem(item.id)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default MenuItemManagement
