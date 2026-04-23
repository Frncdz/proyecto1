import { useState } from 'react'
import { useCart } from '../../context/CartContext'
import { supabase } from '../../lib/supabase'
import { ShoppingCart, X, Minus, Plus, Trash2, Send } from 'lucide-react'

export default function Cart({ restaurantId, tableId, sessionId, onOrderSent }) {
  const { items, total, itemCount, orderNotes, dispatch } = useCart()
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)

  async function sendOrder() {
    if (items.length === 0) return
    setSending(true)

    // Generamos el ID en el cliente para no necesitar leer el registro recién insertado
    // (el cliente no tiene política SELECT en orders)
    const orderId = crypto.randomUUID()

    const { error } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        restaurant_id: restaurantId,
        table_id: tableId,
        session_id: sessionId ?? null,
        total,
        notes: orderNotes || null,
        status: 'pending',
      })

    if (error) {
      setSending(false)
      alert('Error al enviar el pedido. Intentá de nuevo.')
      return
    }

    const orderItems = items.map(i => ({
      order_id: orderId,
      menu_item_id: i.id,
      item_name: i.name,
      quantity: i.quantity,
      unit_price: i.price,
      notes: i.notes || null,
    }))

    await supabase.from('order_items').insert(orderItems)

    dispatch({ type: 'CLEAR' })
    setSending(false)
    setOpen(false)
    onOrderSent?.()
  }

  return (
    <>
      {/* Botón flotante carrito */}
      {itemCount > 0 && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:w-auto z-40 flex items-center justify-between sm:justify-center gap-3 px-5 py-4 bg-gold-500 hover:bg-gold-600 text-neutral-900 rounded-2xl shadow-xl font-semibold transition-colors"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} />
            <span>Ver pedido</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-neutral-900/20 rounded-lg px-2 py-0.5 text-sm">{itemCount} items</span>
            <span className="font-bold">${total.toLocaleString('es-AR')}</span>
          </div>
        </button>
      )}

      {/* Drawer carrito */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-neutral-800">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <ShoppingCart size={18} /> Tu pedido
              </h2>
              <button onClick={() => setOpen(false)} className="text-neutral-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{item.name}</p>
                    <p className="text-xs text-neutral-400">${Number(item.price).toLocaleString('es-AR')} c/u</p>
                    <input
                      placeholder="Nota (sin cebolla, etc.)"
                      value={item.notes}
                      onChange={e => dispatch({ type: 'UPDATE_NOTES', id: item.id, notes: e.target.value })}
                      className="mt-1 w-full text-xs bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-neutral-300 placeholder-neutral-600 outline-none focus:border-gold-500/50"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => dispatch({ type: 'UPDATE_QUANTITY', id: item.id, quantity: item.quantity - 1 })}
                      className="w-6 h-6 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center">
                      {item.quantity === 1 ? <Trash2 size={11} /> : <Minus size={11} />}
                    </button>
                    <span className="text-white text-sm w-4 text-center">{item.quantity}</span>
                    <button onClick={() => dispatch({ type: 'ADD_ITEM', item })}
                      className="w-6 h-6 rounded-full bg-gold-500 hover:bg-gold-600 text-neutral-900 flex items-center justify-center">
                      <Plus size={11} />
                    </button>
                  </div>
                  <span className="text-gold-400 text-sm font-medium shrink-0 w-16 text-right">
                    ${Number(item.price * item.quantity).toLocaleString('es-AR')}
                  </span>
                </div>
              ))}

              {/* Nota del pedido */}
              <div className="pt-2">
                <label className="text-xs text-neutral-500 uppercase tracking-wide">Aclaración del pedido</label>
                <textarea
                  value={orderNotes}
                  onChange={e => dispatch({ type: 'SET_ORDER_NOTES', notes: e.target.value })}
                  placeholder="Alguna aclaración general para el pedido..."
                  rows={2}
                  className="mt-1 w-full text-sm bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-300 placeholder-neutral-600 outline-none focus:border-gold-500/50 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-neutral-400">Total</span>
                <span className="text-xl font-bold text-white">${total.toLocaleString('es-AR')}</span>
              </div>
              <button
                onClick={sendOrder}
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-neutral-900 font-semibold rounded-xl transition-colors"
              >
                <Send size={18} />
                {sending ? 'Enviando...' : 'Enviar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
