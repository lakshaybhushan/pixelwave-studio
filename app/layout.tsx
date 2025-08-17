import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PixelWave Studio - Retro CRT Image Effects",
  description:
    "Transform images into mesmerizing animated patterns using vintage dithering algorithms. Create retro CRT effects, ASCII art, and animated dither patterns.",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  openGraph: {
    title: "PixelWave Studio - Retro CRT Image Effects",
    description: "Transform images into mesmerizing animated patterns using vintage dithering algorithms",
    url: "https://pixelwave-studio.vercel.app",
    siteName: "PixelWave Studio",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PixelWave Studio - Retro CRT Image Effects",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PixelWave Studio - Retro CRT Image Effects",
    description: "Transform images into mesmerizing animated patterns using vintage dithering algorithms",
    images: ["/og-image.png"],
    creator: "@blakssh",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script src="https://cdn.databuddy.cc/databuddy.js" data-client-id="FnUpSkO8tniA1dsSzsprr" data-enable-batching="true" crossOrigin="anonymous" async></script>
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
