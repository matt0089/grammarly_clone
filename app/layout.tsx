import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ErrorBoundary } from "@/components/error-boundary"

export const metadata: Metadata = {
  title: "DocWise AI",
  description: "Created with v0",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  )
}
