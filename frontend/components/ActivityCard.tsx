import { ReactNode } from 'react'

interface ActivityCardProps {
  title: string
  value: number | string
  icon: ReactNode
  color: 'blue' | 'green' | 'yellow' | 'red'
}

export default function ActivityCard({ title, value, icon, color }: ActivityCardProps) {
  // Map semantic colors into minimalist subtle text tones instead of loud glowing colors
  let IconColorClass = "text-slate-500"
  if (color === 'blue') IconColorClass = "text-blue-500"
  else if (color === 'green') IconColorClass = "text-emerald-500"
  else if (color === 'yellow') IconColorClass = "text-amber-500"
  else if (color === 'red') IconColorClass = "text-red-500"

  return (
    <div className="stat-card">
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-sm font-semibold text-slate-500 tracking-tight">{title}</h4>
        <div className={`p-1.5 rounded-lg bg-slate-100/80 shadow-sm border border-black/5 ${IconColorClass}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
    </div>
  )
}
