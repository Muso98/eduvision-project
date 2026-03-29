'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getReports } from '@/lib/api'
import { FileText, Clock, BarChart2, Loader2, Calendar } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ReportsList() {
  const { t } = useLanguage()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getReports()
      .then(res => setReports(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/5 pb-6">
        <div>
           <h3 className="text-3xl font-bold tracking-tight text-slate-900">{t('reports') || 'Reports'}</h3>
           <p className="text-slate-500 mt-2 text-sm">{t('real_time_stats') || 'View detailed analytics for all your past sessions.'}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {reports.map((report) => (
            <Link 
              href={`/dashboard/reports/${report.lesson}`} 
              key={report.id}
              className="bg-white rounded-2xl p-6 flex flex-col border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <FileText className="w-6 h-6" />
                </div>
                {/* Visual marker based on score */}
                <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                  report.avg_engagement >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                  report.avg_engagement >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  {report.avg_engagement}% <span className="font-medium opacity-80 pl-1">{t('avg_engagement') || 'Avg'}</span>
                </div>
              </div>
              
              <h4 className="text-xl font-bold text-slate-900 mb-2">Report #{report.lesson}</h4>
              <p className="text-sm text-slate-500 mb-6 flex-1 line-clamp-2 leading-relaxed">
                {report.summary || t('no_summary') || 'No summary available.'}
              </p>

              <div className="flex items-center text-xs text-slate-500 pt-5 border-t border-slate-100 mt-auto">
                <span className="flex items-center gap-1.5 font-medium bg-slate-50 border border-slate-200/60 px-2.5 py-1.5 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(report.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1.5 font-medium ml-3 text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(report.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </Link>
          ))}
          
          {reports.length === 0 && (
            <div className="col-span-full py-20 text-center">
               <div className="w-20 h-20 bg-slate-50 border border-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                 <FileText className="w-10 h-10" />
               </div>
               <h4 className="text-xl font-bold text-slate-900 mb-2">{t('no_sessions') || 'No reports found'}</h4>
               <p className="text-slate-500 max-w-sm mx-auto">There are no generated reports available at the moment. Run a session to see analytics.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
