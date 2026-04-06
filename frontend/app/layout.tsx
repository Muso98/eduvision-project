import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EduVision — AI Classroom Analytics Platform',
  description: 'Enhance learning outcomes with real-time AI student engagement monitoring. Advanced analytics for modern classrooms.',
  keywords: ['EduVision', 'Classroom Analytics', 'AI Education', 'Student Engagement', 'Learning Outcomes', 'Education Technology', 'Uzbekistan AI'],
  authors: [{ name: 'EduVision Team' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'EduVision — Classroom Analytics',
    description: 'Real-time AI-powered student engagement monitoring platform',
    type: 'website',
    locale: 'uz_UZ',
    siteName: 'EduVision',
  },
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
