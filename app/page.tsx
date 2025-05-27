"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  DollarSign,
  BarChart2,
  Smartphone,
  Clock,
  Facebook,
  Instagram,
  Twitter,
  LogIn,
  QrCode,
  ShoppingCart,
  CreditCard,
  BarChart,
} from "lucide-react"

export default function Home() {
  // Referencia para las secciones que se animarán al hacer scroll
  const sectionRefs = useRef<(HTMLElement | null)[]>([])

  // Función para manejar la animación al hacer scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible")
          }
        })
      },
      { threshold: 0.1 },
    )

    // Seleccionar todos los elementos con la clase section-reveal
    const sections = document.querySelectorAll(".section-reveal")
    sections.forEach((section) => {
      observer.observe(section)
      sectionRefs.current.push(section as HTMLElement)
    })

    return () => {
      sections.forEach((section) => {
        observer.unobserve(section)
      })
    }
  }, [])

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

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          {/* Hero Background Image */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/hero-restaurant-digital.png"
              alt="Restaurante digital"
              fill
              className="object-cover brightness-[0.85]"
              priority
              unoptimized={true}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40"></div>
          </div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-5xl font-bold text-white mb-6 font-playfair animate-fade-in drop-shadow-lg">
              Bienvenidos a Tu Bar Resto
            </h2>
            <p className="text-white max-w-2xl mx-auto mb-12 text-lg animate-slide-up animate-delay-200 drop-shadow-md">
              Tus clientes escanean, eligen, ordenan y pagan. Todo desde su celular. Rápido, sin contacto y sin errores.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
              <div className="max-w-md text-left animate-slide-left animate-delay-300 bg-white/90 p-8 rounded-xl shadow-xl">
                <h3 className="text-3xl font-bold text-red-500 mb-4 font-playfair">Digitaliza tu carta hoy mismo</h3>
                <p className="text-gray-700 mb-6 text-lg">
                  Convertí tu carta en una experiencia digital sencilla y profesional. Permitir que tus clientes pidan y
                  paguen desde su celular, sin contacto.
                </p>
                <button className="bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-8 rounded-lg shadow-lg transition-all duration-300 btn-hover-effect">
                  Solicita una demo
                </button>
              </div>
              <div className="w-full max-w-xs animate-slide-right animate-delay-400 animate-float">
                <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-sm shadow-2xl">
                  <Image
                    src="https://tubarresto.com/wp-content/uploads/2025/05/ChatGPT-Image-10-may-2025-05_02_36-p.m-768x1152.png"
                    alt="App móvil de pedidos"
                    width={250}
                    height={500}
                    className="mx-auto rounded-2xl"
                    unoptimized={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="gradient-bg py-16">
          <div className="container mx-auto px-4 section-reveal">
            <h2 className="text-4xl font-bold text-red-500 mb-10 text-center font-playfair">
              ¿Por que elegir Tu Bar resto?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
              <div className="flex flex-col items-center justify-center">
                <div className="flex justify-center mb-6">
                  <div className="bg-red-100 p-5 rounded-full">
                    <QrCode className="w-12 h-12 text-red-500 animate-pulse-slow" />
                  </div>
                </div>
                <h3 className="text-xl font-medium mb-2 font-playfair text-center">
                  Tus clientes piden desde su celular
                </h3>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="flex justify-center mb-6">
                  <div className="bg-red-100 p-5 rounded-full">
                    <CreditCard className="w-12 h-12 text-red-500 animate-pulse-slow" />
                  </div>
                </div>
                <h3 className="text-xl font-medium mb-2 font-playfair text-center">Pago seguro en línea</h3>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="flex justify-center mb-6">
                  <div className="bg-red-100 p-5 rounded-full">
                    <DollarSign className="w-12 h-12 text-red-500 animate-pulse-slow" />
                  </div>
                </div>
                <h3 className="text-xl font-medium mb-2 font-playfair text-center">Sin efectivo ni terminal</h3>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="flex justify-center mb-6">
                  <div className="bg-red-100 p-5 rounded-full">
                    <BarChart2 className="w-12 h-12 text-red-500 animate-pulse-slow" />
                  </div>
                </div>
                <h3 className="text-xl font-medium mb-2 font-playfair text-center">Reportes automáticos</h3>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="flex justify-center mb-6">
                  <div className="bg-red-100 p-5 rounded-full">
                    <BarChart className="w-12 h-12 text-red-500 animate-pulse-slow" />
                  </div>
                </div>
                <h3 className="text-xl font-medium mb-2 font-playfair text-center">Estadísticas en tiempo real</h3>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-pink-50 py-16">
          <div className="container mx-auto px-4 section-reveal">
            <h2 className="text-4xl font-bold text-red-500 mb-4 text-center font-playfair">¿Como Funciona?</h2>
            <p className="text-gray-700 text-center max-w-3xl mx-auto mb-16 text-lg">
              digitaliza tu carta y automatiza tu restaurante, tus clientes pueden escanear el qr, ver el menú, hacer su
              pedido y pagar desde su celular.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center card-hover bg-white p-8 rounded-xl shadow-md">
                <div className="animate-float mb-6 h-64 relative overflow-hidden rounded-lg">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Leonardo_Phoenix_09_A_photorealistic_closeup_of_a_persons_hand_2.jpg-cl1HM9V3fNLMICjJ8KwyzEazSiugt9.jpeg"
                    alt="Escanea el código QR"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    unoptimized={true}
                  />
                </div>
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-red-100 p-3 rounded-full">
                    <QrCode className="w-8 h-8 text-red-500 animate-pulse-slow" />
                  </div>
                </div>
                <h3 className="text-2xl font-medium text-red-500 mb-3 font-playfair">Escanea el código QR</h3>
                <p className="text-gray-700">El cliente ve el menú, donde tiene opciones para elegir.</p>
              </div>
              <div className="text-center card-hover bg-white p-8 rounded-xl shadow-md">
                <div className="animate-float animate-delay-200 mb-6 h-64 relative overflow-hidden rounded-lg">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Leonardo_Phoenix_09_A_young_adult_with_a_gentle_smile_and_subt_1.jpg-FY5occ2NMJ2OcgHxeCwf9jGvzxFDq8.jpeg"
                    alt="Elige tu pedido"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    unoptimized={true}
                  />
                </div>
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-red-100 p-3 rounded-full">
                    <ShoppingCart className="w-8 h-8 text-red-500 animate-pulse-slow" />
                  </div>
                </div>
                <h3 className="text-2xl font-medium text-red-500 mb-3 font-playfair">Elige tu pedido</h3>
                <p className="text-gray-700">Se agrega al móvil</p>
              </div>
              <div className="text-center card-hover bg-white p-8 rounded-xl shadow-md">
                <div className="animate-float animate-delay-400 mb-6 h-64 relative overflow-hidden rounded-lg">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Leonardo_Phoenix_09_A_young_adult_with_short_dark_brown_hair_a_1.jpg-GQhHMBscQDasHGpLeFq4eSFU6LlzQ3.jpeg"
                    alt="Paga online"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    unoptimized={true}
                  />
                </div>
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-red-100 p-3 rounded-full">
                    <CreditCard className="w-8 h-8 text-red-500 animate-pulse-slow" />
                  </div>
                </div>
                <h3 className="text-2xl font-medium text-red-500 mb-3 font-playfair">Paga online</h3>
                <p className="text-gray-700">Por tarjeta, efectivo o QR</p>
              </div>
              <div className="text-center card-hover bg-white p-8 rounded-xl shadow-md">
                <div className="animate-float animate-delay-300 mb-6 h-64 relative overflow-hidden rounded-lg">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Leonardo_Phoenix_09_A_sleek_modern_restaurant_management_dashb_3.jpg-J3Z6G1ZPjtHV4nStzPV5CtM721fIz7.jpeg"
                    alt="Reportes en tiempo real"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    unoptimized={true}
                  />
                </div>
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-red-100 p-3 rounded-full">
                    <BarChart className="w-8 h-8 text-red-500 animate-pulse-slow" />
                  </div>
                </div>
                <h3 className="text-2xl font-medium text-red-500 mb-3 font-playfair">Reportes en tiempo real</h3>
                <p className="text-gray-700">Controla desde tu panel, en tiempo real</p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="bg-white py-16">
          <div className="container mx-auto px-4 section-reveal">
            <h2 className="text-4xl font-bold text-red-500 mb-4 text-center font-playfair">
              Beneficios de digitalizar tu restaurante
            </h2>
            <p className="text-gray-700 text-center max-w-3xl mx-auto mb-16 text-lg">
              Mejorá la experiencia del cliente y optimiza tu operación diaria
            </p>

            <div className="grid md:grid-cols-4 gap-8">
              <div className="text-center card-hover bg-white p-6 rounded-xl shadow-md transform transition-all duration-300 hover:scale-105">
                <div className="flex justify-center mb-6">
                  <div className="bg-red-100 p-5 rounded-full">
                    <DollarSign className="w-12 h-12 text-red-500 animate-pulse-slow" />
                  </div>
                </div>
                <h3 className="text-xl font-medium mb-3 font-playfair">Más ventas</h3>
                <p className="text-gray-700">Menú visual más pedidos, más consumo</p>
              </div>

              <div className="text-center card-hover bg-white p-6 rounded-xl shadow-md transform transition-all duration-300 hover:scale-105">
                <div className="flex justify-center mb-6">
                  <div className="bg-red-100 p-5 rounded-full">
                    <BarChart2 className="w-12 h-12 text-red-500 animate-pulse-slow" />
                  </div>
                </div>
                <h3 className="text-xl font-medium mb-3 font-playfair">Control total</h3>
                <p className="text-gray-700">Reportes el instante desde cualquier lugar</p>
              </div>

              <div className="text-center card-hover bg-white p-6 rounded-xl shadow-md transform transition-all duration-300 hover:scale-105">
                <div className="flex justify-center mb-6">
                  <div className="bg-red-100 p-5 rounded-full">
                    <Smartphone className="w-12 h-12 text-red-500 animate-pulse-slow" />
                  </div>
                </div>
                <h3 className="text-xl font-medium mb-3 font-playfair">Sin aplicaciones</h3>
                <p className="text-gray-700">No necesitan descargar nada, solo escanear</p>
              </div>

              <div className="text-center card-hover bg-white p-6 rounded-xl shadow-md transform transition-all duration-300 hover:scale-105">
                <div className="flex justify-center mb-6">
                  <div className="bg-red-100 p-5 rounded-full">
                    <Clock className="w-12 h-12 text-red-500 animate-pulse-slow" />
                  </div>
                </div>
                <h3 className="text-xl font-medium mb-3 font-playfair">Menos espera</h3>
                <p className="text-gray-700">Tus clientes pagan al instante desde su celular</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="gradient-bg py-16">
          <div className="container mx-auto px-4 section-reveal">
            <h2 className="text-4xl font-bold text-gray-800 mb-12 text-center font-playfair">Planes y Precios</h2>

            <div className="max-w-lg mx-auto bg-white rounded-xl shadow-xl p-10 text-center card-hover">
              <div className="flex justify-center mb-6">
                <div className="bg-green-100 p-5 rounded-full">
                  <DollarSign className="w-12 h-12 text-green-500 animate-pulse-slow" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-6 font-playfair">Plan de prueba</h3>
              <p className="text-gray-700 mb-8 text-lg">
                Ideal para probar como funciona la plataforma antes de contratar. Menú digital con código QR hasta 10
                productos cargados Pedidos enviados a cocina Reporte básico de ventas Duración 30 días
              </p>
              <p className="text-gray-700 mb-8 text-lg font-medium">Sujeto a € 1,5% por transacción</p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
                <div className="flex items-center">
                  <input type="checkbox" checked readOnly className="mr-2 w-5 h-5" />
                  <span className="text-gray-700">Sin comisión durante el periodo de prueba</span>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" checked readOnly className="mr-2 w-5 h-5" />
                  <span className="text-gray-700">Sin tarjeta necesaria</span>
                </div>
              </div>
              <Link href="/registro">
                <button className="bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-8 rounded-lg shadow-lg transition-all duration-300 btn-hover-effect text-lg">
                  Probar gratis ahora
                </button>
              </Link>
            </div>
          </div>
        </section>
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
