'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface PieProps {
  active: number
  moderate: number
  passive: number
}

export default function EngagementPieChart({ active, moderate, passive }: PieProps) {
  const data = [
    { name: 'Highly Active', value: active, color: '#10b981' },
    { name: 'Moderate Focus', value: moderate, color: '#f59e0b' },
    { name: 'Low Engagement', value: passive, color: '#ef4444' }
  ]

  // Filter out 0 values so they don't render tiny empty slices
  const activeData = data.filter(d => d.value > 0)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={activeData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={5}
          dataKey="value"
          stroke="rgba(0,0,0,0)"
        >
          {activeData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          cursor={{fill: 'transparent'}}
          contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }}
          itemStyle={{ fontWeight: 600, color: '#fff' }}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          iconType="circle"
          formatter={(value) => <span className="text-xs text-slate-300 font-medium ml-1">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
