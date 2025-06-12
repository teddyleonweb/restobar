"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import QRCode from "react-qr-code" // Usando react-qr-code
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { ApiClient } from "@/lib/api-client"
import { Download, UploadCloud, Loader2, X } from "lucide-react"

interface TableQrGeneratorProps {
  restaurantId: number
  restaurantSlug: string
  tableId: number
  tableNumber: string
  onQrCodeUploaded: (tableId: number, qrCodeUrl: string) => void
  onClose: () => void
  autoUpload?: boolean // NUEVO: Propiedad para subida automática
}

export default function TableQrGenerator({
  restaurantId,
  restaurantSlug,
  tableId,
  tableNumber,
  onQrCodeUploaded,
  onClose,
  autoUpload,
}: TableQrGeneratorProps) {
  const qrCodeRef = useRef<SVGSVGElement>(null) // Ref ahora apunta a SVG
  const [qrData, setQrData] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  // Helper function to convert SVG to Canvas
  const convertSvgToCanvas = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    if (!qrCodeRef.current) {
      return null
    }

    const svgElement = qrCodeRef.current
    const svgString = new XMLSerializer().serializeToString(svgElement)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      return null
    }

    const img = new Image()
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(svgBlob)

    img.src = url
    img.crossOrigin = "anonymous" // Importante para CORS si SVG contiene recursos externos

    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url) // Limpiar la URL del objeto
        resolve(canvas)
      }
      img.onerror = (error) => {
        console.error("Error loading SVG into image:", error)
        URL.revokeObjectURL(url)
        resolve(null)
      }
    })
  }, [])

  const handleUploadQr = useCallback(async () => {
    setIsLoading(true)
    const canvas = await convertSvgToCanvas()

    if (!canvas) {
      toast({
        title: "Error",
        description: "No se pudo generar el QR para subir.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast({
            title: "Error",
            description: "Error al convertir QR a imagen.",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }

        const formData = new FormData()
        formData.append("qr_image", blob, `mesa-${tableNumber}-qr.png`)
        formData.append("restaurant_id", String(restaurantId))
        // También puedes enviar qr_data si tu API lo necesita para guardar el contenido del QR
        formData.append("qr_data", qrData)

        const response = await ApiClient.uploadQrImage(formData)

        if (response.success && response.data?.qr_image_url) {
          toast({
            title: "QR Subido",
            description: "El código QR ha sido subido exitosamente.",
          })
          // Llama al callback pasando el tableId y la URL del QR
          onQrCodeUploaded(tableId, response.data.qr_image_url)
        } else {
          toast({
            title: "Error al subir QR",
            description: response.error || "Ocurrió un error desconocido.",
            variant: "destructive",
          })
        }
      }, "image/png")
    } catch (error) {
      console.error("Error uploading QR:", error)
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor para subir el QR.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [convertSvgToCanvas, qrData, restaurantId, tableId, tableNumber, onQrCodeUploaded])

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const data = `${baseUrl}/order/${restaurantSlug}/${tableId}`
    setQrData(data)

    if (autoUpload && data) {
      // Pequeño retraso para asegurar que el QR se ha renderizado en el SVG ref
      const timer = setTimeout(() => {
        handleUploadQr()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [restaurantSlug, tableId, autoUpload, handleUploadQr])

  const handleDownloadQr = async () => {
    const canvas = await convertSvgToCanvas()
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png")
      const downloadLink = document.createElement("a")
      downloadLink.href = pngUrl
      downloadLink.download = `mesa-${tableNumber}-qr.png`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      toast({
        title: "Descarga Exitosa",
        description: `El QR de la mesa ${tableNumber} ha sido descargado.`,
      })
    } else {
      toast({
        title: "Error",
        description: "No se pudo generar el QR para descargar.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-lg">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h3 className="text-xl font-bold text-gray-900 font-playfair">Generar QR para Mesa {tableNumber}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-md bg-gray-50">
            {qrData ? (
              <QRCode
                value={qrData}
                size={256}
                level="H" // Propiedad de nivel de corrección de error para react-qr-code
                ref={qrCodeRef} // Ref ahora apunta al elemento SVG
                className="p-2 bg-white rounded-md"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-gray-400 border border-dashed rounded-md">
                Cargando datos QR...
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2 text-center break-all">
              Datos del QR: <span className="font-mono">{qrData}</span>
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleDownloadQr} disabled={!qrData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Descargar QR
            </Button>
            <Button onClick={handleUploadQr} disabled={!qrData || isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
              {isLoading ? "Subiendo..." : "Subir QR al Servidor"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
