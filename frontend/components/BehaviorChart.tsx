'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useLanguage } from '@/contexts/LanguageContext'

interface BehaviorProps {
  data: Record<string, number>
}

export default function BehaviorChart({ data }: BehaviorProps) {
  const { t } = useLanguage()

  // Define translations for behavior labels
  const BEHAVIOR_LABELS: Record<string, string> = {
    'attentive':       t('behavior_attentive') || 'Attentive',
    'reading_writing': t('behavior_writing')   || 'Writing/Reading',
    'raising_hand':    t('behavior_raising')   || 'Raising Hand',
    'distracted':      t('behavior_distracted')|| 'Distracted',
    'lookup':          t('behavior_lookup')    || 'Looking Forward',
    'bow':             t('behavior_bow')       || 'Writing/Reading',
    'sit':             t('behavior_sit')       || 'Sitting Neutral',
    'down':            t('behavior_down')      || 'Looking Away',
    'sleep':           t('behavior_sleep')     || 'Sleeping',
  }

  const BEHAVIOR_COLORS: Record<string, string> = {
    'attentive':       '#10b981', // green-500
    'reading_writing': '#3b82f6', // blue-500
    'raising_hand':    '#a855f7', // purple-500
    'distracted':      '#f59e0b', // amber-500
    'lookup':          '#10b981', // green
    'bow':             '#3b82f6', // blue
    'sit':             '#94a3b8', // slate-400
    'down':            '#f59e0b', // amber
    'sleep':           '#ef4444', // red
  }

  // Convert raw object into Recharts format
  const chartData = Object.entries(data || {}).map(([key, value]) => ({
    name: BEHAVIOR_LABELS[key] || key,
    value,
    color: BEHAVIOR_COLORS[key] || '#71717a'
  }))

  const activeData = chartData.filter(d => d.value > 0)

  if (activeData.length === 0) {
    return <div className="text-[#a1a1aa] text-sm">No behavior data detected</div>
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={activeData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={4}
          dataKey="value"
          stroke="rgba(0,0,0,0)"
        >
          {activeData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#18181b', 
            borderColor: 'rgba(255,255,255,0.1)', 
            borderRadius: '10px', 
            color: '#fff',
            fontSize: '12px'
          }}
          itemStyle={{ color: '#fff' }}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          iconType="circle"
          formatter={(value) => <span className="text-[10px] text-slate-300 font-medium ml-1">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
