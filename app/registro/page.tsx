"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Facebook, Instagram, Twitter, LogIn, ArrowLeft } from "lucide-react"
import { authAPI } from "@/lib/api"
import { useRouter } from "next/navigation"

export default function Registro() {
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    nombreRestaurante: "",
    direccion: "",
    ciudad: "",
    password: "",
    aceptaTerminos: false,
  })

  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await authAPI.register({
        name: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        telefono: formData.telefono,
        nombreRestaurante: formData.nombreRestaurante,
        direccion: formData.direccion,
        ciudad: formData.ciudad,
        password: formData.password || "",
      })

      if (response.success) {
        // Mostrar mensaje de éxito y redirigir al login
        alert("¡Registro exitoso! Ahora puedes iniciar sesión.")
        router.push("/login")
      } else {
        setError(response.message || "Error al registrar usuario")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al registrar usuario")
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
                href="#"
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
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
              )}
              <p className="text-gray-600 text-center mb-8">
                Completa el formulario para comenzar tu periodo de prueba de 30 días sin costo
              </p>
            </div>

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

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password || ""}
                  onChange={handleChange}
                  required
                  minLength={6}
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
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-medium py-3 px-8 rounded-lg shadow-lg transition-all duration-300 btn-hover-effect"
                >
                  {isLoading ? "Registrando..." : "Comenzar prueba gratuita"}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center text-sm text-gray-500">
              <p>
                ¿Ya tienes una cuenta?{" "}
                <Link href="#" className="text-red-500 hover:text-red-600">
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
