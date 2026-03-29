'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getLesson, stopLesson } from '@/lib/api'
import useDashboardSocket from '@/lib/ws'
import { Activity, Clock, ShieldAlert, Video, Users, CheckCircle, PauseCircle, PhoneOff, AlertTriangle } from 'lucide-react'
import TimelineChart from '@/components/TimelineChart'
import LiveStreamView from '@/components/LiveStreamView'
import { useLanguage } from '@/contexts/LanguageContext'

export default function LiveLesson() {
  const { t } = useLanguage()
  const { lessonId } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const browserCameraEnabled = searchParams.get('external') !== '1'
  const [lesson, setLesson] = useState<any>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [isGroupWork, setIsGroupWork] = useState(false)

  const { stats, alerts } = useDashboardSocket(Number(lessonId))
  const [duration, setDuration] = useState('00:00:00')

  useEffect(() => {
    getLesson(Number(lessonId)).then(res => setLesson(res.data)).catch(console.error)
  }, [lessonId])

  useEffect(() => {
    if (!lesson) return
    const id = setInterval(() => {
      const startAt = lesson.start_time || lesson.created_at
      const diff = Math.floor((new Date().getTime() - new Date(startAt).getTime()) / 1000)
      const h = String(Math.floor(diff / 3600)).padStart(2, '0')
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
      const s = String(diff % 60).padStart(2, '0')
      setDuration(`${h}:${m}:${s}`)
    }, 1000)
    return () => clearInterval(id)
  }, [lesson])

  const handleStop = async () => {
    setStopping(true)
    try {
      await stopLesson(Number(lessonId))
      router.push(`/dashboard/reports/${lessonId}`)
    } catch (err: any) {
      console.error("Stop lesson error:", err)
      setStopping(false)
      setShowConfirm(false)
      // Navigate anyway - report will still be there
      router.push(`/dashboard/reports/${lessonId}`)
    }
  }

  if (!lesson) return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-sm text-[#a1a1aa] font-medium animate-pulse">{t('loading')}</div>
    </div>
  )

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-500'
    if (score >= 40) return 'text-amber-500'
    return 'text-red-500'
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Custom Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !stopping && setShowConfirm(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{t('end_session')}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{t('end_confirm')}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={stopping}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleStop}
                disabled={stopping}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {stopping ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Yakunlanmoqda...
                  </>
                ) : (
                  t('end')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight mb-2">{lesson.title}</h2>
          <div className="flex items-center gap-4 text-sm text-[#a1a1aa]">
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {lesson.classroom_detail?.name}</span>
            <span className="flex items-center gap-1.5"><Activity className="w-4 h-4" /> {lesson.teacher_detail?.fullname}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-3">
            <button
               onClick={() => setIsGroupWork(!isGroupWork)}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                 isGroupWork 
                   ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                   : 'bg-white/5 border border-white/10 text-slate-600 hover:bg-white/10'
               }`}
            >
              <Users className={`w-4 h-4 ${isGroupWork ? 'animate-pulse' : ''}`} />
              {t('group_work')}
            </button>
            <span className="flex items-center gap-2 text-sm font-mono text-slate-800 bg-white/5 border border-white/10 px-3 py-1.5 rounded-md">
              <Clock className="w-4 h-4 text-[#a1a1aa]" /> {duration}
            </span>
            <button 
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              <PhoneOff className="w-4 h-4" /> {t('end_session')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Stream Area */}
        <div className="xl:col-span-2 space-y-6">
          <div className="glass-card overflow-hidden relative border-white/10 p-0 border-none shadow-[0_8px_30px_rgba(0,0,0,0.8)]">
            <LiveStreamView 
              students={stats?.students || []} 
              isActive={lesson.status === 'active'} 
              lessonId={Number(lessonId)} 
              isGroupWork={isGroupWork}
              browserCameraEnabled={browserCameraEnabled}
            />
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
             <div className="stat-card flex flex-col items-start p-5">
                <span className="text-xs font-medium text-[#71717a] mb-2 uppercase tracking-wide">{t('students')}</span>
                <span className="text-3xl font-semibold text-slate-800 tracking-tight">{stats?.total_students || 0}</span>
             </div>
             <div className="stat-card flex flex-col items-start p-5">
                <span className="text-xs font-medium text-[#71717a] mb-2 uppercase tracking-wide">{t('avg_engagement')}</span>
                <span className={`text-3xl font-semibold tracking-tight ${getScoreColor(stats?.avg_engagement || 0)}`}>
                  {stats?.avg_engagement !== undefined ? stats.avg_engagement.toFixed(1) : '0.0'}%
                </span>
             </div>
             <div className="stat-card flex flex-col items-start p-5">
                <span className="text-xs font-medium text-[#71717a] mb-2 uppercase tracking-wide">{t('highly_active')}</span>
                <span className="flex items-center gap-2 text-3xl font-semibold text-emerald-500 tracking-tight">
                  <CheckCircle className="w-5 h-5"/> {stats?.active_count || 0}
                </span>
             </div>
             <div className="stat-card flex flex-col items-start p-5">
                <span className="text-xs font-medium text-[#71717a] mb-2 uppercase tracking-wide">{t('moderate_focus')}</span>
                <span className="flex items-center gap-2 text-3xl font-semibold text-amber-500 tracking-tight">
                  <Activity className="w-5 h-5"/> {stats?.moderate_count || 0}
                </span>
             </div>
             <div className="stat-card flex flex-col items-start p-5">
                <span className="text-xs font-medium text-[#71717a] mb-2 uppercase tracking-wide">{t('low_engagement')}</span>
                <span className="flex items-center gap-2 text-3xl font-semibold text-red-500 tracking-tight">
                  <PauseCircle className="w-5 h-5"/> {stats?.passive_count || 0}
                </span>
             </div>
          </div>
        </div>

        {/* Right Sidebar Area */}
        <div className="space-y-6">
          {/* Alerts Card */}
          <div className="glass-card flex flex-col h-[400px]">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#a1a1aa]" /> {t('attention_required')}
              </h3>
              <span className="bg-white/10 text-white text-xs font-medium px-2 py-0.5 rounded-full">{alerts.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {alerts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#71717a]">
                  <p className="text-sm">{t('no_recent_alerts')}</p>
                </div>
              ) : (
                alerts.map((alert, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/5 rounded-lg p-3 animate-fade-in-up">
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-sm font-medium text-slate-800">
                        {alert.student_id ? `Student #${alert.student_id}` : 'Sinfxonada'}
                      </span>
                      <span className="text-xs text-[#71717a]">{alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : ''}</span>
                    </div>
                    <p className="text-sm text-[#a1a1aa] mb-3">{alert.message}</p>
                    <div className="flex gap-2">
                      <span className="text-xs text-[#71717a]">Score: <span className="text-slate-800 font-medium">{alert.engagement_score?.toFixed(1) || '0.0'}%</span></span>
                      <span className="text-xs text-[#71717a] px-2 border-l border-white/10">State: <span className="text-slate-800 font-medium">{alert.posture_state || 'unknown'}</span></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Timeline Chart */}
          <div className="glass-card p-5 hidden md:block border-white/10">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">{t('engagement_index')}</h3>
            <div className="h-[200px] w-full flex items-center justify-center relative">
               {(!stats?.timeline_history || stats.timeline_history.length === 0) ? (
                 <div className="text-sm text-[#71717a]">{t('processing_analytics')}</div>
               ) : (
                 <TimelineChart data={stats?.timeline_history || []} />
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
