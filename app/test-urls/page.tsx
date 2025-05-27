"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Copy, ExternalLink } from "lucide-react"
import { buildApiUrl, apiEndpoints, apiRequest } from "@/lib/api-utils"

export default function TestUrlsPage() {
  const [testResults, setTestResults] = useState<Record<string, any>>({})

  const urls = {
    "Status Endpoint": apiEndpoints.status(),
    "Test Endpoint": apiEndpoints.test(),
    "Register Endpoint": apiEndpoints.register(),
    "Login Endpoint": apiEndpoints.login(),
    "Custom Endpoint": apiEndpoints.custom("custom_action", { param1: "value1" }),
    "Manual Build": buildApiUrl("/api.php", { action: "manual", test: "true" }),
  }

  const testUrl = async (name: string, url: string) => {
    setTestResults((prev) => ({ ...prev, [name]: { status: "testing" } }))

    const result = await apiRequest(url, { method: "GET" })

    setTestResults((prev) => ({
      ...prev,
      [name]: {
        status: result.success ? "success" : "error",
        data: result.success ? result.data : result.error,
        url: url,
      },
    }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Link href="/" className="flex items-center text-red-500 hover:text-red-600 transition-colors mb-4">
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span>Volver al inicio</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Prueba de URLs de API</h1>
          <p className="text-gray-600">Verificar que las URLs se construyan correctamente</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">URLs Generadas</h2>

          <div className="space-y-4">
            {Object.entries(urls).map(([name, url]) => (
              <div key={name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(url)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Copiar URL"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Abrir en nueva pestaña"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => testUrl(name, url)}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                    >
                      Probar
                    </button>
                  </div>
                </div>

                <code className="block bg-gray-100 p-2 rounded text-sm break-all">{url}</code>

                {testResults[name] && (
                  <div className="mt-2">
                    <div
                      className={`text-sm ${
                        testResults[name].status === "success"
                          ? "text-green-600"
                          : testResults[name].status === "error"
                            ? "text-red-600"
                            : "text-blue-600"
                      }`}
                    >
                      Estado: {testResults[name].status}
                    </div>
                    {testResults[name].data && (
                      <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(testResults[name].data, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">🔒 Problema de SSL detectado</h3>
          <p className="text-sm text-yellow-700 mb-2">El sitio muestra un error de certificado SSL. Soluciones:</p>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Instalar certificado SSL en el hosting (recomendado)</li>
            <li>• Usar HTTP temporalmente para pruebas (no recomendado para producción)</li>
            <li>• Verificar configuración de WordPress y hosting</li>
            <li>• Contactar al proveedor de hosting para configurar SSL</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
