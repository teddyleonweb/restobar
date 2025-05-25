import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Lato } from "next/font/google"
import "./globals.css"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-lato",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Tu Bar Resto - Digitaliza tu carta",
  description:
    "Digitaliza tu carta y automatiza tu restaurante. Tus clientes pueden escanear el QR, ver el menú, hacer su pedido y pagar desde su celular.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${playfair.variable} ${lato.variable}`}>{children}</body>
    </html>
  )
}
