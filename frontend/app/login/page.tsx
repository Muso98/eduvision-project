'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/api'
import { Activity, ArrowRight, Lock, Mail } from 'lucide-react'
import Cookies from 'js-cookie'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    try {
      const res = await login(email, password)
      if (res.data.access) {
        Cookies.set('access_token', res.data.access, { expires: 1 })
        Cookies.set('refresh_token', res.data.refresh, { expires: 7 })
        router.push('/dashboard')
      } else {
        setError('Tizimga kirishda xatolik yuz berdi.')
      }
    } catch (err: any) {
      console.error(err)
      if (err.response?.data?.detail) {
         setError(err.response.data.detail)
      } else {
         setError("Tizimga ulanib bo'lmadi. Parol yoki email noto'g'ri.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Delicate background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Main Login Container */}
      <div className="w-full max-w-[400px] z-10 animate-fade-in-up">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="w-14 h-14 bg-brand-50 flex items-center justify-center rounded-2xl mb-6 shadow-[0_8px_30px_rgba(37,99,235,0.12)] border border-brand-100/50">
            <Activity className="w-7 h-7 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Platformaga Kirish</h1>
          <p className="text-slate-500 font-medium text-sm">EduVision boshqaruv paneliga xush kelibsiz.</p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-medium px-4 py-3 rounded-xl flex items-start gap-2 animate-fade-in shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Email manzili</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full input-minimal pl-10 pr-4 py-2.5 text-sm"
                    placeholder="admin@eduvision.local"
                  />
                </div>
              </div>

              <div className="space-y-1.5 mt-5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">Parol</label>
                  <a href="#" className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">Parolni unutdingizmi?</a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full input-minimal pl-10 pr-4 py-2.5 text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(37,99,235,0.2)]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>Kirish <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>
        
        {/* Footer info */}
        <p className="text-center text-slate-500 text-xs font-medium mt-8">
          Tizimga kirish orqali siz maxfiylik siyosatiga rozi bo'lasiz.
        </p>

      </div>
    </div>
  )
}
