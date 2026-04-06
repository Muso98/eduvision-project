'use client'
import { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Film, LogOut, Menu } from 'lucide-react'
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

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const links = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { href: '/dashboard/reports', icon: FileText, label: t('reports') },
    { href: '/dashboard/analyze', icon: Film, label: t('analyze') },
  ]

  return (
    <div className="min-h-screen text-slate-900 bg-slate-50/50">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-black/5 bg-white/60 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              aria-label="Toggle Menu"
            >
              <Menu size={20} />
            </button>

            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-blue-600 shadow-lg shadow-blue-500/20 rounded-xl overflow-hidden group-hover:scale-105 transition-transform">
                <img src="/logo.png" alt="EV" className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 hidden xs:inline">EduVision</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              {links.map((link) => {
                const isActive = pathname === link.href || (pathname?.startsWith(`${link.href}/`) && link.href !== '/dashboard');
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

          <div className="flex items-center gap-2 sm:gap-5">
            <div className="hidden xs:flex items-center gap-1 bg-slate-100/50 p-1 rounded-md border border-slate-200/50">
               <button onClick={() => setLocale('uz')} className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${locale === 'uz' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>UZ</button>
               <button onClick={() => setLocale('en')} className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${locale === 'en' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>EN</button>
               <button onClick={() => setLocale('ru')} className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${locale === 'ru' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>RU</button>
            </div>
            
            <div className="flex items-center gap-2">
              <Link href="/dashboard/profile" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-100 border border-blue-200 shadow-sm flex items-center justify-center text-xs font-bold text-blue-700 hover:bg-blue-200 transition-colors overflow-hidden">
                {user?.photo ? (
                  <img src={user.photo.startsWith('http') ? user.photo : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${user.photo}`} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.fullname ? user.fullname.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'
                )}
              </Link>
            </div>
            <button onClick={handleLogout} className="text-sm font-medium text-slate-500 hover:text-red-500 transition-colors flex items-center gap-2 bg-transparent hover:bg-red-50 px-2 sm:px-3 py-1.5 rounded-md">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">{t('logout')}</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-white/95 backdrop-blur-xl border-b border-black/5 shadow-2xl animate-in slide-in-from-top duration-300">
            <nav className="p-4 flex flex-col gap-2">
              {links.map((link) => {
                const isActive = pathname === link.href || (pathname?.startsWith(`${link.href}/`) && link.href !== '/dashboard');
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 text-base font-semibold px-4 py-3 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={20} />
                    {link.label}
                  </Link>
                )
              })}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between px-2">
                <span className="text-sm text-slate-500 font-medium">{t('language')}:</span>
                <div className="flex gap-2">
                  <button onClick={() => {setLocale('uz'); setIsMobileMenuOpen(false);}} className={`px-3 py-1 rounded-lg text-sm font-bold ${locale === 'uz' ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}>UZ</button>
                  <button onClick={() => {setLocale('en'); setIsMobileMenuOpen(false);}} className={`px-3 py-1 rounded-lg text-sm font-bold ${locale === 'en' ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}>EN</button>
                  <button onClick={() => {setLocale('ru'); setIsMobileMenuOpen(false);}} className={`px-3 py-1 rounded-lg text-sm font-bold ${locale === 'ru' ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}>RU</button>
                </div>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1400px] mx-auto p-4 sm:p-6 md:p-8 pt-6 sm:pt-10">
        {children}
      </main>
    </div>
  )
}
