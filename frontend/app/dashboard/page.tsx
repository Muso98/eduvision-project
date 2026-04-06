'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getLessons, getClassrooms, getReports, startLesson, stopLesson } from '@/lib/api'
import { Play, Square, Video, Plus, Clock, Users, ChevronRight, Activity, Loader2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import ActivityCard from '@/components/ActivityCard'
import { useLanguage } from '@/contexts/LanguageContext'

export default function DashboardHome() {
  const { t } = useLanguage()
  const router = useRouter()
  const [lessons, setLessons] = useState<any[]>([])
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  
  // Form state
  const [title, setTitle] = useState('')
  const [classroomId, setClassroomId] = useState('')

  const loadData = async () => {
    try {
      const [lesRes, clsRes, repRes] = await Promise.all([getLessons(), getClassrooms(), getReports()])
      setLessons(lesRes.data)
      setClassrooms(clsRes.data)
      setReports(repRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleStartLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await startLesson({ title, classroom_id: Number(classroomId) })
      setShowModal(false)
      loadData()
    } catch (e) {
      alert('Error starting lesson')
    }
  }

  const handleStopLesson = async (id: number) => {
    if (!confirm(t('end_confirm'))) return
    try {
      await stopLesson(id)
      loadData()
    } catch (e: any) {
      const msg = e?.response?.data?.error || e.message || 'Error stopping lesson'
      alert(`Xatolik: ${msg}`)
      loadData()
    }
  }

  const activeLessons = lessons.filter(l => l.status === 'active')

  return (
    <div className="space-y-10 animate-fade-in-up">
      {/* Header & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('overview')}</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">{t('real_time_stats')}</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary text-sm px-4 py-2 flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" /> {t('start_lesson')}
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActivityCard
          title={t('active_sessions')}
          value={activeLessons.length}
          icon={<Play className="w-4 h-4" />}
          color="blue"
        />
        <ActivityCard
          title={t('total_sessions')}
          value={lessons.length}
          icon={<Video className="w-4 h-4" />}
          color="green"
        />
        <ActivityCard
          title={t('classrooms')}
          value={classrooms.length}
          icon={<Users className="w-4 h-4" />}
          color="yellow"
        />
      </div>

      {/* Engagement Trend Chart */}
      {!loading && reports.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{t('engagement_history')}</h3>
              <p className="text-sm text-slate-500 font-medium">{t('avg_attention_history')}</p>
            </div>
          </div>
          <div className="h-[200px] sm:h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={[...reports].reverse().map(r => ({
                  name: new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                  engagement: Math.round(r.avg_engagement)
                }))} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={-10} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                  formatter={(value: any) => [`${value}%`, 'Engagement']}
                />
                <Area type="monotone" dataKey="engagement" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorEng)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-6">{t('recent_lessons')}</h3>

        {loading ? (
          <div className="flex space-x-2 py-10">
             <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce shadow-sm" />
             <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.1s' }} />
             <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map(lesson => (
              <div key={lesson.id} className="glass-card flex flex-col p-6 group">
                <div className="flex justify-between items-start mb-4">
                  {lesson.is_processing ? (
                    <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {t('analyzing') || 'Analyzing...'}
                    </span>
                  ) : (
                    <span className={`badge-${lesson.status === 'active' ? 'active' : lesson.status === 'ended' ? 'ended' : 'passive'} flex items-center gap-1.5 shadow-sm`}>
                      {lesson.status === 'active' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      {lesson.status.charAt(0).toUpperCase() + lesson.status.slice(1)}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 flex items-center gap-1.5 font-semibold">
                    {new Date(lesson.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <h4 className="text-lg font-bold text-slate-900 mb-1 tracking-tight">{lesson.title}</h4>
                <p className="text-sm text-slate-500 mb-8 font-medium">{lesson.classroom_detail?.name} <span className="text-slate-300 mx-1">•</span> {lesson.teacher_detail?.fullname}</p>

                <div className="mt-auto flex gap-3 z-10">
                  {lesson.status === 'active' && (
                    <>
                      <Link
                        href={`/dashboard/live/${lesson.id}`}
                        className="flex-1 flex justify-center items-center gap-2 btn-secondary text-sm px-4 py-2"
                      >
                        <Video className="w-4 h-4" /> {t('live')}
                      </Link>
                      <button
                        onClick={() => handleStopLesson(lesson.id)}
                        className="flex-1 flex justify-center items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm"
                      >
                        {t('end')}
                      </button>
                    </>
                  )}
                  {lesson.status === 'ended' && (
                    <Link
                      href={`/dashboard/reports/${lesson.id}`}
                      className="w-full flex justify-between items-center btn-secondary text-sm px-4 py-2 group/btn"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        {t('view_report')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover/btn:translate-x-1 group-hover/btn:text-slate-900 transition-transform" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {lessons.length === 0 && (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                <p className="text-sm font-medium text-slate-400">{t('no_sessions')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="glass-card w-full max-w-md p-6 animate-fade-in relative z-10 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-6">{t('start_new_session')}</h3>
            <form onSubmit={handleStartLesson} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">{t('title')}</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full input-minimal px-4 py-2.5 text-sm"
                  placeholder="e.g. Linear Algebra 101"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">{t('classroom')}</label>
                <select
                  required
                  value={classroomId}
                  onChange={(e) => setClassroomId(e.target.value)}
                  className="w-full input-minimal px-4 py-2.5 text-sm appearance-none"
                >
                  <option value="" disabled>{t('select_classroom')}</option>
                  {classrooms.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-primary px-5 py-2 text-sm"
                >
                  {t('start_lesson')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
