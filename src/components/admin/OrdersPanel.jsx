import { useEffect, useRef, useState } from 'react'
import { useOrders } from '../../hooks/useOrders'
import { useWaiterCalls } from '../../hooks/useWaiterCalls'
import { useTables } from '../../hooks/useTables'
import { supabase } from '../../lib/supabase'
import { Clock, CheckCircle, XCircle, ChefHat, Bell, BellOff, CreditCard, X, DoorOpen } from 'lucide-react'

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
  const { waiterCalls, paymentCalls, attendCall } = useWaiterCalls(restaurantId)
  const { tables, updateTableStatus } = useTables(restaurantId)
  const [notification, setNotification] = useState(null)
  const prevPendingCount = useRef(null)
  const isFirstLoad = useRef(true)

  // Detectar nuevos pedidos para notificación
  useEffect(() => {
    const pendingOrders = orders.filter(o => o.status === 'pending')
    const count = pendingOrders.length

    if (isFirstLoad.current) {
      prevPendingCount.current = count
      isFirstLoad.current = false
      return
    }

    if (count > (prevPendingCount.current ?? 0)) {
      const newest = pendingOrders[0]
      setNotification(`¡Nuevo pedido! ${newest?.tables?.name ?? 'Mesa desconocida'}`)
      playBeep()
    }
    prevPendingCount.current = count
  }, [orders])

  // Actualizar título del navegador con pedidos pendientes
  useEffect(() => {
    const pending = orders.filter(o => o.status === 'pending').length
    document.title = pending > 0 ? `(${pending}) Pedidos nuevos — Admin` : 'Panel Admin'
    return () => { document.title = 'Panel Admin' }
  }, [orders])

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch {}
  }

  async function closeTable(tableId) {
    if (!confirm('¿Cerrar esta mesa? Los pedidos activos quedarán marcados como cerrados.')) return
    await supabase
      .from('orders')
      .update({ status: 'closed' })
      .eq('table_id', tableId)
      .in('status', ['pending', 'accepted', 'preparing', 'ready', 'served'])
    updateTableStatus(tableId, 'por_liberar')
  }

  // Agrupar pedidos por mesa
  const ordersByTable = orders.reduce((acc, order) => {
    const key = order.table_id ?? 'sin-mesa'
    if (!acc[key]) acc[key] = { tableName: order.tables?.name ?? 'Sin mesa', tableId: order.table_id, orders: [] }
    acc[key].orders.push(order)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-neutral-700 border-t-gold-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Pedidos en tiempo real</h1>
        <div className="flex items-center gap-2 text-xs text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Conectado
        </div>
      </div>

      {/* Notificación nuevo pedido */}
      {notification && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-yellow-400/10 border border-yellow-400/30 rounded-xl animate-slide-in">
          <Bell size={18} className="text-yellow-400 shrink-0" />
          <span className="flex-1 text-sm text-yellow-300 font-medium">{notification}</span>
          <button onClick={() => setNotification(null)} className="text-neutral-500 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Llamadas al mozo */}
      {waiterCalls.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wide flex items-center gap-2">
            <Bell size={13} className="text-orange-400" /> Llamadas al mozo
          </h2>
          {waiterCalls.map(call => (
            <div key={call.id} className="flex items-center justify-between p-3 bg-orange-400/10 border border-orange-400/30 rounded-lg animate-slide-in">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-orange-400" />
                <span className="text-sm text-white font-medium">{call.tables?.name}</span>
                <span className="text-xs text-neutral-500">{formatTime(call.created_at)}</span>
              </div>
              <button onClick={() => attendCall(call.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-400/20 hover:bg-orange-400/30 text-orange-300 rounded-lg text-xs font-medium transition-colors">
                <BellOff size={13} /> Atendido
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Solicitudes de cuenta */}
      {paymentCalls.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wide flex items-center gap-2">
            <CreditCard size={13} className="text-green-400" /> Solicitudes de cuenta
          </h2>
          {paymentCalls.map(call => (
            <div key={call.id} className="flex items-center justify-between p-3 bg-green-400/10 border border-green-400/30 rounded-lg animate-slide-in">
              <div className="flex items-center gap-2">
                <CreditCard size={15} className="text-green-400" />
                <span className="text-sm text-white font-medium">{call.tables?.name}</span>
                <span className="text-xs text-neutral-500">{formatTime(call.created_at)}</span>
                <span className="text-xs text-green-400 font-medium">Pidió la cuenta</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => closeTable(call.tables?.id ?? call.table_id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors">
                  <DoorOpen size={13} /> Cerrar mesa
                </button>
                <button onClick={() => attendCall(call.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded-lg text-xs font-medium transition-colors">
                  <X size={13} /> Descartar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estado de mesas */}
      {tables.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-3">
            Estado de mesas
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tables.map(table => (
              <TableStatusCard
                key={table.id}
                table={table}
                onUpdateStatus={updateTableStatus}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pedidos agrupados por mesa */}
      {Object.keys(ordersByTable).length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          <ChefHat size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay pedidos activos</p>
          <p className="text-sm mt-1">Los pedidos nuevos aparecerán aquí en tiempo real</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(ordersByTable).map(({ tableName, tableId, orders: tableOrders }) => (
            <div key={tableId} className="space-y-3">
              {/* Header de mesa */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gold-500" />
                  {tableName}
                </h2>
                <button
                  onClick={() => closeTable(tableId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-lg text-xs font-medium transition-colors"
                >
                  <DoorOpen size={13} /> Cerrar mesa
                </button>
              </div>

              {/* Pedidos de esta mesa */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tableOrders.map(order => (
                  <OrderCard key={order.id} order={order} onUpdateStatus={updateStatus} />
                ))}
              </div>
            </div>
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
      <div className="flex items-center justify-between p-4 border-b border-neutral-800">
        <p className="text-xs text-neutral-500">{formatTime(order.created_at)}</p>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusInfo?.color}`}>
          {statusInfo?.label}
        </span>
      </div>

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
              className="flex items-center justify-center px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors">
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
              Listo ✓
            </button>
          )}
          {nextStatuses.includes('served') && (
            <button onClick={() => onUpdateStatus(order.id, 'served')}
              className="flex-1 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg text-xs font-medium transition-colors">
              Entregado
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const TABLE_STATUSES = {
  libre:       { label: 'Libre',       color: 'text-green-400 bg-green-400/10 border-green-400/30' },
  ocupada:     { label: 'Ocupada',     color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  por_liberar: { label: 'Por liberar', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30' },
  pagado:      { label: 'Pagado',      color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
}

function TableStatusCard({ table, onUpdateStatus }) {
  const current = TABLE_STATUSES[table.effectiveStatus] ?? TABLE_STATUSES.libre
  const actions = Object.entries(TABLE_STATUSES).filter(([key]) => key !== table.effectiveStatus)

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-white">{table.name}</p>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${current.color}`}>
          {current.label}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {actions.map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => onUpdateStatus(table.id, key)}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg text-xs font-medium transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}
