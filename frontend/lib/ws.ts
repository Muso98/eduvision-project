import { useEffect, useRef, useState } from 'react'
import Cookies from 'js-cookie'

const getWsUrl = () => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${protocol}//${window.location.host}`;
    }
  }
  return process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000';
}

const WS_URL = getWsUrl();

export type WSMessage = {
  type?: string
  [key: string]: any
}

export default function useDashboardSocket(lessonId: number | null) {
  const [stats, setStats] = useState<any>(null)
  const [alerts, setAlerts] = useState<any[]>([])

  const wsDashboard = useRef<WebSocket | null>(null)
  const wsAlerts = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!lessonId) return

    let isSubscribed = true

    const getToken = () => Cookies.get('access_token') || ''

    const connectDashboard = () => {
      if (!isSubscribed) return
      const token = getToken()
      const url = token
        ? `${WS_URL}/ws/dashboard/${lessonId}/?token=${token}`
        : `${WS_URL}/ws/dashboard/${lessonId}/`
      wsDashboard.current = new WebSocket(url)
      
      wsDashboard.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setStats(data)
        } catch {}
      }

      wsDashboard.current.onerror = (err) => {
        console.warn('[Dashboard WS] Error:', err)
      }

      wsDashboard.current.onclose = (e) => {
        if (isSubscribed && e.code !== 4001) {
          setTimeout(connectDashboard, 3000)
        }
      }
    }
    connectDashboard()

    const connectAlerts = () => {
      if (!isSubscribed) return
      const token = getToken()
      const url = token
        ? `${WS_URL}/ws/alerts/${lessonId}/?token=${token}`
        : `${WS_URL}/ws/alerts/${lessonId}/`
      wsAlerts.current = new WebSocket(url)
      
      wsAlerts.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data) {
            setAlerts(prev => [data, ...prev].slice(0, 50))
          }
        } catch {}
      }

      wsAlerts.current.onerror = (err) => {
        console.warn('[Alerts WS] Error:', err)
      }

      wsAlerts.current.onclose = (e) => {
        if (isSubscribed && e.code !== 4001) {
          setTimeout(connectAlerts, 3000)
        }
      }
    }
    connectAlerts()

    return () => {
      isSubscribed = false
      wsDashboard.current?.close()
      wsAlerts.current?.close()
    }
  }, [lessonId])

  return { stats, alerts }
}
