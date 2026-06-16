import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

let _addToast = null
export const toast = {
  success: (msg) => _addToast?.({ msg, type: 'success' }),
  error: (msg) => _addToast?.({ msg, type: 'error' }),
  info: (msg) => _addToast?.({ msg, type: '' }),
}

export default function Toast() {
  const [toasts, setToasts] = useState([])

  _addToast = useCallback(({ msg, type }) => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  return (
    <div className="toast-container">
      {toasts.map(({ id, msg, type }) => (
        <div key={id} className={`toast ${type}`}>{msg}</div>
      ))}
    </div>
  )
}
