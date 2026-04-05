'use client'
import { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Film, LogOut } from 'lucide-react'
import Cookies from 'js-cookie'
import { useLanguage } from '@/contexts/LanguageContext'
import { getMe } from '@/lib/api'
import { useEffect, useState } from 'react'

export default function DashboardLayout({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const { t, locale, setLocale } = useLanguage()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const token = Cookies.get('access_token')
    if (!token) {
      router.push('/')
      return
    }

    getMe()
      .then(res => setUser(res.data))
      .catch(() => {
        Cookies.remove('access_token')
        router.push('/')
      })
  }, [router])

  const handleLogout = () => {
    Cookies.remove('access_token')
    Cookies.remove('refresh_token')
    router.push('/')
  }

  const links = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { href: '/dashboard/reports', icon: FileText, label: t('reports') },
    { href: '/dashboard/analyze', icon: Film, label: t('analyze') },
  ]

  return (
    <div className="min-h-screen text-slate-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-black/5 bg-white/60 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-blue-600 shadow-md shadow-blue-500/30 text-white flex items-center justify-center rounded-lg font-bold text-lg group-hover:scale-105 transition-transform">
                E
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">EduVision</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              {links.map((link) => {
                const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`) && link.href !== '/dashboard';
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center text-sm font-semibold px-4 py-2 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-md border border-slate-200/50">
               <button onClick={() => setLocale('uz')} className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${locale === 'uz' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>UZ</button>
               <button onClick={() => setLocale('en')} className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${locale === 'en' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>EN</button>
               <button onClick={() => setLocale('ru')} className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${locale === 'ru' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>RU</button>
            </div>
            
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/dashboard/profile" className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 shadow-sm flex items-center justify-center text-xs font-bold text-blue-700 hover:bg-blue-200 transition-colors overflow-hidden">
                {user?.photo ? (
                  <img src={user.photo.startsWith('http') ? user.photo : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${user.photo}`} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.fullname ? user.fullname.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'
                )}
              </Link>
            </div>
            <button onClick={handleLogout} className="text-sm font-medium text-slate-500 hover:text-red-500 transition-colors flex items-center gap-2 bg-transparent hover:bg-red-50 px-3 py-1.5 rounded-md">
              <LogOut className="w-4 h-4" /> {t('logout')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1400px] mx-auto p-6 md:p-8 pt-10">
        {children}
      </main>
    </div>
  )
}
