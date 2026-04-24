import { useEffect, useRef } from 'react'
import { useAuthStore } from '../../auth/store'
import { toast } from 'sonner'
import { useNotificationsStore } from './store'

export function useWS() {
  const token = useAuthStore(s => s.token)
  const wsRef = useRef(null)
  const addIncoming = useNotificationsStore(s=>s.addIncoming)

  useEffect(() => {
    if (!token) return
    const url = (import.meta.env.VITE_WS_BASE || 'ws://localhost:8005') + `/ws?token=${token}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {}
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'notification') {
          addIncoming(msg.data)
          toast(msg.data.title, { description: msg.data.message })
        }
      } catch {
        // ignore
      }
    }
    ws.onclose = () => {}
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('ping')
    }, 20000)

    return () => { clearInterval(ping); try { ws.close() } catch {} }
  }, [token, addIncoming])
}
