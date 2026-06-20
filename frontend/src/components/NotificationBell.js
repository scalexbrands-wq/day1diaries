import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/api'
import { formatDistanceToNow } from 'date-fns'

export default function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef(null)

  const load = useCallback(() => {
    getNotifications().then(({ data }) => {
      setNotifications(data?.notifications || [])
      setUnreadCount(data?.unreadCount || 0)
    })
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleClick = async (n) => {
    if (!n.is_read) await markNotificationRead(n.id)
    setOpen(false)
    load()
    if (n.link) navigate(n.link)
  }

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead()
    load()
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', fontSize: 19, padding: 6 }}>
        🔔
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: 0, right: 0, background: '#FF6B2B', color: 'white', fontSize: 9.5, fontWeight: 700, borderRadius: 100, padding: '1px 5px', minWidth: 15, textAlign: 'center' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 320, background: 'white', borderRadius: 14, boxShadow: '0 8px 32px rgba(26,8,0,.15)', border: '1px solid #F0EAE4', zIndex: 200, maxHeight: 420, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #F0EAE4' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Notifications</div>
            {unreadCount > 0 && <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: '#FF6B2B', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>Mark all read</button>}
          </div>
          {notifications.length === 0 && <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: '#8C7B6E' }}>No notifications yet.</div>}
          {notifications.map(n => (
            <div key={n.id} onClick={() => handleClick(n)} style={{ padding: '12px 16px', borderBottom: '1px solid #F8F3EC', cursor: 'pointer', background: n.is_read ? 'white' : '#FFF8F1' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1A0800' }}>{n.title}</div>
              {n.body && <div style={{ fontSize: 11.5, color: '#8C7B6E', marginTop: 2 }}>{n.body}</div>}
              <div style={{ fontSize: 10, color: '#B0A8A0', marginTop: 3 }}>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
