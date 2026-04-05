'use client'

import Link from 'next/link'
import { ArrowRight, BarChart3, Brain, Video, ShieldCheck, Users, Clock, Languages } from 'lucide-react'
import { useState, useEffect } from 'react'
import Cookies from 'js-cookie'

import { useLanguage } from '@/contexts/LanguageContext'

export default function AboutPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const { t, locale, setLocale } = useLanguage()

  useEffect(() => {
    const token = Cookies.get('access_token')
    setIsLoggedIn(!!token)
  }, [])

  return (
    <div className="bg-dark-900 text-slate-100">
      {/* Landing Header */}
      <header className="fixed top-0 w-full z-50 bg-dark-900/50 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white text-xl font-bold">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-sm">EV</div>
            <span>EduVision</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
               <button onClick={() => setLocale('uz')} className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${locale === 'uz' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>UZ</button>
               <button onClick={() => setLocale('en')} className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${locale === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>EN</button>
               <button onClick={() => setLocale('ru')} className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${locale === 'ru' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>RU</button>
            </div>
            {isLoggedIn ? (
              <Link href="/dashboard" className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                {t('dashboard')}
              </Link>
            ) : (
              <Link href="/login" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all">
                {t('get_started')}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] pt-20 flex items-center justify-center overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent_70%)]" />
        <div className="container mx-auto px-4 z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            {t('about_hero_badge')}
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
            {t('about_hero_title')}
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-400 mb-10 leading-relaxed">
            {t('about_hero_desc')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {isLoggedIn ? (
              <Link href="/dashboard" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg shadow-blue-500/20">
                {t('open_dashboard')} <LayoutDashboard size={20} />
              </Link>
            ) : (
              <Link href="/login" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg shadow-blue-500/20">
                {t('get_started')} <ArrowRight size={20} />
              </Link>
            )}
            <a href="#how-it-works" className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-semibold transition-all backdrop-blur-sm">
              {t('how_it_works_btn')}
            </a>
          </div>
        </div>

        {/* Abstract Shapes */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl opacity-50" />
      </section>

      {/* Stats Section */}
      <section className="py-20 border-b border-white/5 bg-black/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: t('stats_realtime'), value: '100 ms' },
              { label: t('stats_accuracy'), value: '98.5%' },
              { label: t('stats_cameras'), value: 'Any RTSP' },
              { label: t('stats_security'), value: 'AES-256' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-sm text-slate-500 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">{t('capabilities_title')}</h2>
            <p className="text-slate-400 max-w-xl mx-auto">{t('capabilities_desc')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Brain className="text-blue-500" size={32} />}
              title={t('feat_engagement_title')}
              description={t('feat_engagement_desc')}
            />
            <FeatureCard 
              icon={<Video className="text-purple-500" size={32} />}
              title={t('feat_sync_title')}
              description={t('feat_sync_desc')}
            />
            <FeatureCard 
              icon={<BarChart3 className="text-green-500" size={32} />}
              title={t('feat_reports_title')}
              description={t('feat_reports_desc')}
            />
            <FeatureCard 
              icon={<Users className="text-orange-500" size={32} />}
              title={t('feat_groups_title')}
              description={t('feat_groups_desc')}
            />
            <FeatureCard 
              icon={<Clock className="text-pink-500" size={32} />}
              title={t('feat_trends_title')}
              description={t('feat_trends_desc')}
            />
            <FeatureCard 
              icon={<Languages className="text-cyan-500" size={32} />}
              title={t('feat_langs_title')}
              description={t('feat_langs_desc')}
            />
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 bg-blue-600/5">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <h2 className="text-4xl font-bold mb-8">{t('how_it_works_title')}</h2>
              <div className="space-y-8">
                <StepItem 
                  number="01" 
                  title={t('step1_title')} 
                  description={t('step1_text')} 
                />
                <StepItem 
                  number="02" 
                  title={t('step2_title')} 
                  description={t('step2_text')} 
                />
                <StepItem 
                  number="03" 
                  title={t('step3_title')} 
                  description={t('step3_text')} 
                />
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
                 <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent" />
                 <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <ShieldCheck size={64} className="text-blue-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2">{t('privacy_title')}</h3>
                    <p className="text-slate-400 text-sm">{t('privacy_desc')}</p>
                 </div>
              </div>
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-500/10 blur-[100px] pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 border-t border-white/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">{t('ready_title')}</h2>
          <p className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto">
             {t('ready_desc')}
          </p>
          <Link href="/login" className="px-12 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-500/20 inline-block">
             {t('request_access')}
          </Link>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all hover:-translate-y-1 cursor-default group">
      <div className="mb-6 transform transition-transform group-hover:scale-110 duration-300">{icon}</div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  )
}

function StepItem({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="flex gap-6">
      <div className="text-4xl font-black text-blue-600/30 font-mono tracking-tighter">{number}</div>
      <div>
        <h4 className="text-xl font-bold mb-2 text-white">{title}</h4>
        <p className="text-slate-400 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function LayoutDashboard(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  )
}
