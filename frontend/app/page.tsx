'use client'

import Link from 'next/link'
import { ArrowRight, BarChart3, Brain, Video, ShieldCheck, Users, Clock, Languages } from 'lucide-react'
import { useState, useEffect } from 'react'
import Cookies from 'js-cookie'

export default function AboutPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const token = Cookies.get('access_token')
    setIsLoggedIn(!!token)
  }, [])

  return (
    <div className="bg-dark-900 text-slate-100">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent_70%)]" />
        <div className="container mx-auto px-4 z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Next Generation Education Analytics
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
            AI-Driven Insights for <br className="hidden md:block" /> Modern Classrooms
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-400 mb-10 leading-relaxed">
            EduVision uses advanced computer vision to analyze student engagement, behavior, and attention in real-time. Empowering teachers with data to create better learning outcomes.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {isLoggedIn ? (
              <Link href="/dashboard" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg shadow-blue-500/20">
                Open Dashboard <LayoutDashboard size={20} />
              </Link>
            ) : (
              <Link href="/login" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg shadow-blue-500/20">
                Get Started <ArrowRight size={20} />
              </Link>
            )}
            <a href="#how-it-works" className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-semibold transition-all backdrop-blur-sm">
              How it Works
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
              { label: 'Real-time Analytics', value: '100 ms' },
              { label: 'Accuracy Rate', value: '98.5%' },
              { label: 'Supported Cameras', value: 'Any RTSP' },
              { label: 'Data Security', value: 'AES-256' },
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
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Core Capabilities</h2>
            <p className="text-slate-400 max-w-xl mx-auto font-pro">Professional tools for precise educational monitoring.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-pro">
            <FeatureCard 
              icon={<Brain className="text-blue-500" size={32} />}
              title="Engagement Scoring"
              description="Proprietary AI algorithms calculate engagement scores based on gaze, posture, and activity patterns."
            />
            <FeatureCard 
              icon={<Video className="text-purple-500" size={32} />}
              title="Live Stream Sync"
              description="Zero-latency streaming with instant behavioral overlay directly on your classroom cameras."
            />
            <FeatureCard 
              icon={<BarChart3 className="text-green-500" size={32} />}
              title="Automated Reports"
              description="Generate PDF reports for parents and school management with a single click after every lesson."
            />
            <FeatureCard 
              icon={<Users className="text-orange-500" size={32} />}
              title="Group Dynamics"
              description="Monitor collaboration levels during group work and identify isolated students automatically."
            />
            <FeatureCard 
              icon={<Clock className="text-pink-500" size={32} />}
              title="Historical Trends"
              description="Track class progress over weeks and months to identify the most effective teaching methods."
            />
            <FeatureCard 
              icon={<Languages className="text-cyan-500" size={32} />}
              title="Trilingual Support"
              description="The entire platform is localized in English, Uzbek, and Russian for seamless administration."
            />
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 bg-blue-600/5">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <h2 className="text-4xl font-bold mb-8">How EduVision Transforms Your School</h2>
              <div className="space-y-8">
                <StepItem 
                  number="01" 
                  title="Connect Your Cameras" 
                  description="Integrate existing classroom IP cameras or use local webcams for real-time monitoring." 
                />
                <StepItem 
                  number="02" 
                  title="AI Processing" 
                  description="Our cloud-optimized engine analyzes poses and facial landmarks to detect learning activities." 
                />
                <StepItem 
                  number="03" 
                  title="Act on Insights" 
                  description="Use dashboards to adjust your lesson flow in real-time or review reports to improve long-term strategy." 
                />
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
                 <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent" />
                 <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <ShieldCheck size={64} className="text-blue-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Privacy First Architecture</h3>
                    <p className="text-slate-400 text-sm">All video processing is handled in secure containers. Faces are never saved without encryption.</p>
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
          <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to Elevate Your Teaching?</h2>
          <p className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto">
             Join leading educational institutions using data to drive student success.
          </p>
          <Link href="/login" className="px-12 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-500/20 inline-block">
             Request Admin Access
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
