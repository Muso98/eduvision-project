'use client'

import Link from 'next/link'
import { Mail, Phone, Facebook, Instagram, Linkedin, Send, Info, LayoutDashboard, Video, FileBarChart } from 'lucide-react'

import { useLanguage } from '@/contexts/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 text-white text-xl font-bold mb-4 group">
              <div className="w-10 h-10 bg-blue-600 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <img src="/logo.png" alt="EduVision" className="w-full h-full object-cover" />
              </div>
              <span>EduVision</span>
            </div>
            <p className="text-sm leading-relaxed">
              {t('footer_brand_desc')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-lg">{t('footer_platform')}</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Info size={14} /><Link href="/" className="hover:text-blue-400 transition-colors">{t('how_it_works_btn')}</Link></li>
              <li className="flex items-center gap-2"><LayoutDashboard size={14} /><Link href="/dashboard" className="hover:text-blue-400 transition-colors">{t('dashboard')}</Link></li>
              <li className="flex items-center gap-2"><Video size={14} /><Link href="/dashboard/analyze" className="hover:text-blue-400 transition-colors">{t('analyze')}</Link></li>
              <li className="flex items-center gap-2"><FileBarChart size={14} /><Link href="/dashboard/reports" className="hover:text-blue-400 transition-colors">{t('reports')}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-lg">{t('footer_support')}</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-blue-500" />
                <a href="mailto:support@eduvision.com.uz" className="hover:text-blue-400 transition-colors">support@eduvision.com.uz</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="text-blue-500" />
                <a href="tel:+998901234567" className="hover:text-blue-400 transition-colors">+998 90 123 45 67</a>
              </li>
              <li className="mt-4">
                <div className="flex gap-4 text-xl">
                  <a href="#" className="hover:text-blue-400 transition-colors"><Send size={20} /></a>
                  <a href="#" className="hover:text-blue-400 transition-colors"><Instagram size={20} /></a>
                  <a href="#" className="hover:text-blue-400 transition-colors"><Linkedin size={20} /></a>
                  <a href="#" className="hover:text-blue-400 transition-colors"><Facebook size={20} /></a>
                </div>
              </li>
            </ul>
          </div>

          {/* Copyright Section */}
          <div className="col-span-1">
            <h4 className="text-white font-semibold mb-4 text-lg">{t('footer_legal')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-blue-400 transition-colors">{t('footer_privacy')}</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">{t('footer_terms')}</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">{t('footer_docs')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} EduVision Classroom Analytics. {t('all_rights_reserved')}</p>
        </div>
      </div>
    </footer>
  )
}
