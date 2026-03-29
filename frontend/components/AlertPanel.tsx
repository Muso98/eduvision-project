import { AlertCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export type AlertMessage = {
  id: string
  message: string
  timestamp: string
  avg_engagement: number
}

interface AlertPanelProps {
  alerts: AlertMessage[]
  onDismiss: (id: string) => void
}

export default function AlertPanel({ alerts, onDismiss }: AlertPanelProps) {
  if (alerts.length === 0) return null

  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {alerts.map((alert) => (
        <div 
          key={alert.id}
          className="glass-card bg-red-500/10 border-red-500/30 p-4 alert-pulse shadow-lg shadow-red-500/10 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="text-red-200 font-medium mb-1">{alert.message}</p>
            <p className="text-slate-400 text-xs">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <button 
            onClick={() => onDismiss(alert.id)}
            className="text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
