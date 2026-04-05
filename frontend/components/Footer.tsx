'use client'

import Link from 'next/link'
import { Mail, Phone, Facebook, Instagram, Linkedin, Send, Info, LayoutDashboard, Video, FileBarChart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 text-white text-xl font-bold mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-sm">EV</div>
              <span>EduVision</span>
            </div>
            <p className="text-sm leading-relaxed">
              AI-powered classroom analytics platform designed to empower educators with real-time engagement data and behavioral insights.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-lg">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Info size={14} /><Link href="/" className="hover:text-blue-400 transition-colors">About Us</Link></li>
              <li className="flex items-center gap-2"><LayoutDashboard size={14} /><Link href="/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</Link></li>
              <li className="flex items-center gap-2"><Video size={14} /><Link href="/dashboard/analyze" className="hover:text-blue-400 transition-colors">Video Analysis</Link></li>
              <li className="flex items-center gap-2"><FileBarChart size={14} /><Link href="/dashboard/reports" className="hover:text-blue-400 transition-colors">Reports</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-lg">Support</h4>
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
            <h4 className="text-white font-semibold mb-4 text-lg">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Documentation</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} EduVision Classroom Analytics. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
