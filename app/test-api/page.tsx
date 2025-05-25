"use client"

import { useState, useEffect } from "react"
import { testAPI, authAPI } from "@/lib/api"

export default function TestAPI() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [browserInfo, setBrowserInfo] = useState<any>(null)

  // Cargar información del navegador solo en el cliente
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBrowserInfo({
        userAgent: navigator.userAgent,
        language: navigator.language,
        onLine: navigator.onLine,
        cookieEnabled: navigator.cookieEnabled,
        location: window.location.href,
        protocol: window.location.protocol,
      })
    }
  }, [])

  const runTest = async (testName: string, testFunction: () => Promise<any>) => {
    setLoading(testName)
    try {
      const result = await testFunction()
      setResults((prev) => ({
        ...prev,
        [testName]: { success: true, data: result },
      }))
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [testName]: {
          success: false,
          error: error instanceof Error ? error.message : "Error desconocido",
          stack: error instanceof Error ? error.stack : undefined,
        },
      }))
    } finally {
      setLoading(null)
    }
  }

  const tests = [
    {
      name: "ping",
      label: "🏓 Ping básico al servidor",
      fn: () => testAPI.ping(),
    },
    {
      name: "status",
      label: "📊 Probar endpoint /status",
      fn: () => testAPI.status(),
    },
    {
      name: "cors",
      label: "🌐 Probar CORS",
      fn: async () => {
        const response = await fetch("https://tubarresto.somediave.com/api.php/status", {
          method: "OPTIONS",
        })
        return {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        }
      },
    },
    {
      name: "register",
      label: "📝 Probar registro",
      fn: () =>
        authAPI.register({
          name: "Test",
          apellido: "User",
          email: `test${Date.now()}@example.com`,
          telefono: "123456789",
          nombreRestaurante: "Restaurante Test",
          direccion: "Calle Test 123",
          ciudad: "Ciudad Test",
          password: "123456",
        }),
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">🔧 Diagnóstico de API - Tu Bar Resto</h1>

        {/* Información del navegador */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">🌐 Información del navegador</h2>
          {browserInfo ? (
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">{JSON.stringify(browserInfo, null, 2)}</pre>
          ) : (
            <p className="text-gray-500">Cargando información del navegador...</p>
          )}
        </div>

        {/* Información de la API */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">🔗 Configuración de la API</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>URL de la API:</strong>
              <br />
              <code className="bg-gray-100 p-1 rounded break-all">https://tubarresto.somediave.com/api.php</code>
            </div>
            <div>
              <strong>Protocolo:</strong>
              <br />
              <code className="bg-gray-100 p-1 rounded">
                {typeof window !== "undefined" ? window.location.protocol : "N/A"}
              </code>
            </div>
            <div>
              <strong>Token almacenado:</strong>
              <br />
              <code className="bg-gray-100 p-1 rounded text-xs">
                {typeof window !== "undefined" && localStorage.getItem("tubarresto_token") ? "Sí" : "No"}
              </code>
            </div>
            <div>
              <strong>Usuario almacenado:</strong>
              <br />
              <code className="bg-gray-100 p-1 rounded text-xs">
                {typeof window !== "undefined" && localStorage.getItem("tubarresto_user") ? "Sí" : "No"}
              </code>
            </div>
          </div>
        </div>

        {/* Pruebas */}
        <div className="grid gap-4 mb-8">
          {tests.map((test) => (
            <div key={test.name} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{test.label}</h3>
                <button
                  onClick={() => runTest(test.name, test.fn)}
                  disabled={loading === test.name}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
                >
                  {loading === test.name ? "Probando..." : "Probar"}
                </button>
              </div>

              {results[test.name] && (
                <div
                  className={`p-3 rounded ${
                    results[test.name].success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {results[test.name].success ? (
                    <div>
                      <p className="font-semibold">✅ Éxito</p>
                      <pre className="text-sm mt-2 overflow-auto max-h-40">
                        {JSON.stringify(results[test.name].data, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold">❌ Error</p>
                      <p className="text-sm mt-1">{results[test.name].error}</p>
                      {results[test.name].stack && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm">Ver stack trace</summary>
                          <pre className="text-xs mt-1 overflow-auto max-h-32">{results[test.name].stack}</pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Prueba manual */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">🔧 Prueba manual</h2>
          <p className="text-gray-600 mb-4">Si las pruebas automáticas fallan, puedes probar manualmente:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Abre las herramientas de desarrollador (F12)</li>
            <li>Ve a la pestaña "Network" o "Red"</li>
            <li>Ejecuta una prueba y observa las peticiones HTTP</li>
            <li>Verifica si hay errores CORS o de conectividad</li>
          </ol>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>💡 Tip:</strong> Si ves errores CORS, es posible que necesites configurar el servidor. Si ves
              errores 404, verifica que el archivo api.php existe en el servidor.
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="text-center space-x-4">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("tubarresto_token")
                localStorage.removeItem("tubarresto_user")
              }
              setResults({})
              alert("Datos locales limpiados")
            }}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            🗑️ Limpiar datos locales
          </button>

          <a href="/registro" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded inline-block">
            📝 Ir a Registro
          </a>

          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.open("https://tubarresto.somediave.com/api.php/status", "_blank")
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            🔗 Abrir API en nueva pestaña
          </button>
        </div>
      </div>
    </div>
  )
}
