"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Globe,
  Database,
  FileText,
  Settings,
  Info,
} from "lucide-react"
import { getApiUrl, getCustomApiUrl } from "@/lib/api-config"
import { ApiClient } from "@/lib/api-client"

interface DiagnosticResult {
  name: string
  status: "success" | "error" | "warning" | "loading"
  message: string
  details?: string
  url?: string
}

export default function Diagnostico() {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const updateResult = (name: string, updates: Partial<DiagnosticResult>) => {
    setResults((prev) => prev.map((result) => (result.name === name ? { ...result, ...updates } : result)))
  }

  const runDiagnostics = async () => {
    setIsRunning(true)

    // Initialize all tests
    const initialTests: DiagnosticResult[] = [
      { name: "Variables de Entorno", status: "loading", message: "Verificando configuración..." },
      { name: "Conectividad del Servidor", status: "loading", message: "Probando conexión..." },
      { name: "Archivo API", status: "loading", message: "Verificando existencia del archivo..." },
      { name: "Endpoint de Estado", status: "loading", message: "Probando endpoint de estado..." },
      { name: "Endpoint de Login", status: "loading", message: "Probando endpoint de login..." },
      { name: "Información del Entorno", status: "loading", message: "Recopilando información..." },
    ]

    setResults(initialTests)

    // Test 1: Environment Variables
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL

      if (apiBaseUrl) {
        updateResult("Variables de Entorno", {
          status: "success",
          message: `✅ Variables configuradas correctamente`,
          details: `API Base: ${apiBaseUrl}\nAPI URL: ${apiUrl || "No definida"}\nApp URL: ${appUrl || "No definida"}`,
          url: apiBaseUrl,
        })
      } else {
        updateResult("Variables de Entorno", {
          status: "error",
          message: "❌ NEXT_PUBLIC_API_BASE_URL no está definida",
          details: "Esta variable es requerida para el funcionamiento de la aplicación",
        })
      }
    } catch (error) {
      updateResult("Variables de Entorno", {
        status: "error",
        message: "❌ Error al verificar variables de entorno",
        details: error instanceof Error ? error.message : "Error desconocido",
      })
    }

    // Test 2: Server Connectivity
    try {
      const baseUrl = getCustomApiUrl("")
      const response = await fetch(baseUrl, {
        method: "HEAD",
        mode: "no-cors",
      })

      updateResult("Conectividad del Servidor", {
        status: "success",
        message: "✅ Servidor accesible",
        details: `Conectado a: ${baseUrl}`,
        url: baseUrl,
      })
    } catch (error) {
      updateResult("Conectividad del Servidor", {
        status: "error",
        message: "❌ No se puede conectar al servidor",
        details: error instanceof Error ? error.message : "Error de conexión",
        url: getCustomApiUrl(""),
      })
    }

    // Test 3: API File Existence
    try {
      const apiFileUrl = getCustomApiUrl("/api.php")
      const response = await fetch(apiFileUrl, {
        method: "GET",
        mode: "cors",
        headers: { Accept: "application/json" },
      })

      if (response.ok) {
        updateResult("Archivo API", {
          status: "success",
          message: "✅ Archivo api.php encontrado",
          details: `Status: ${response.status} ${response.statusText}`,
          url: apiFileUrl,
        })
      } else {
        updateResult("Archivo API", {
          status: "error",
          message: `❌ Error HTTP ${response.status}`,
          details: `${response.statusText} - Verifica que api.php existe en el servidor`,
          url: apiFileUrl,
        })
      }
    } catch (error) {
      updateResult("Archivo API", {
        status: "error",
        message: "❌ No se puede acceder a api.php",
        details: error instanceof Error ? error.message : "Error desconocido",
        url: getCustomApiUrl("/api.php"),
      })
    }

    // Test 4: Status Endpoint
    try {
      const result = await ApiClient.checkStatus()

      if (result.success) {
        updateResult("Endpoint de Estado", {
          status: "success",
          message: "✅ API funcionando correctamente",
          details: `DB: ${result.data?.database?.users_count || 0} usuarios, ${result.data?.database?.restaurants_count || 0} restaurantes`,
          url: getApiUrl("STATUS"),
        })
      } else {
        updateResult("Endpoint de Estado", {
          status: "error",
          message: "❌ API responde pero con error",
          details: result.error || "Error desconocido",
          url: getApiUrl("STATUS"),
        })
      }
    } catch (error) {
      updateResult("Endpoint de Estado", {
        status: "error",
        message: "❌ Error en endpoint de estado",
        details: error instanceof Error ? error.message : "Error desconocido",
        url: getApiUrl("STATUS"),
      })
    }

    // Test 5: Login Endpoint
    try {
      const response = await fetch(getApiUrl("LOGIN"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        body: JSON.stringify({
          email: "test@test.com",
          password: "invalid",
        }),
      })

      const responseText = await response.text()

      if (response.status === 401 || response.status === 400) {
        // Expected error for invalid credentials
        updateResult("Endpoint de Login", {
          status: "success",
          message: "✅ Endpoint de login funcional",
          details: "Responde correctamente a credenciales inválidas",
          url: getApiUrl("LOGIN"),
        })
      } else if (response.ok) {
        updateResult("Endpoint de Login", {
          status: "warning",
          message: "⚠️ Login responde OK (inesperado)",
          details: "El endpoint responde exitosamente con credenciales de prueba",
          url: getApiUrl("LOGIN"),
        })
      } else {
        updateResult("Endpoint de Login", {
          status: "error",
          message: `❌ Error HTTP ${response.status}`,
          details: responseText.substring(0, 200),
          url: getApiUrl("LOGIN"),
        })
      }
    } catch (error) {
      updateResult("Endpoint de Login", {
        status: "error",
        message: "❌ Error en endpoint de login",
        details: error instanceof Error ? error.message : "Error desconocido",
        url: getApiUrl("LOGIN"),
      })
    }

    // Test 6: Environment Information
    try {
      const envInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
        apiUrl: process.env.NEXT_PUBLIC_API_URL,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
      }

      updateResult("Información del Entorno", {
        status: "success",
        message: "✅ Información recopilada",
        details: Object.entries(envInfo)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n"),
      })
    } catch (error) {
      updateResult("Información del Entorno", {
        status: "error",
        message: "❌ Error al recopilar información",
        details: error instanceof Error ? error.message : "Error desconocido",
      })
    }

    setIsRunning(false)
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const getStatusIcon = (status: DiagnosticResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case "loading":
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <Info className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: DiagnosticResult["status"]) => {
    switch (status) {
      case "success":
        return "border-green-200 bg-green-50"
      case "error":
        return "border-red-200 bg-red-50"
      case "warning":
        return "border-yellow-200 bg-yellow-50"
      case "loading":
        return "border-blue-200 bg-blue-50"
      default:
        return "border-gray-200 bg-gray-50"
    }
  }

  const getTestIcon = (name: string) => {
    switch (name) {
      case "Variables de Entorno":
        return <Settings className="w-5 h-5 text-gray-600" />
      case "Conectividad del Servidor":
        return <Globe className="w-5 h-5 text-gray-600" />
      case "Archivo API":
        return <FileText className="w-5 h-5 text-gray-600" />
      case "Endpoint de Estado":
        return <Database className="w-5 h-5 text-gray-600" />
      case "Endpoint de Login":
        return <Database className="w-5 h-5 text-gray-600" />
      case "Información del Entorno":
        return <Info className="w-5 h-5 text-gray-600" />
      default:
        return <Info className="w-5 h-5 text-gray-600" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-lato">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Diagnóstico del Sistema</h1>
            </div>
            <Link href="/login" className="flex items-center text-gray-700 hover:text-red-500 transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span>Volver al Login</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Diagnóstico de Conectividad API</h2>
            <p className="text-gray-600 mb-4">
              Esta página verifica la conectividad y configuración de la API de Tu Bar Resto.
            </p>

            <div className="flex items-center space-x-4">
              <button
                onClick={runDiagnostics}
                disabled={isRunning}
                className="flex items-center bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
                {isRunning ? "Ejecutando..." : "Ejecutar Diagnóstico"}
              </button>

              <div className="text-sm text-gray-500">Última ejecución: {new Date().toLocaleTimeString()}</div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className={`border rounded-lg p-6 ${getStatusColor(result.status)}`}>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">{getTestIcon(result.name)}</div>

                  <div className="flex-grow">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{result.name}</h3>
                      {getStatusIcon(result.status)}
                    </div>

                    <p className="text-gray-700 mb-2">{result.message}</p>

                    {result.url && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-600">URL: </span>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{result.url}</code>
                      </div>
                    )}

                    {result.details && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                          Ver detalles
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                          {result.details}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Common Solutions */}
          <div className="mt-12 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Soluciones Comunes para Error 403</h3>
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h4 className="font-semibold text-gray-900">1. Verificar archivo API</h4>
                <p>
                  Asegúrate de que el archivo <code className="bg-gray-100 px-1 rounded">api.php</code> existe en el
                  servidor en la ruta correcta.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900">2. Permisos del archivo</h4>
                <p>El archivo debe tener permisos de lectura (644 o 755) para que el servidor web pueda accederlo.</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900">3. Configuración CORS</h4>
                <p>Verifica que el servidor permita solicitudes CORS desde el dominio de la aplicación.</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900">4. Configuración del servidor</h4>
                <p>Algunos servidores pueden bloquear solicitudes a archivos .php por configuración de seguridad.</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900">5. URL correcta</h4>
                <p>
                  La URL debe ser exactamente:{" "}
                  <code className="bg-gray-100 px-1 rounded">https://tubarresto.somediave.com/api.php</code>
                </p>
              </div>
            </div>
          </div>

          {/* API Configuration Info */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">Configuración Actual de la API</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800">Base URL:</span>
                <code className="block bg-white px-2 py-1 rounded mt-1">
                  {process.env.NEXT_PUBLIC_API_BASE_URL || "No definida"}
                </code>
              </div>
              <div>
                <span className="font-medium text-blue-800">Login URL:</span>
                <code className="block bg-white px-2 py-1 rounded mt-1">{getApiUrl("LOGIN")}</code>
              </div>
              <div>
                <span className="font-medium text-blue-800">Status URL:</span>
                <code className="block bg-white px-2 py-1 rounded mt-1">{getApiUrl("STATUS")}</code>
              </div>
              <div>
                <span className="font-medium text-blue-800">Upload URL:</span>
                <code className="block bg-white px-2 py-1 rounded mt-1">{getApiUrl("UPLOAD_IMAGE")}</code>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
