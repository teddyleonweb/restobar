"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Facebook, Instagram, Twitter, LogIn, ArrowLeft, Copy, Check } from "lucide-react"
import { getApiUrl } from "@/lib/api-config"

export default function Registro() {
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    nombreRestaurante: "",
    direccion: "",
    ciudad: "",
    aceptaTerminos: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    })
  }

  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState({ email: false, password: false })

  const copyToClipboard = async (text: string, type: "email" | "password") => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied({ ...copied, [type]: true })
      setTimeout(() => {
        setCopied({ ...copied, [type]: false })
      }, 2000)
    } catch (err) {
      console.error("Error al copiar:", err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.aceptaTerminos) {
      setMessage({ type: "error", text: "Debes aceptar los términos y condiciones" })
      return
    }

    setIsLoading(true)
    setMessage({ type: "", text: "" })

    try {
      // Usar la variable de entorno centralizada
      const apiUrl = getApiUrl("REGISTER")
      console.log("Intentando conectar a la API:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        body: JSON.stringify(formData),
      })

      console.log("Respuesta recibida:", response.status, response.statusText)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Respuesta no es JSON:", text)
        throw new Error("El servidor no devolvió JSON válido")
      }

      const result = await response.json()
      console.log("Resultado:", result)

      if (result.success) {
        setCredentials({
          email: result.data.email,
          password: result.data.temp_password,
        })
        setMessage({
          type: "success",
          text: "¡Registro exitoso! Aquí están tus credenciales de acceso.",
        })
        // Limpiar formulario
        setFormData({
          nombre: "",
          apellido: "",
          email: "",
          telefono: "",
          nombreRestaurante: "",
          direccion: "",
          ciudad: "",
          aceptaTerminos: false,
        })
      } else {
        setMessage({ type: "error", text: result.error || "Error en el registro" })
      }
    } catch (error) {
      console.error("Error completo:", error)

      // Manejo más específico de errores
      if (error instanceof TypeError) {
        if (error.message.includes("NetworkError") || error.message.includes("fetch")) {
          setMessage({
            type: "error",
            text: "Error de conexión. Verifica que el archivo API existe en el servidor.",
          })
        } else {
          setMessage({
            type: "error",
            text: "Error de red: " + error.message,
          })
        }
      } else if (error instanceof Error) {
        setMessage({
          type: "error",
          text: error.message,
        })
      } else {
        setMessage({
          type: "error",
          text: "Error desconocido. Revisa la consola para más detalles.",
        })
      }
    } finally {
      setIsLoading(false)
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
                href="/login"
                className="flex items-center text-gray-700 hover:text-red-500 transition-colors duration-300 animate-fade-in animate-delay-200"
              >
                <LogIn className="w-5 h-5 mr-1 icon-hover-effect" />
                <span>Iniciar sesión</span>
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
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-xl p-8 animate-fade-in">
            <div className="mb-8">
              <Link href="/" className="flex items-center text-red-500 hover:text-red-600 transition-colors mb-6">
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span>Volver al inicio</span>
              </Link>
              <h1 className="text-3xl font-bold text-red-500 mb-4 font-playfair text-center">
                Registrate para probar gratis
              </h1>
              <p className="text-gray-600 text-center mb-8">
                Completa el formulario para comenzar tu periodo de prueba de 30 días sin costo
              </p>
            </div>

            {/* Mostrar credenciales si el registro fue exitoso */}
            {credentials && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-bold text-green-800 mb-4">¡Registro exitoso! 🎉</h3>
                <p className="text-green-700 mb-4">Tu cuenta ha sido creada. Aquí están tus credenciales de acceso:</p>

                <div className="bg-white border border-green-300 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email:</label>
                      <span className="text-lg font-mono">{credentials.email}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(credentials.email, "email")}
                      className="flex items-center text-green-600 hover:text-green-800 transition-colors"
                    >
                      {copied.email ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contraseña:</label>
                      <span className="text-lg font-mono">{credentials.password}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(credentials.password, "password")}
                      className="flex items-center text-green-600 hover:text-green-800 transition-colors"
                    >
                      {copied.password ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/login" className="flex-1">
                    <button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors">
                      Iniciar Sesión Ahora
                    </button>
                  </Link>
                  <button
                    onClick={() => {
                      setCredentials(null)
                      setMessage({ type: "", text: "" })
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    Registrar Otro Usuario
                  </button>
                </div>

                <p className="text-sm text-green-600 mt-3">
                  💡 También hemos enviado estas credenciales a tu email. Te recomendamos cambiar tu contraseña después
                  del primer inicio de sesión.
                </p>
              </div>
            )}

            {/* Mostrar mensajes de error */}
            {message.text && message.type === "error" && (
              <div className="bg-red-100 text-red-700 border border-red-300 p-4 rounded-lg mb-6">{message.text}</div>
            )}

            {/* Formulario de registro */}
            {!credentials && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      id="nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-1">
                      Apellido
                    </label>
                    <input
                      type="text"
                      id="apellido"
                      name="apellido"
                      value={formData.apellido}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
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
                    />
                  </div>
                  <div>
                    <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      id="telefono"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="nombreRestaurante" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del restaurante
                  </label>
                  <input
                    type="text"
                    id="nombreRestaurante"
                    name="nombreRestaurante"
                    value={formData.nombreRestaurante}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    id="direccion"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label htmlFor="ciudad" className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    id="ciudad"
                    name="ciudad"
                    value={formData.ciudad}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="aceptaTerminos"
                    name="aceptaTerminos"
                    checked={formData.aceptaTerminos}
                    onChange={handleChange}
                    required
                    className="h-5 w-5 text-red-500 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="aceptaTerminos" className="ml-2 block text-sm text-gray-700">
                    Acepto los{" "}
                    <Link href="#" className="text-red-500 hover:text-red-600">
                      términos y condiciones
                    </Link>
                  </label>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-8 rounded-lg shadow-lg transition-all duration-300 btn-hover-effect"
                  >
                    {isLoading ? "Registrando..." : "Comenzar prueba gratuita"}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-8 text-center text-sm text-gray-500">
              <p>
                ¿Ya tienes una cuenta?{" "}
                <Link href="/login" className="text-red-500 hover:text-red-600">
                  Inicia sesión aquí
                </Link>
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
