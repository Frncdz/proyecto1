import { useOrders } from '../../hooks/useOrders'
import { useWaiterCalls } from '../../hooks/useWaiterCalls'
import { Clock, CheckCircle, XCircle, ChefHat, Bell, BellOff } from 'lucide-react'

const STATUS_LABELS = {
  pending:   { label: 'Nuevo',       color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  accepted:  { label: 'Aceptado',    color: 'text-blue-400 bg-blue-400/10 border-blue-400/30'       },
  preparing: { label: 'Preparando',  color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
  ready:     { label: 'Listo',       color: 'text-green-400 bg-green-400/10 border-green-400/30'    },
}

const STATUS_FLOW = {
  pending:   ['accepted', 'rejected'],
  accepted:  ['preparing', 'rejected'],
  preparing: ['ready'],
  ready:     ['served'],
}

export default function OrdersPanel({ restaurantId }) {
  const { orders, loading, updateStatus } = useOrders(restaurantId)
  const { calls, attendCall } = useWaiterCalls(restaurantId)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-neutral-700 border-t-gold-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Pedidos en tiempo real</h1>
        <div className="flex items-center gap-2 text-xs text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Conectado
        </div>
      </div>

      {/* Llamadas al mozo */}
      {calls.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide flex items-center gap-2">
            <Bell size={14} className="text-orange-400" /> Llamadas al mozo ({calls.length})
          </h2>
          {calls.map(call => (
            <div key={call.id} className="flex items-center justify-between p-3 bg-orange-400/10 border border-orange-400/30 rounded-lg animate-slide-in">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-orange-400" />
                <span className="text-sm text-white font-medium">{call.tables?.name}</span>
                <span className="text-xs text-neutral-400">{formatTime(call.created_at)}</span>
              </div>
              <button
                onClick={() => attendCall(call.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-400/20 hover:bg-orange-400/30 text-orange-300 rounded-lg text-xs font-medium transition-colors"
              >
                <BellOff size={13} /> Atendido
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pedidos */}
      {orders.length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          <ChefHat size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay pedidos activos</p>
          <p className="text-sm mt-1">Los pedidos nuevos aparecerán aquí en tiempo real</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map(order => (
            <OrderCard key={order.id} order={order} onUpdateStatus={updateStatus} />
          ))}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, onUpdateStatus }) {
  const statusInfo = STATUS_LABELS[order.status]
  const nextStatuses = STATUS_FLOW[order.status] ?? []

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800">
        <div>
          <p className="font-semibold text-white">{order.tables?.name ?? 'Sin mesa'}</p>
          <p className="text-xs text-neutral-500">{formatTime(order.created_at)}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusInfo?.color}`}>
          {statusInfo?.label}
        </span>
      </div>

      {/* Items */}
      <div className="p-4 space-y-2">
        {order.order_items?.map(item => (
          <div key={item.id} className="flex items-center justify-between text-sm">
            <span className="text-neutral-300">
              <span className="text-gold-400 font-medium mr-1">{item.quantity}×</span>
              {item.item_name}
            </span>
            <span className="text-neutral-500">${Number(item.unit_price * item.quantity).toLocaleString('es-AR')}</span>
          </div>
        ))}
        {order.notes && (
          <p className="text-xs text-neutral-500 italic mt-2 pt-2 border-t border-neutral-800">
            Nota: {order.notes}
          </p>
        )}
      </div>

      {/* Total + acciones */}
      <div className="p-4 border-t border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-neutral-400">Total</span>
          <span className="font-semibold text-white">${Number(order.total).toLocaleString('es-AR')}</span>
        </div>
        <div className="flex gap-2">
          {nextStatuses.includes('accepted') && (
            <button onClick={() => onUpdateStatus(order.id, 'accepted')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-medium transition-colors">
              <CheckCircle size={14} /> Aceptar
            </button>
          )}
          {nextStatuses.includes('rejected') && (
            <button onClick={() => onUpdateStatus(order.id, 'rejected')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors">
              <XCircle size={14} />
            </button>
          )}
          {nextStatuses.includes('preparing') && (
            <button onClick={() => onUpdateStatus(order.id, 'preparing')}
              className="flex-1 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-xs font-medium transition-colors">
              Preparando
            </button>
          )}
          {nextStatuses.includes('ready') && (
            <button onClick={() => onUpdateStatus(order.id, 'ready')}
              className="flex-1 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-medium transition-colors">
              Listo para entregar
            </button>
          )}
          {nextStatuses.includes('served') && (
            <button onClick={() => onUpdateStatus(order.id, 'served')}
              className="flex-1 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg text-xs font-medium transition-colors">
              Entregado ✓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}
