'use client'
import { useState, useRef } from 'react'
import { analyzeVideo, analyzeVideoStandalone } from '@/lib/api'
import { Upload, Film, CheckCircle, AlertCircle, BarChart2, Clock, Users, Loader2, Eye, Download } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { useLanguage } from '@/contexts/LanguageContext'

interface VideoAnalysisResult {
  duration_seconds: number
  avg_engagement: number
  active_pct: number
  moderate_pct: number
  passive_pct: number
  timeline: { time: number; engagement: number; count: number }[]
  recognized_students: string[]
  frames_analyzed: number
  max_students_in_frame: number
  lesson_id?: number
}

export default function VideoUploadAnalysis({ lessonId }: { lessonId?: number }) {
  const { t } = useLanguage()
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<VideoAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { locale } = useLanguage()

  const handleFile = (f: File) => {
    setFile(f)
    setResult(null)
    setError(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('video/')) handleFile(f)
  }

  const handleAnalyze = async () => {
    if (!file) return
    setUploading(true)
    setUploadPct(0)
    setError(null)
    try {
      const onProgress = (pct: number) => {
        setUploadPct(pct)
        if (pct === 100) { setUploading(false); setAnalyzing(true) }
      }

      const res = lessonId 
        ? await analyzeVideo(lessonId, file, onProgress)
        : await analyzeVideoStandalone(file, onProgress)
        
      if (res.data?.error) {
        setError(res.data.error)
        setResult(null)
      } else {
        setResult(res.data)
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Tahlil xatosi yuz berdi. Video kadrlarida yuz aniqlanmagan bo\'lishi mumkin.')
      setResult(null)
    } finally {
      setUploading(false)
      setAnalyzing(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!result?.lesson_id) return
    setExporting(true)
    try {
      const { exportReportPdf } = await import('@/lib/api')
      const response = await exportReportPdf(result.lesson_id, locale)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report_${result.lesson_id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
    } catch (err) {
      console.error('Failed to export PDF', err)
      alert('PDF yuklab olishda xatolik yuz berdi.')
    } finally {
      setExporting(false)
    }
  }

  const getScoreColor = (score: number = 0) =>
    score >= 75 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500'

  const formatDuration = (sec: number = 0) => {
    const s_num = Number(sec) || 0
    const m = Math.floor(s_num / 60)
    const s = Math.floor(s_num % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      {!result && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
            ${dragging
              ? 'border-blue-400 bg-blue-50/5 scale-[1.01]'
              : file
                ? 'border-emerald-400 bg-emerald-50/5'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100/50'
            }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          <div className="flex flex-col items-center gap-3">
            {file ? (
              <>
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Film className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-base">{file.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <p className="text-xs text-slate-400">Boshqa video tanlash uchun bosing</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700 text-base">Sinf xona videosini yuklang</p>
                  <p className="text-sm text-slate-500 mt-1">MP4, AVI, MOV, MKV formatlar qo'llab-quvvatlanadi</p>
                </div>
                <p className="text-xs text-slate-400">Suring yoki bosing</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Progress */}
      {(uploading || analyzing) && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            {uploading ? `Yuklanmoqda... ${uploadPct}%` : 'Tahlil qilinmoqda... (bir necha daqiqa ketishi mumkin)'}
          </div>
          {uploading && (
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadPct}%` }}
              />
            </div>
          )}
          {analyzing && (
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-amber-400 h-2 rounded-full animate-pulse w-1/2" />
            </div>
          )}
        </div>
      )}

      {/* Analyze Button */}
      {file && !result && !uploading && !analyzing && (
        <button
          onClick={handleAnalyze}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <BarChart2 className="w-5 h-5" />
          Videoni tahlil qilish
        </button>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Reset & Export */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-slate-800">Tahlil natijalari</h3>
            <div className="flex items-center gap-3">
              {result.lesson_id && (
                <button
                  onClick={handleDownloadPdf}
                  disabled={exporting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-emerald-500/10 disabled:opacity-50"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  PDF Hisobotini Yuklash
                </button>
              )}
              <button
                onClick={() => { setResult(null); setFile(null) }}
                className="text-sm text-slate-500 hover:text-slate-700 underline"
              >
                Yangi video yuklash
              </button>
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" /> O'rtacha faollik
              </div>
              <div className={`text-3xl font-bold ${getScoreColor(result.avg_engagement)}`}>
                {result.avg_engagement || 0}%
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Davomiyligi
              </div>
              <div className="text-3xl font-bold text-slate-800">{formatDuration(result.duration_seconds)}</div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" /> Tahlil qilingan
              </div>
              <div className="text-3xl font-bold text-slate-800">{result.frames_analyzed || 0} <span className="text-base font-normal">kadr</span></div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Max talabalar
              </div>
              <div className="text-3xl font-bold text-slate-800">{result.max_students_in_frame || 0}</div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Ko'z tahlili
              </div>
              <div className="text-3xl font-bold text-slate-800">Faol</div>
            </div>
          </div>

          {/* Activity Distribution */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-slate-700">Faollik taqsimoti</h4>
              <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 border border-slate-100 rounded-md">AI EYE DETECTION</span>
            </div>
            <div className="space-y-4">
              {[
                { label: '✅ Diqqat bilan qaramoqda', desc: 'Ikkala ko\'z ham kadrda aniq ko\'ringan', pct: Number(result.active_pct || 0), color: 'bg-emerald-500' },
                { label: '⚠️ Chalg\'igandek', desc: 'Faqat bitta ko\'z yoki yuz burilgan', pct: Number(result.moderate_pct || 0), color: 'bg-amber-400' },
                { label: '🔴 Pas e\'tibor', desc: 'Ko\'zlar ko\'rinmayapti yoki yuz mutlaqo chetga burilgan', pct: Number(result.passive_pct || 0), color: 'bg-red-400' },
              ].map(({ label, desc, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1 items-end">
                    <div>
                      <span className="text-slate-600 font-semibold">{label}</span>
                      <p className="text-[11px] text-slate-400 leading-none mt-1">{desc}</p>
                    </div>
                    <span className="text-slate-800 font-bold">{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-1.5">
                    <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Chart */}
          {result.timeline?.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-700 mb-4">Faollik dinamikasi (vaqt bo'yicha)</h4>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.timeline} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
                      tickFormatter={v => `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, '0')}`}
                      tick={{ fontSize: 10, fill: '#71717a' }}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Tooltip
                      formatter={(v: any) => [`${v}%`, 'Engagement']}
                      labelFormatter={v => `${Math.floor(Number(v) / 60)}:${String(Math.floor(Number(v) % 60)).padStart(2, '0')}`}
                    />
                    <Area type="monotone" dataKey="engagement" stroke="#10b981" strokeWidth={2} fill="url(#engGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recognized Students */}
          {result.recognized_students?.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Tizim tomonidan tanilgan talabalar
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.recognized_students.map(name => (
                  <span key={name} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-sm font-medium">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
