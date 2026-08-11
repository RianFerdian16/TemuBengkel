import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "TEMUBENGKEL — Cari bengkel motor terdekat",
  description: "Temukan bengkel motor di sekitar Anda, lihat rating Google, lalu buka navigasi langsung di Google Maps.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#f8fafc",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}{process.env.NODE_ENV === "production" && <Analytics />}</body>
    </html>
  )
}
