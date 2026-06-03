import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'
import ClientWrapper from '@/components/ClientWrapper'

export const metadata: Metadata = {
  title: 'TrailElite — Entraînement Trail Pro',
  description: 'Application de suivi d\'entraînement trail running pour coureurs d\'élite',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="bg-background min-h-screen">
        <Navigation />
        {/* Main content offset for sidebar on desktop */}
        <ClientWrapper>
          <main className="lg:pl-64 pb-16 lg:pb-0 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 py-6">
              {children}
            </div>
          </main>
        </ClientWrapper>
      </body>
    </html>
  )
}
