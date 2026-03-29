'use client'
import VideoUploadAnalysis from '@/components/VideoUploadAnalysis'
import { Film, Info, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AnalyzePage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Film className="w-5.5 h-5.5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('video_analyze_title')}</h1>
          </div>
          <p className="text-slate-500 text-sm md:text-base max-w-2xl mt-2">
            {t('video_analyze_desc')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Analysis Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-1">
            <div className="p-6 md:p-8">
               <VideoUploadAnalysis />
            </div>
          </div>
        </div>

        {/* Info / Instructions Sidebar */}
        <div className="space-y-6">
          <div className="bg-blue-50/50 rounded-3xl border border-blue-100/50 p-6">
            <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-4">
              <Info className="w-4 h-4" /> {t('how_it_works')}
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                <div>
                  <p className="text-xs font-bold text-blue-900">{t('step1')}</p>
                  <p className="text-xs leading-relaxed text-blue-800/70 mt-0.5">{t('step1_desc')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                <div>
                  <p className="text-xs font-bold text-blue-900">{t('step2')}</p>
                  <p className="text-xs leading-relaxed text-blue-800/70 mt-0.5">{t('step2_desc')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                <div>
                  <p className="text-xs font-bold text-blue-900">{t('step3')}</p>
                  <p className="text-xs leading-relaxed text-blue-800/70 mt-0.5">{t('step3_desc')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50/50 rounded-3xl border border-amber-100/50 p-6">
            <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4" /> {t('important_tips')}
            </h3>
            <ul className="text-xs text-amber-800/80 space-y-2 list-disc pl-4">
              <li>{t('tip1')}</li>
              <li>{t('tip2')}</li>
              <li>{t('tip3')}</li>
              <li>{t('tip4')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
