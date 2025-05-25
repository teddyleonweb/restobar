"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Facebook, Instagram, Twitter, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { authAPI } from "@/lib/api"

export default function Login() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
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
    setIsLoading(true)
    setError("")

    try {
      const response = await authAPI.login(formData)

      if (response.token && response.user) {
        // Guardar token y datos del usuario
        localStorage.setItem("tubarresto_token", response.token)
        localStorage.setItem("tubarresto_user", JSON.stringify(response.user))

        // Redirigir al dashboard
        router.push("/dashboard")
      } else {
        setError("Respuesta inválida del servidor")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al iniciar sesión")
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
              <p className="text-gray-600 text-center mb-8">Accede a tu cuenta para gestionar tus restaurantes</p>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
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
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-medium py-3 px-8 rounded-lg shadow-lg transition-all duration-300 btn-hover-effect"
                >
                  {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center text-sm text-gray-500">
              <p>
                ¿No tienes una cuenta?{" "}
                <Link href="/registro" className="text-red-500 hover:text-red-600">
                  Regístrate aquí
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
