import { useState } from 'react'
import { UtensilsCrossed, Users, Clock, X, Check } from 'lucide-react'

export default function SessionGate({ status, ownerName, createSession, joinSession }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await createSession(name.trim())
    setLoading(false)
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await joinSession(name.trim())
    setLoading(false)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-700 border-t-gold-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <X size={28} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Solicitud rechazada</h2>
          <p className="text-neutral-400 text-sm">El dueño de la mesa no aceptó tu solicitud.</p>
          <p className="text-neutral-600 text-xs mt-3">Podés volver a escanear el QR para intentarlo de nuevo.</p>
        </div>
      </div>
    )
  }

  if (status === 'closed') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed size={28} className="text-gold-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">¡Gracias por su visita!</h2>
          <p className="text-neutral-600 text-xs mt-4">Mesa cerrada</p>
        </div>
      </div>
    )
  }

  if (status === 'waiting_approval') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-yellow-400 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Esperando aprobación</h2>
          <p className="text-neutral-400 text-sm">
            Le avisamos a <span className="text-white font-medium">{ownerName}</span> que querés unirte.
          </p>
          <p className="text-neutral-600 text-xs mt-3">Esta pantalla se actualizará automáticamente.</p>
        </div>
      </div>
    )
  }

  if (status === 'enter_name') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed size={28} className="text-gold-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Bienvenido</h2>
            <p className="text-neutral-400 text-sm">¿Cómo te llamás?</p>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tu nombre"
              maxLength={40}
              className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-gold-500 text-sm"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-neutral-900 font-semibold rounded-xl transition-colors text-sm"
            >
              {loading ? 'Abriendo mesa...' : 'Abrir mesa'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (status === 'join_existing') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Mesa abierta</h2>
            <p className="text-neutral-400 text-sm">
              Esta mesa fue abierta por{' '}
              <span className="text-white font-medium">{ownerName}</span>.
              ¿Deseas unirte?
            </p>
          </div>
          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tu nombre"
              maxLength={40}
              className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-gold-500 text-sm"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-neutral-900 font-semibold rounded-xl transition-colors text-sm"
            >
              {loading ? 'Solicitando...' : 'Unirme a la mesa'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return null
}
