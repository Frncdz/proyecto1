import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Bell, CheckCircle } from 'lucide-react'

export default function CallWaiterButton({ restaurantId, tableId }) {
  const [status, setStatus] = useState('idle') // idle | sending | sent | cooldown

  async function callWaiter() {
    if (status !== 'idle') return
    setStatus('sending')

    const { error } = await supabase.from('waiter_calls').insert({
      restaurant_id: restaurantId,
      table_id: tableId,
      status: 'pending',
    })

    if (error) {
      setStatus('idle')
      return
    }

    setStatus('sent')
    // Cooldown de 30 segundos para evitar spam
    setTimeout(() => setStatus('idle'), 30000)
  }

  if (status === 'sent') {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
        <CheckCircle size={18} />
        ¡Mozo en camino! Espera un momento.
      </div>
    )
  }

  return (
    <button
      onClick={callWaiter}
      disabled={status !== 'idle'}
      className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 border border-neutral-700 hover:border-neutral-600 text-neutral-200 rounded-xl text-sm font-medium transition-colors"
    >
      <Bell size={16} className={status === 'sending' ? 'animate-pulse' : ''} />
      {status === 'sending' ? 'Llamando...' : 'Llamar al mozo'}
    </button>
  )
}
