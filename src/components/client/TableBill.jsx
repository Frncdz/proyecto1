import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Receipt, CheckCircle, Clock, ChefHat, Truck, CreditCard, Bell } from 'lucide-react'

const ORDER_STATUS = {
  pending:   { label: 'En espera de aceptación', icon: Clock,        color: 'text-yellow-400' },
  accepted:  { label: 'Aceptado',                icon: CheckCircle,  color: 'text-blue-400'   },
  preparing: { label: 'Preparando...',            icon: ChefHat,      color: 'text-purple-400' },
  ready:     { label: '¡Listo para entregar!',    icon: Truck,        color: 'text-green-400'  },
  served:    { label: 'Entregado',                icon: CheckCircle,  color: 'text-neutral-400'},
}

export default function TableBill({ orders, total, restaurantId, tableId }) {
  const [paymentRequested, setPaymentRequested] = useState(false)
  const [requesting, setRequesting] = useState(false)

  async function requestPayment() {
    setRequesting(true)
    await supabase.from('waiter_calls').insert({
      restaurant_id: restaurantId,
      table_id: tableId,
      status: 'pending',
      type: 'payment',
    })
    setRequesting(false)
    setPaymentRequested(true)
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500">
        <Receipt size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">Todavía no enviaste ningún pedido.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Pedidos */}
      {orders.map((order, i) => {
        const statusInfo = ORDER_STATUS[order.status] ?? ORDER_STATUS.pending
        const Icon = statusInfo.icon
        return (
          <div key={order.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <span className="text-xs text-neutral-500">Pedido #{i + 1}</span>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${statusInfo.color}`}>
                <Icon size={13} />
                {statusInfo.label}
              </span>
            </div>
            <div className="px-4 py-3 space-y-1.5">
              {order.order_items?.map(item => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-300">
                    <span className="text-gold-400 font-medium mr-1">{item.quantity}×</span>
                    {item.item_name}
                  </span>
                  <span className="text-neutral-500">
                    ${Number(item.unit_price * item.quantity).toLocaleString('es-AR')}
                  </span>
                </div>
              ))}
              {order.notes && (
                <p className="text-xs text-neutral-600 italic pt-1">Nota: {order.notes}</p>
              )}
            </div>
            <div className="flex justify-end px-4 py-2 border-t border-neutral-800/50">
              <span className="text-sm text-neutral-400">
                Subtotal: <span className="text-white font-medium">${Number(order.total).toLocaleString('es-AR')}</span>
              </span>
            </div>
          </div>
        )
      })}

      {/* Total */}
      <div className="flex items-center justify-between px-4 py-4 bg-neutral-900 border border-neutral-800 rounded-xl">
        <span className="text-white font-semibold">Total</span>
        <span className="text-2xl font-bold text-gold-400">${total.toLocaleString('es-AR')}</span>
      </div>

      {/* Pedir la cuenta */}
      {paymentRequested ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
          <CheckCircle size={18} />
          Cuenta solicitada. El mozo se acerca.
        </div>
      ) : (
        <button
          onClick={requestPayment}
          disabled={requesting}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-neutral-900 font-semibold rounded-xl transition-colors"
        >
          <CreditCard size={18} />
          {requesting ? 'Solicitando...' : 'Pedir la cuenta'}
        </button>
      )}

      <p className="text-center text-xs text-neutral-600 pb-2">
        Podés seguir agregando items al pedido
      </p>
    </div>
  )
}
