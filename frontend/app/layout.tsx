import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EduVision — Classroom Analytics',
  description: 'Real-time AI-powered student engagement monitoring platform',
}

import { LanguageProvider } from '@/contexts/LanguageContext'
import Footer from '@/components/Footer'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-dark-900 text-slate-200 antialiased flex flex-col">
        <LanguageProvider>
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  )
}
