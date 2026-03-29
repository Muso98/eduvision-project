'use client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface TimelineData {
  timestamp: string;
  avg_engagement: number;
}

export default function TimelineChart({ data }: { readonly data: TimelineData[] }) {
  const chartData = data.map(d => {
    try {
      const ts = d.timestamp || (d as any).time;
      if (!ts) return { time: '--:--', engagement: Math.round(d.avg_engagement || 0) };
      
      const date = new Date(ts);
      const isValid = !isNaN(date.getTime());
      
      let timeStr = '??:??';
      if (isValid) {
        timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      } else if (typeof ts === 'string' && ts.includes(':')) {
        // Fallback for HH:MM:SS strings if Date parsing fails
        timeStr = ts.split(':').slice(0, 2).join(':');
      }

      return {
        time: timeStr,
        engagement: Math.round(d.avg_engagement || 0)
      };
    } catch (e) {
      return { time: '--:--', engagement: Math.round(d.avg_engagement || 0) };
    }
  })

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorEngLive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{fill: '#a1a1aa', fontSize: 10}} 
            dy={10} 
            minTickGap={30} 
        />
        <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{fill: '#a1a1aa', fontSize: 10}} 
            dx={-10} 
            domain={[0, 100]} 
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
          itemStyle={{ color: '#10b981', fontWeight: 600 }}
          labelStyle={{ color: '#a1a1aa', fontSize: '12px' }}
          animationDuration={150}
        />
        <Area 
            type="monotone" 
            dataKey="engagement" 
            stroke="#10b981" 
            strokeWidth={2} 
            fillOpacity={1} 
            fill="url(#colorEngLive)" 
            isAnimationActive={false} 
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
