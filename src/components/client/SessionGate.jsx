import { useState } from 'react'
import { UtensilsCrossed, Users, Clock, X, QrCode, SmilePlus } from 'lucide-react'

const NUMPAD = ['7','8','9','4','5','6','1','2','3','⌫','0','✓']

export default function SessionGate({ status, ownerName, createSession, joinSession, children }) {
  const [name, setName]           = useState('')
  const [partySize, setPartySize] = useState('')
  const [step, setStep]           = useState(1) // 1=nombre, 2=tamaño del grupo
  const [loading, setLoading]     = useState(false)

  function handleNumpad(key) {
    if (key === '⌫') {
      setPartySize(prev => prev.slice(0, -1))
    } else if (key === '✓') {
      handleCreate()
    } else {
      setPartySize(prev => {
        const next = prev + key
        const n = parseInt(next, 10)
        if (n < 1 || n > 99) return prev
        return next
      })
    }
  }

  async function handleCreate() {
    const size = parseInt(partySize, 10)
    if (!name.trim() || isNaN(size) || size < 1) return
    setLoading(true)
    await createSession(name.trim(), size)
    setLoading(false)
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await joinSession(name.trim())
    setLoading(false)
  }

  // ── Aprobado: mostrar el menú ──────────────────────────────────────────────
  if (status === 'approved') return <>{children}</>

  // ── Cargando ───────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-700 border-t-gold-500 rounded-full animate-spin" />
      </div>
    )
  }

  // ── Mesa cerrada ───────────────────────────────────────────────────────────
  if (status === 'closed') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed size={28} className="text-gold-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">¡Hasta la próxima!</h2>
          <p className="text-neutral-400 text-sm mb-6">Esta sesión de mesa ha finalizado.</p>
          <div className="flex items-start gap-3 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-left">
            <QrCode size={18} className="text-neutral-400 shrink-0 mt-0.5" />
            <p className="text-sm text-neutral-300">
              Para iniciar una nueva sesión cerrá esta página y escaneá el QR de la mesa nuevamente.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Solicitud rechazada ────────────────────────────────────────────────────
  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <X size={28} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Solicitud rechazada</h2>
          <p className="text-neutral-400 text-sm mb-6">
            El dueño de la mesa no aceptó tu solicitud.
          </p>
          <div className="flex items-start gap-3 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-left">
            <QrCode size={18} className="text-neutral-400 shrink-0 mt-0.5" />
            <p className="text-sm text-neutral-300">
              Podés volver a escanear el QR para intentarlo de nuevo.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Mesa completa ──────────────────────────────────────────────────────────
  if (status === 'table_full') {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-neutral-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Mesa completa</h2>
          <p className="text-neutral-400 text-sm">Esta mesa ya alcanzó su capacidad máxima.</p>
          <p className="text-neutral-600 text-xs mt-3">Consultá con el mozo si necesitás un lugar.</p>
        </div>
      </div>
    )
  }

  // ── Esperando aprobación del dueño ─────────────────────────────────────────
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
          <p className="text-neutral-600 text-xs mt-3">Esta pantalla se actualiza automáticamente.</p>
        </div>
      </div>
    )
  }

  // ── Unirse a mesa existente ────────────────────────────────────────────────
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
              ¿Querés unirte?
            </p>
          </div>
          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tu nombre"
              maxLength={40}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-gold-500 text-sm"
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

  // ── Abrir mesa nueva (2 pasos) ─────────────────────────────────────────────
  if (status === 'enter_name') {
    // Paso 1: nombre
    if (step === 1) {
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
            <div className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(2)}
                placeholder="Tu nombre"
                maxLength={40}
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-gold-500 text-sm"
              />
              <button
                onClick={() => name.trim() && setStep(2)}
                disabled={!name.trim()}
                className="w-full py-3.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-neutral-900 font-semibold rounded-xl transition-colors text-sm"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Paso 2: tamaño del grupo (numpad)
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <button
              onClick={() => setStep(1)}
              className="text-xs text-neutral-500 hover:text-neutral-300 mb-4 flex items-center gap-1 mx-auto transition-colors"
            >
              ← Volver
            </button>
            <div className="w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center mx-auto mb-4">
              <SmilePlus size={28} className="text-gold-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">¿Mesa para cuántas personas?</h2>
            <p className="text-neutral-400 text-sm">
              Hola, <span className="text-white">{name}</span>
            </p>
          </div>

          {/* Display numérico */}
          <div className="mb-4 h-16 flex items-center justify-center bg-neutral-900 border border-neutral-700 rounded-xl">
            <span className="text-4xl font-bold text-white tracking-wider">
              {partySize || '—'}
            </span>
          </div>

          {/* Teclado numérico */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {NUMPAD.map(key => (
              <button
                key={key}
                onClick={() => handleNumpad(key)}
                className={`h-14 rounded-xl text-lg font-semibold transition-colors ${
                  key === '✓'
                    ? 'bg-gold-500 hover:bg-gold-600 text-neutral-900'
                    : key === '⌫'
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <button
            onClick={handleCreate}
            disabled={loading || !partySize || parseInt(partySize, 10) < 1}
            className="w-full py-3.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-neutral-900 font-semibold rounded-xl transition-colors text-sm"
          >
            {loading ? 'Abriendo mesa...' : 'Abrir mesa'}
          </button>
        </div>
      </div>
    )
  }

  return null
}
