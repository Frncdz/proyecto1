import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

export function useToast() {
  const [toast, setToast] = useState(null)

  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  function hideToast() {
    setToast(null)
  }

  return { toast, showToast, hideToast }
}

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [toast, onClose])

  if (!toast) return null

  const isSuccess = toast.type === 'success'

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border
        ${isSuccess
          ? 'bg-neutral-900 border-green-500/40 text-green-400'
          : 'bg-neutral-900 border-red-500/40 text-red-400'
        }`}>
        {isSuccess
          ? <CheckCircle size={18} />
          : <XCircle size={18} />
        }
        <span className="text-sm text-neutral-200">{toast.message}</span>
        <button onClick={onClose} className="ml-2 text-neutral-500 hover:text-neutral-300">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
