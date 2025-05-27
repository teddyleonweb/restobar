"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Facebook, Instagram, Twitter, ArrowLeft, Eye, EyeOff } from "lucide-react"

export default function Login() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      setMessage({ type: "error", text: "Por favor completa todos los campos" })
      return
    }

    setIsLoading(true)
    setMessage({ type: "", text: "" })

    try {
      // Usar la variable de entorno centralizada
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://tubarresto.somediave.com"
      const fullUrl = `${apiUrl}/api.php?action=login`

      console.log("🔄 Intentando login...")
      console.log("📍 URL:", fullUrl)
      console.log("📧 Email:", formData.email)
      console.log("🔑 Password length:", formData.password.length)

      const requestBody = {
        email: formData.email,
        password: formData.password,
      }

      console.log("📤 Enviando datos:", requestBody)

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        body: JSON.stringify(requestBody),
      })

      console.log("📥 Respuesta recibida:")
      console.log("   Status:", response.status)
      console.log("   StatusText:", response.statusText)
      console.log("   Headers:", Object.fromEntries(response.headers.entries()))

      // Leer el contenido de la respuesta
      const responseText = await response.text()
      console.log("📄 Contenido de respuesta:", responseText)

      if (!response.ok) {
        // Intentar parsear como JSON para obtener más información
        try {
          const errorData = JSON.parse(responseText)
          console.log("❌ Error parseado:", errorData)

          if (errorData.error) {
            throw new Error(errorData.error)
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
        } catch (parseError) {
          console.log("❌ No se pudo parsear error como JSON")
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${responseText.substring(0, 200)}`)
        }
      }

      // Verificar que la respuesta sea JSON válido
      let result
      try {
        result = JSON.parse(responseText)
        console.log("✅ JSON parseado:", result)
      } catch (parseError) {
        console.error("❌ Error parseando JSON:", parseError)
        throw new Error("El servidor no devolvió JSON válido: " + responseText.substring(0, 200))
      }

      if (result.success) {
        console.log("🎉 Login exitoso!")

        // Guardar datos del usuario en localStorage
        localStorage.setItem("tubarresto_user", JSON.stringify(result.data.user))
        localStorage.setItem("tubarresto_token", result.data.token)

        if (result.data.restaurants) {
          localStorage.setItem("tubarresto_restaurants", JSON.stringify(result.data.restaurants))
        }

        setMessage({
          type: "success",
          text: `¡Bienvenido ${result.data.user.first_name}!`,
        })

        // Redireccionar al dashboard
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
      } else {
        console.log("❌ Login fallido:", result.error)
        setMessage({ type: "error", text: result.error || "Error en el inicio de sesión" })
      }
    } catch (error) {
      console.error("💥 Error completo:", error)

      let errorMessage = "Error desconocido"

      if (error instanceof TypeError) {
        if (error.message.includes("NetworkError") || error.message.includes("fetch")) {
          errorMessage = "❌ Error de conexión. Verifica que el archivo API existe en el servidor."
        } else {
          errorMessage = `❌ Error de red: ${error.message}`
        }
      } else if (error instanceof Error) {
        errorMessage = `❌ ${error.message}`
      }

      setMessage({ type: "error", text: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  const testConnection = async () => {
    try {
      setMessage({ type: "", text: "🔄 Probando conexión..." })

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://tubarresto.somediave.com"
      const testUrl = `${apiUrl}/api.php?action=status`

      console.log("🧪 Probando conexión a:", testUrl)

      const response = await fetch(testUrl, {
        method: "GET",
        mode: "cors",
        headers: {
          Accept: "application/json",
        },
      })

      console.log("📊 Test - Status:", response.status)
      console.log("📊 Test - Headers:", Object.fromEntries(response.headers.entries()))

      const responseText = await response.text()
      console.log("📊 Test - Contenido:", responseText)

      if (response.ok) {
        try {
          const result = JSON.parse(responseText)
          if (result.success) {
            setMessage({
              type: "success",
              text: `✅ API funcionando. DB: ${result.data.database.users_count} usuarios, ${result.data.database.restaurants_count} restaurantes`,
            })
          } else {
            setMessage({ type: "error", text: `❌ Error API: ${result.error}` })
          }
        } catch (parseError) {
          setMessage({
            type: "error",
            text: `❌ Respuesta no es JSON válido: ${responseText.substring(0, 100)}...`,
          })
        }
      } else {
        setMessage({
          type: "error",
          text: `❌ Error HTTP ${response.status}: ${response.statusText}${responseText ? " - " + responseText.substring(0, 100) : ""}`,
        })
      }
    } catch (error) {
      console.error("💥 Error test conexión:", error)
      if (error instanceof TypeError && error.message.includes("fetch")) {
        setMessage({
          type: "error",
          text: "❌ No se puede conectar. Verifica que api.php existe en el servidor",
        })
      } else {
        setMessage({ type: "error", text: `❌ Error: ${error}` })
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen font-lato">
      {/* Header/Navigation */}
      <header className="bg-white shadow sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center animate-fade-in">
              <div className="text-left">
                <Image
                  src="https://tubarresto.com/wp-content/uploads/2025/05/cropped-cropped-cropped-ChatGPT-Image-9-may-2025-12_44_56-a.m-1-101x49.png"
                  alt="Tu Bar Resto Logo"
                  width={101}
                  height={49}
                  className="h-auto"
                  unoptimized={true}
                />
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <Link
                href="/registro"
                className="text-gray-700 hover:text-red-500 transition-colors duration-300 animate-fade-in animate-delay-200"
              >
                <span>Registrarse</span>
              </Link>
              <div className="flex items-center space-x-4 animate-fade-in animate-delay-300">
                <Link
                  href="#"
                  aria-label="Facebook"
                  className="text-gray-500 hover:text-red-500 transition-colors duration-300"
                >
                  <Facebook className="w-5 h-5 icon-hover-effect" />
                </Link>
                <Link
                  href="#"
                  aria-label="Instagram"
                  className="text-gray-500 hover:text-red-500 transition-colors duration-300"
                >
                  <Instagram className="w-5 h-5 icon-hover-effect" />
                </Link>
                <Link
                  href="#"
                  aria-label="Twitter"
                  className="text-gray-500 hover:text-red-500 transition-colors duration-300"
                >
                  <Twitter className="w-5 h-5 icon-hover-effect" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow gradient-bg py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-xl p-8 animate-fade-in">
            <div className="mb-8">
              <Link href="/" className="flex items-center text-red-500 hover:text-red-600 transition-colors mb-6">
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span>Volver al inicio</span>
              </Link>
              <h1 className="text-3xl font-bold text-red-500 mb-4 font-playfair text-center">Iniciar Sesión</h1>
              <p className="text-gray-600 text-center mb-8">Accede a tu cuenta para gestionar tu restaurante</p>
            </div>

            {message.text && (
              <div
                className={`p-4 rounded-lg mb-6 ${
                  message.type === "success"
                    ? "bg-green-100 text-green-700 border border-green-300"
                    : "bg-red-100 text-red-700 border border-red-300"
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Tu contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link href="#" className="text-sm text-red-500 hover:text-red-600">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-8 rounded-lg shadow-lg transition-all duration-300 btn-hover-effect"
                >
                  {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                </button>
              </div>
            </form>

            {/* Botones de prueba */}
            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={testConnection}
                className="w-full text-sm text-gray-500 hover:text-red-500 underline py-2"
              >
                🔧 Probar conexión al servidor
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormData({
                    email: "test@example.com",
                    password: "test123",
                  })
                  setMessage({ type: "info", text: "📝 Datos de prueba cargados" })
                }}
                className="w-full text-sm text-blue-500 hover:text-blue-600 underline py-2"
              >
                📝 Cargar datos de prueba
              </button>
            </div>

            <div className="mt-8 text-center text-sm text-gray-500">
              <p>
                ¿No tienes una cuenta?{" "}
                <Link href="/registro" className="text-red-500 hover:text-red-600">
                  Regístrate aquí
                </Link>
              </p>
            </div>

            {/* Información de debug */}
            <div className="mt-6 p-3 bg-gray-50 rounded text-xs text-gray-600">
              <p>
                <strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || "https://tubarresto.somediave.com/api"}
              </p>
              <p>
                <strong>Endpoint:</strong> /api.php?action=login
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-8 border-t">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p className="animate-fade-in">Todos los derechos © 2025 Tu bar Resto</p>
        </div>
      </footer>
    </div>
  )
}
