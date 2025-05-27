"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface TestResult {
  name: string
  status: "success" | "error" | "warning" | "pending"
  message: string
  details?: string
}

export default function DiagnosticPage() {
  const [tests, setTests] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runDiagnostics = async () => {
    setIsRunning(true)
    setTests([])

    const newTests: TestResult[] = []

    // Test 1: Variables de entorno
    newTests.push({
      name: "Variables de entorno",
      status: "pending",
      message: "Verificando configuración...",
    })
    setTests([...newTests])

    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    if (apiUrl && appUrl) {
      newTests[0] = {
        name: "Variables de entorno",
        status: "success",
        message: "Variables configuradas correctamente",
        details: `API_URL: ${apiUrl}, APP_URL: ${appUrl}`,
      }
    } else {
      newTests[0] = {
        name: "Variables de entorno",
        status: "error",
        message: "Variables de entorno faltantes",
        details: `API_URL: ${apiUrl || "NO DEFINIDA"}, APP_URL: ${appUrl || "NO DEFINIDA"}`,
      }
    }
    setTests([...newTests])

    // Test 2: Conectividad básica al dominio
    newTests.push({
      name: "Conectividad al servidor",
      status: "pending",
      message: "Probando conexión al servidor...",
    })
    setTests([...newTests])

    try {
      const baseUrl = apiUrl || "https://tubarresto.somediave.com/api"
      const domain = new URL(baseUrl).origin

      const response = await fetch(domain, {
        method: "HEAD",
        mode: "no-cors",
      })

      newTests[1] = {
        name: "Conectividad al servidor",
        status: "success",
        message: "Servidor accesible",
        details: `Dominio: ${domain}`,
      }
    } catch (error) {
      newTests[1] = {
        name: "Conectividad al servidor",
        status: "error",
        message: "No se puede conectar al servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      }
    }
    setTests([...newTests])

    // Test 3: Verificar archivo API
    newTests.push({
      name: "Archivo API",
      status: "pending",
      message: "Verificando existencia del archivo API...",
    })
    setTests([...newTests])

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://tubarresto.somediave.com/api"
      const testUrl = `${apiUrl}/api.php?action=status`

      console.log("🧪 Probando URL:", testUrl)

      const response = await fetch(testUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        mode: "cors",
      })

      console.log("📊 Respuesta:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      })

      const responseText = await response.text()
      console.log("📄 Contenido:", responseText.substring(0, 200))

      if (response.status === 403) {
        newTests[2] = {
          name: "Archivo API",
          status: "error",
          message: "Error 403: Acceso prohibido",
          details: `El servidor rechaza la conexión. Posibles causas: permisos del archivo, configuración del servidor, o restricciones de acceso. Respuesta: ${responseText.substring(0, 100)}`,
        }
      } else if (response.status === 404) {
        newTests[2] = {
          name: "Archivo API",
          status: "error",
          message: "Error 404: Archivo no encontrado",
          details: `El archivo api.php no existe en la ruta especificada: ${testUrl}`,
        }
      } else if (response.ok) {
        try {
          const result = JSON.parse(responseText)
          newTests[2] = {
            name: "Archivo API",
            status: "success",
            message: "API responde correctamente",
            details: `Status: ${response.status}, Respuesta JSON válida`,
          }
        } catch (parseError) {
          newTests[2] = {
            name: "Archivo API",
            status: "warning",
            message: "API responde pero no es JSON válido",
            details: `Status: ${response.status}, Contenido: ${responseText.substring(0, 100)}...`,
          }
        }
      } else {
        newTests[2] = {
          name: "Archivo API",
          status: "error",
          message: `Error HTTP ${response.status}`,
          details: `${response.statusText} - ${responseText.substring(0, 100)}`,
        }
      }
    } catch (error) {
      newTests[2] = {
        name: "Archivo API",
        status: "error",
        message: "Error de conexión",
        details: error instanceof Error ? error.message : "Error desconocido",
      }
    }
    setTests([...newTests])

    // Test 4: Probar diferentes endpoints
    newTests.push({
      name: "Endpoints alternativos",
      status: "pending",
      message: "Probando rutas alternativas...",
    })
    setTests([...newTests])

    const alternativeUrls = [
      "https://tubarresto.somediave.com/api.php?action=status",
      "https://tubarresto.somediave.com/api/api.php?action=status",
      "https://tubarresto.somediave.com/wp-content/themes/tubarresto/api.php?action=status",
    ]

    let foundWorking = false
    let workingUrl = ""

    for (const url of alternativeUrls) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          mode: "cors",
        })

        if (response.ok) {
          foundWorking = true
          workingUrl = url
          break
        }
      } catch (error) {
        // Continuar con la siguiente URL
      }
    }

    if (foundWorking) {
      newTests[3] = {
        name: "Endpoints alternativos",
        status: "success",
        message: "Encontrada ruta alternativa funcional",
        details: `URL funcional: ${workingUrl}`,
      }
    } else {
      newTests[3] = {
        name: "Endpoints alternativos",
        status: "error",
        message: "Ninguna ruta alternativa funciona",
        details: `URLs probadas: ${alternativeUrls.join(", ")}`,
      }
    }
    setTests([...newTests])

    // Test 5: Información del entorno
    newTests.push({
      name: "Información del entorno",
      status: "success",
      message: "Información recopilada",
      details: `
        User Agent: ${navigator.userAgent}
        Timestamp: ${new Date().toISOString()}
        Location: ${window.location.href}
        Referrer: ${document.referrer || "Directo"}
      `,
    })
    setTests([...newTests])

    setIsRunning(false)
  }

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case "pending":
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    }
  }

  const getStatusColor = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return "border-green-200 bg-green-50"
      case "error":
        return "border-red-200 bg-red-50"
      case "warning":
        return "border-yellow-200 bg-yellow-50"
      case "pending":
        return "border-blue-200 bg-blue-50"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Link href="/" className="flex items-center text-red-500 hover:text-red-600 transition-colors mb-4">
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span>Volver al inicio</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Diagnóstico del Sistema</h1>
          <p className="text-gray-600">Herramienta para identificar problemas de conectividad y configuración</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Ejecutar Diagnóstico</h2>
            <button
              onClick={runDiagnostics}
              disabled={isRunning}
              className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors"
            >
              {isRunning ? "Ejecutando..." : "Iniciar Diagnóstico"}
            </button>
          </div>

          {tests.length > 0 && (
            <div className="space-y-4">
              {tests.map((test, index) => (
                <div key={index} className={`border rounded-lg p-4 ${getStatusColor(test.status)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{test.name}</h3>
                    {getStatusIcon(test.status)}
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{test.message}</p>
                  {test.details && (
                    <details className="text-xs text-gray-600">
                      <summary className="cursor-pointer hover:text-gray-800">Ver detalles</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                        {test.details}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Información de Configuración Actual</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>API URL:</strong>
              <br />
              <code className="bg-gray-100 px-2 py-1 rounded">{process.env.NEXT_PUBLIC_API_URL || "No definida"}</code>
            </div>
            <div>
              <strong>APP URL:</strong>
              <br />
              <code className="bg-gray-100 px-2 py-1 rounded">{process.env.NEXT_PUBLIC_APP_URL || "No definida"}</code>
            </div>
            <div>
              <strong>Entorno:</strong>
              <br />
              <code className="bg-gray-100 px-2 py-1 rounded">{process.env.NODE_ENV || "development"}</code>
            </div>
            <div>
              <strong>URL actual:</strong>
              <br />
              <code className="bg-gray-100 px-2 py-1 rounded">
                {typeof window !== "undefined" ? window.location.href : "SSR"}
              </code>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">💡 Soluciones comunes para error 403:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Verificar que el archivo api.php existe en el servidor</li>
            <li>• Comprobar permisos del archivo (debe ser 644 o 755)</li>
            <li>• Revisar configuración de CORS en el servidor</li>
            <li>• Verificar que las variables de entorno estén configuradas</li>
            <li>• Comprobar si hay restricciones de IP o geolocalización</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
