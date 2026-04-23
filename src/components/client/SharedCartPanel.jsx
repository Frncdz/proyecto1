import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Trash2, ChefHat, Check, Users, Send, AlertCircle, Clock } from 'lucide-react'

export default function SharedCartPanel({
  byParticipant, grandTotal, cartItems,
  isOwner, myParticipantId,
  participants, allReady, session,
  myParticipant, markOrderReady,
  removeItem, updateQuantity,
  restaurantId, tableId, onOrderSent, onViewBill,
  closeSession,
}) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [notes, setNotes] = useState('')
  const [orderError, setOrderError] = useState(null)

  useEffect(() => {
    if (sent && cartItems.length > 0) setSent(false)
  }, [cartItems.length])

  const myOrderReady = myParticipant?.order_ready ?? false
  const hasMyItems = cartItems.some(c => c.participant_id === myParticipantId)

  async function submitOrder() {
    if (!isOwner || sending) return
    setSending(true)
    setOrderError(null)

    const orderId = crypto.randomUUID()
    const total = cartItems.reduce((sum, c) => sum + c.unit_price * c.quantity, 0)

    const { error: orderErr } = await supabase.from('orders').insert({
      id: orderId,
      restaurant_id: restaurantId,
      table_id: tableId,
      notes: notes.trim() || null,
      total,
    })
    if (orderErr) {
      setOrderError('No se pudo enviar el pedido. Intentá de nuevo.')
      setSending(false)
      return
    }

    const orderItems = cartItems.map(c => ({
      order_id: orderId,
      menu_item_id: c.menu_item_id,
      item_name: c.item_name,
      quantity: c.quantity,
      unit_price: c.unit_price,
    }))
    await supabase.from('order_items').insert(orderItems)

    // Clear cart and reset ready flags
    await supabase
      .from('session_cart_items')
      .delete()
      .eq('session_id', session.id)

    await supabase
      .from('session_participants')
      .update({ order_ready: false })
      .eq('session_id', session.id)

    setSending(false)
    setSent(true)
    onOrderSent?.()
  }

  if (sent) {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
          <Clock size={26} className="text-yellow-400 animate-pulse" />
        </div>
        <p className="text-white font-semibold">Esperando confirmación</p>
        <p className="text-neutral-400 text-sm mt-1">La cocina está revisando tu pedido.</p>
        {onViewBill && (
          <button
            onClick={onViewBill}
            className="mt-6 px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-sm font-medium transition-colors"
          >
            Ver cuenta
          </button>
        )}
      </div>
    )
  }

  const groups = Object.values(byParticipant)

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500">
        <ChefHat size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">El carrito está vacío.</p>
        <p className="text-xs mt-1">Agregá platos desde el menú.</p>
        {isOwner && closeSession && (
          <button
            onClick={() => {
              if (confirm('¿Cerrar la mesa? Todos los participantes serán desconectados.')) closeSession()
            }}
            className="mt-8 px-5 py-2.5 border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-xl text-sm font-medium transition-colors"
          >
            Cerrar mesa
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Items por persona */}
      {groups.map(group => {
        const isMe = group.participantId === myParticipantId
        return (
          <div key={group.participantId} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-800 bg-neutral-800/50">
              <Users size={13} className="text-neutral-400" />
              <span className="text-xs font-medium text-neutral-300">
                {isMe ? `${group.name} (vos)` : group.name}
              </span>
            </div>
            <div className="px-4 py-3 space-y-2">
              {group.items.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-200 truncate">{item.item_name}</p>
                    <p className="text-xs text-neutral-500">${Number(item.unit_price).toLocaleString('es-AR')} c/u</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(isMe || isOwner) && (
                      <>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white text-xs flex items-center justify-center"
                        >−</button>
                        <span className="text-sm text-white w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white text-xs flex items-center justify-center"
                        >+</button>
                      </>
                    )}
                    {!isMe && !isOwner && (
                      <span className="text-sm text-white">{item.quantity}</span>
                    )}
                    <span className="text-sm text-neutral-400 w-16 text-right">
                      ${Number(item.unit_price * item.quantity).toLocaleString('es-AR')}
                    </span>
                    {(isMe || isOwner) && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-6 h-6 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Total */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl">
        <span className="text-white font-semibold">Total</span>
        <span className="text-xl font-bold text-gold-400">${grandTotal.toLocaleString('es-AR')}</span>
      </div>

      {/* Estado de "listo para pedir" */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 space-y-2">
        <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide">¿Todos listos?</p>
        {participants.map(p => (
          <div key={p.id} className="flex items-center justify-between text-sm">
            <span className="text-neutral-300">{p.name}{p.id === myParticipantId ? ' (vos)' : ''}</span>
            {p.order_ready
              ? <span className="flex items-center gap-1 text-green-400 text-xs"><Check size={12} /> Listo</span>
              : <span className="text-neutral-600 text-xs">Eligiendo...</span>
            }
          </div>
        ))}
      </div>

      {/* Botón "Listo para pedir" — toggle para todos */}
      {hasMyItems && (
        <button
          onClick={() => markOrderReady(myParticipantId, !myOrderReady)}
          className={`w-full py-3 font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 ${
            myOrderReady
              ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
              : 'bg-neutral-800 hover:bg-neutral-700 text-white'
          }`}
        >
          <Check size={16} />
          {myOrderReady ? 'Listo ✓ — toca para desmarcar' : 'Listo para pedir'}
        </button>
      )}

      {/* Nota general (solo owner ve y puede editar) */}
      {isOwner && (
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Nota para la cocina (opcional)..."
          rows={2}
          className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-gold-500 resize-none"
        />
      )}

      {/* Error de envío */}
      {orderError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {orderError}
        </div>
      )}

      {/* Enviar comanda (solo owner, cuando todos están listos) */}
      {isOwner && (
        <button
          onClick={submitOrder}
          disabled={sending || !allReady}
          className="w-full py-3.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-40 text-neutral-900 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Send size={16} />
          {sending ? 'Enviando...' : allReady ? 'Enviar comanda' : 'Esperando que todos estén listos'}
        </button>
      )}
    </div>
  )
}
