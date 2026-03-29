'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getReport, exportReportCsv, exportReportPdf } from '@/lib/api'
import { FileText, ArrowLeft, Users, Activity, CheckCircle, PauseCircle, Download, FileSpreadsheet, Sparkles, Loader2 } from 'lucide-react'
import EngagementPieChart from '@/components/EngagementPieChart'
import TimelineChart from '@/components/TimelineChart'
import BehaviorChart from '@/components/BehaviorChart'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ReportDetail() {
  const { t, locale } = useLanguage()
  const { lessonId } = useParams()
  const router = useRouter()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getReport(Number(lessonId))
      .then(res => setReport(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [lessonId])

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-slate-500 animate-pulse">
         <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
         <p className="font-medium">{t('processing_analytics')}</p>
      </div>
    </div>
  )

  if (!report) return (
    <div className="max-w-2xl mx-auto mt-20 bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
      <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <FileText className="w-10 h-10 text-slate-400" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-2">{t('generating_report')}</h3>
      <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">{t('report_ended_desc')}</p>
    </div>
  )

  const { lesson_detail } = report

  const handleExport = async (type: 'csv' | 'pdf') => {
    try {
      const response = type === 'csv' 
        ? await exportReportCsv(Number(lessonId), locale)
        : await exportReportPdf(Number(lessonId), locale)
        
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report_${lessonId}.${type}`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
    } catch (err) {
      console.error(`Failed to export ${type}`, err)
      alert(`Opps! ${type.toUpperCase()} yuklab olishda xatolik yuz berdi.`)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in-up max-w-7xl mx-auto pb-12">
      {/* Back & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-black/5 pb-8 gap-6">
        <div className="flex items-start md:items-center gap-5">
          <button 
            onClick={() => router.back()}
            className="w-12 h-12 flex-shrink-0 bg-white shadow-sm rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:shadow-md transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Report <span className="text-slate-400 font-medium">#{report.id}</span>
            </h2>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-500 mt-2">
              <span className="bg-slate-100 px-2.5 py-1 rounded-md">{new Date(report.created_at).toLocaleString()}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100/50">{lesson_detail?.title}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => handleExport('csv')}
            className="flex items-center justify-center gap-2 bg-white text-slate-700 font-medium text-sm px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm hover:shadow hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> {t('export_csv')}
          </button>
          <button 
            onClick={() => handleExport('pdf')}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white font-medium text-sm px-5 py-2.5 rounded-xl border border-blue-700 shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
          >
            <Download className="w-4 h-4" /> {t('export_pdf')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Key Metrics */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" /> {t('avg_engagement')}
          </h4>
          <p className="text-4xl font-extrabold text-slate-900 tracking-tight">{(report.avg_engagement || 0).toFixed(1)}%</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" /> {t('participants')}
          </h4>
          <p className="text-4xl font-extrabold text-slate-900 tracking-tight">{report.total_students_detected}</p>
        </div>

        <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm hover:shadow-md shadow-emerald-500/5 transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2 relative z-10">
            <CheckCircle className="w-4 h-4 text-emerald-500" /> {t('highly_active')}
          </h4>
          <div className="relative z-10">
            <p className="text-4xl font-extrabold text-emerald-600 tracking-tight">{report.active_count || 0}</p>
            <p className="text-xs font-semibold text-emerald-600/60 mt-2 bg-emerald-50 inline-block px-2 py-1 rounded-md border border-emerald-100">
               {Math.round(((report.active_count || 0) / Math.max(report.total_students_detected || 1)) * 100)}% {t('of_total')}
            </p>
          </div>
        </div>

        <div className="bg-white border border-red-100 rounded-2xl p-6 shadow-sm hover:shadow-md shadow-red-500/5 transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2 relative z-10">
            <PauseCircle className="w-4 h-4 text-red-500" /> {t('low_engagement')}
          </h4>
          <div className="relative z-10">
            <p className="text-4xl font-extrabold text-red-500 tracking-tight">{report.passive_count || 0}</p>
            <p className="text-xs font-semibold text-red-500/60 mt-2 bg-red-50 inline-block px-2 py-1 rounded-md border border-red-100">
               {Math.round(((report.passive_count || 0) / Math.max(report.total_students_detected || 1)) * 100)}% {t('of_total')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement History */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-3">
           <h3 className="text-lg font-bold text-slate-900 mb-6">{t('engagement_index')}</h3>
           <div className="h-[300px] w-full mt-4">
              {report.timeline_history && report.timeline_history.length > 0 ? (
                <TimelineChart data={report.timeline_history} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Activity className="w-8 h-8 text-slate-200" />
                  <span className="font-medium text-sm">{t('insufficient_data')}</span>
                </div>
              )}
           </div>
        </div>

        {/* Charts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">{t('distribution_overview')}</h3>
          <div className="h-[250px] w-full flex items-center justify-center mt-2">
            {report.total_students_detected > 0 ? (
               <EngagementPieChart 
                 active={report.active_count || 0} 
                 moderate={report.moderate_count || 0} 
                 passive={report.passive_count || 0} 
               />
            ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Activity className="w-8 h-8 text-slate-200" />
                  <span className="font-medium text-sm">{t('insufficient_data')}</span>
                </div>
            )}
          </div>
        </div>

        {/* Behavior Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">
            {locale === 'uz' ? 'Xulq-atvor tahlili' : locale === 'ru' ? 'Анализ поведения' : 'Behavior Analysis'}
          </h3>
          <div className="h-[250px] w-full flex items-center justify-center mt-2">
            {report.behavior_distribution && Object.keys(report.behavior_distribution).length > 0 ? (
               <BehaviorChart data={report.behavior_distribution} />
            ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Activity className="w-8 h-8 text-slate-200" />
                  <span className="font-medium text-sm">{t('no_behavior_data') || t('insufficient_data')}</span>
                </div>
            )}
          </div>
        </div>

        {/* Pro AI Summary Highlight */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md hover:border-blue-200 transition-all">
           <div className="absolute top-0 right-0 -mr-6 -mt-6 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
              <Sparkles className="w-32 h-32 text-blue-600" />
           </div>
           
           <h3 className="text-lg font-bold text-blue-900 mb-5 flex items-center gap-2 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                 <Sparkles className="w-4 h-4" />
              </div>
              {t('ai_summary_title')}
           </h3>
           
           <div className="flex-1 overflow-hidden relative z-10">
              <p className="text-sm text-blue-900/80 leading-relaxed font-medium">
                {report.summary}
              </p>
              
              <div className="mt-8 pt-6 border-t border-blue-200/50">
                <h4 className="text-xs font-bold text-blue-800/60 mb-4 uppercase tracking-widest">{t('actionable_insights')}</h4>
                <ul className="space-y-4">
                   {report.avg_engagement < 50 ? (
                      <li className="flex items-start gap-3 text-sm text-blue-900 font-medium">
                        <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">!</div>
                        {locale === 'uz' ? 'Diqqatni qaratish uchun savol-javob qo\'shishni o\'ylab ko\'ring.' : locale === 'ru' ? 'Подумайте о добавлении секции вопросов для внимания.' : 'Consider incorporating more interactive Q&A segments to maintain focus.'}
                      </li>
                   ) : (
                      <li className="flex items-start gap-3 text-sm text-blue-900 font-medium">
                        <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">✓</div>
                        {locale === 'uz' ? 'A\'lo daraja. Joriy uslubingizda davom eting.' : locale === 'ru' ? 'Отлично. Продолжайте в том же духе.' : 'Excellent retention rate. Continue current methodology.'}
                      </li>
                   )}
                   {report.passive_count > 0 && (
                      <li className="flex items-start gap-3 text-sm text-blue-900 font-medium">
                        <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">👀</div>
                        {locale === 'uz' ? `Darsdan chalg'igan ${report.passive_count} ta talabaga e'tibor qarating.` : locale === 'ru' ? `Обратите внимание на ${report.passive_count} отвлекшихся студентов.` : `Address the ${report.passive_count} disengaged students by adjusting classroom pacing.`}
                      </li>
                   )}
                </ul>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
