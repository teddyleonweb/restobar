"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { ApiClient, type Table } from "@/lib/api-client"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table as ShadcnTable, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, QrCode, X, Loader2 } from "lucide-react"
import TableQrGenerator from "./table-qr-generator" // Importar el nuevo componente de QR

interface TableManagerProps {
  restaurantId: number
  restaurantSlug: string // NUEVO: Recibe el slug del restaurante
  onClose: () => void
}

export default function TableManager({ restaurantId, restaurantSlug, onClose }: TableManagerProps) {
  const [tables, setTables] = useState<Table[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddTableModal, setShowAddTableModal] = useState(false)
  const [showEditTableModal, setShowEditTableModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showQrGeneratorModal, setShowQrGeneratorModal] = useState(false)

  const [newTable, setNewTable] = useState({
    table_number: "",
    capacity: 0,
    location_description: "",
    // qr_code_url ya no se maneja aquí directamente para la adición inicial
  })
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null)
  const [qrGeneratorTableData, setQrGeneratorTableData] = useState<{
    tableId: number // Ahora siempre será un ID real
    tableNumber: string
    restaurantSlug: string
  } | null>(null)

  const fetchTables = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await ApiClient.getTables(restaurantId)
      if (response.success && response.data?.tables) {
        setTables(response.data.tables)
      } else {
        toast({
          title: "Error",
          description: response.error || "No se pudieron cargar las mesas.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching tables:", error)
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor para cargar las mesas.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    if (restaurantId) {
      fetchTables()
    }
  }, [restaurantId, fetchTables])

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTable.table_number || newTable.capacity <= 0) {
      toast({
        title: "Campos requeridos",
        description: "Número de mesa y capacidad son obligatorios.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // No enviamos qr_code_url en la creación inicial
      const response = await ApiClient.addTable({
        restaurant_id: restaurantId,
        table_number: newTable.table_number,
        capacity: newTable.capacity,
        location_description: newTable.location_description || null,
        qr_code_url: "", // Se envía vacío o un placeholder, se actualizará después
      })

      if (response.success && response.data?.table) {
        toast({
          title: "Mesa agregada",
          description: `Mesa ${response.data.table.tableNumber} agregada exitosamente. Ahora genera su QR.`,
        })
        setNewTable({ table_number: "", capacity: 0, location_description: "" })
        setShowAddTableModal(false)
        // Abrir el generador de QR para la mesa recién creada
        openQrGenerator(response.data.table)
        fetchTables() // Recargar la lista de mesas para mostrar la nueva
      } else {
        toast({
          title: "Error al agregar mesa",
          description: response.error || "Ocurrió un error desconocido.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding table:", error)
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor para agregar la mesa.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateTable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTable || !editingTable.tableNumber || editingTable.capacity <= 0) {
      toast({
        title: "Campos requeridos",
        description: "Número de mesa y capacidad son obligatorios.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await ApiClient.updateTable({
        id: editingTable.id,
        table_number: editingTable.tableNumber,
        capacity: editingTable.capacity,
        location_description: editingTable.locationDescription || null,
        is_active: editingTable.isActive,
        qr_code_url: editingTable.qrCodeUrl, // Se envía la URL del QR existente
      })

      if (response.success && response.data?.table) {
        toast({
          title: "Mesa actualizada",
          description: `Mesa ${response.data.table.tableNumber} actualizada exitosamente.`,
        })
        setEditingTable(null)
        setShowEditTableModal(false)
        fetchTables() // Recargar la lista de mesas
      } else {
        toast({
          title: "Error al actualizar mesa",
          description: response.error || "Ocurrió un error desconocido.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating table:", error)
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor para actualizar la mesa.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTable = async () => {
    if (!tableToDelete) return

    setIsLoading(true)
    try {
      const response = await ApiClient.deleteTable(tableToDelete.id)

      if (response.success) {
        toast({
          title: "Mesa eliminada",
          description: `Mesa ${tableToDelete.tableNumber} eliminada exitosamente.`,
        })
        setTableToDelete(null)
        setShowDeleteConfirm(false)
        fetchTables() // Recargar la lista de mesas
      } else {
        toast({
          title: "Error al eliminar mesa",
          description: response.error || "Ocurrió un error desconocido.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting table:", error)
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor para eliminar la mesa.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openAddModal = () => {
    setNewTable({ table_number: "", capacity: 0, location_description: "" })
    setShowAddTableModal(true)
  }

  const openEditModal = (table: Table) => {
    setEditingTable({ ...table })
    setShowEditTableModal(true)
  }

  const openDeleteConfirmModal = (table: Table) => {
    setTableToDelete(table)
    setShowDeleteConfirm(true)
  }

  // Modificado para siempre pasar un objeto Table existente
  const openQrGenerator = (table: Table) => {
    setQrGeneratorTableData({
      tableId: table.id,
      tableNumber: table.tableNumber,
      restaurantSlug: restaurantSlug, // Pasa el slug del restaurante
    })
    setShowQrGeneratorModal(true)
  }

  // Callback cuando el QR es subido desde TableQrGenerator
  const handleQrCodeUploaded = async (tableId: number, qrCodeUrl: string) => {
    setIsLoading(true)
    try {
      const response = await ApiClient.updateTable({
        id: tableId,
        qr_code_url: qrCodeUrl,
      })
      if (response.success) {
        toast({
          title: "QR Guardado",
          description: "La URL del QR ha sido guardada en la mesa.",
        })
        fetchTables() // Recargar para mostrar la URL del QR
      } else {
        toast({
          title: "Error al guardar QR",
          description: response.error || "Ocurrió un error desconocido.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating table with QR URL:", error)
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor para guardar la URL del QR.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setShowQrGeneratorModal(false) // Cerrar el modal del generador de QR
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-500 mx-auto mb-4" />
          <p className="text-gray-700">Cargando mesas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h3 className="text-xl font-bold text-gray-900 font-playfair">Gestionar Mesas</h3>
            <p className="text-sm text-gray-600">Añade, edita y elimina las mesas de tu restaurante.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
          <div className="mb-4 flex justify-end">
            <Button onClick={openAddModal} className="bg-red-500 hover:bg-red-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Mesa
            </Button>
          </div>

          {tables.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <p>No hay mesas registradas para este restaurante.</p>
              <p>Haz clic en "Agregar Mesa" para empezar.</p>
            </div>
          ) : (
            <ShadcnTable>
              <TableHeader>
                <TableRow>
                  <TableHead>Número de Mesa</TableHead>
                  <TableHead>Capacidad</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>QR</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables.map((table) => (
                  <TableRow key={table.id}>
                    <TableCell className="font-medium">{table.tableNumber}</TableCell>
                    <TableCell>{table.capacity}</TableCell>
                    <TableCell>{table.locationDescription || "N/A"}</TableCell>
                    <TableCell>
                      {table.qrCodeUrl ? (
                        <a
                          href={table.qrCodeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-500 hover:underline flex items-center"
                        >
                          <QrCode className="h-4 w-4 mr-1" /> Ver QR
                        </a>
                      ) : (
                        <span className="text-gray-400">No generado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          table.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {table.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openQrGenerator(table)}
                          title="Generar/Ver QR"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => openEditModal(table)} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => openDeleteConfirmModal(table)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </ShadcnTable>
          )}
        </div>

        {/* Modal para agregar mesa */}
        <Dialog open={showAddTableModal} onOpenChange={setShowAddTableModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Agregar Nueva Mesa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTable} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="table_number" className="text-right">
                  Número de Mesa *
                </Label>
                <Input
                  id="table_number"
                  value={newTable.table_number}
                  onChange={(e) => setNewTable({ ...newTable, table_number: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="capacity" className="text-right">
                  Capacidad *
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  value={newTable.capacity}
                  onChange={(e) => setNewTable({ ...newTable, capacity: Number.parseInt(e.target.value) || 0 })}
                  className="col-span-3"
                  min="1"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location_description" className="text-right">
                  Descripción
                </Label>
                <Input
                  id="location_description"
                  value={newTable.location_description}
                  onChange={(e) => setNewTable({ ...newTable, location_description: e.target.value })}
                  className="col-span-3"
                />
              </div>
              {/* El campo QR URL se elimina de aquí, se gestiona después de crear la mesa */}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddTableModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Agregar Mesa
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal para editar mesa */}
        <Dialog open={showEditTableModal} onOpenChange={setShowEditTableModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Mesa</DialogTitle>
            </DialogHeader>
            {editingTable && (
              <form onSubmit={handleUpdateTable} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_table_number" className="text-right">
                    Número de Mesa *
                  </Label>
                  <Input
                    id="edit_table_number"
                    value={editingTable.tableNumber}
                    onChange={(e) => setEditingTable({ ...editingTable, tableNumber: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_capacity" className="text-right">
                    Capacidad *
                  </Label>
                  <Input
                    id="edit_capacity"
                    type="number"
                    value={editingTable.capacity}
                    onChange={(e) =>
                      setEditingTable({ ...editingTable, capacity: Number.parseInt(e.target.value) || 0 })
                    }
                    className="col-span-3"
                    min="1"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_location_description" className="text-right">
                    Descripción
                  </Label>
                  <Input
                    id="edit_location_description"
                    value={editingTable.locationDescription || ""}
                    onChange={(e) => setEditingTable({ ...editingTable, locationDescription: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_qr_code_url" className="text-right">
                    URL QR
                  </Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input
                      id="edit_qr_code_url"
                      value={editingTable.qrCodeUrl || ""}
                      readOnly
                      placeholder="Genera o sube el QR"
                      className="flex-grow"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => openQrGenerator(editingTable)}>
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_is_active" className="text-right">
                    Activa
                  </Label>
                  <input
                    id="edit_is_active"
                    type="checkbox"
                    checked={editingTable.isActive}
                    onChange={(e) => setEditingTable({ ...editingTable, isActive: e.target.checked })}
                    className="col-span-3 h-4 w-4"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowEditTableModal(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Actualizar Mesa
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de confirmación de eliminación */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirmar Eliminación</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700 mb-4">
                ¿Estás seguro de que deseas eliminar la mesa{" "}
                <span className="font-semibold">{tableToDelete?.tableNumber}</span>?
              </p>
              <p className="text-sm text-red-600">Esta acción no se puede deshacer.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteTable} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal del generador de QR */}
        {showQrGeneratorModal && qrGeneratorTableData && (
          <TableQrGenerator
            restaurantId={restaurantId}
            restaurantSlug={qrGeneratorTableData.restaurantSlug} // Pasa el slug
            tableId={qrGeneratorTableData.tableId} // Pasa el ID real de la mesa
            tableNumber={qrGeneratorTableData.tableNumber}
            onQrCodeUploaded={handleQrCodeUploaded} // Callback para actualizar la mesa
            onClose={() => setShowQrGeneratorModal(false)}
          />
        )}
      </div>
    </div>
  )
}
