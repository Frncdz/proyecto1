import { useEffect, useRef, useState } from 'react'
import { useMenu } from '../../hooks/useMenu'
import { useSessionCart } from '../../hooks/useSessionCart'
import { useTableOrders } from '../../hooks/useTableOrders'
import SharedCartPanel from './SharedCartPanel'
import CallWaiterButton from './CallWaiterButton'
import TableBill from './TableBill'
import { UtensilsCrossed, ShoppingCart, Receipt, Bell, Check, X, Users, QrCode } from 'lucide-react'

export default function SessionMenu({
  restaurant, table,
  session, myParticipant, participants, pendingJoins,
  isOwner, allReady,
  approveParticipant, rejectParticipant, markOrderReady, closeSession,
}) {
  const { categories, items, loading } = useMenu(restaurant.id)
  const { orders, total, hasPending, tableClosed, hadOrders, refetch: refetchOrders } = useTableOrders(table.id)
  const {
    cartItems, byParticipant, grandTotal,
    myQty, myCartItem,
    addItem, removeItem, updateQuantity,
  } = useSessionCart(session.id, myParticipant.id, participants)

  const [activeCategory, setActiveCategory] = useState(null)
  const [tab, setTab] = useState('menu') // 'menu' | 'carrito' | 'cuenta'

  const prevHasPendingRef = useRef(false)

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id)
    }
  }, [categories])

  useEffect(() => {
    if (prevHasPendingRef.current && !hasPending && orders.length > 0) {
      setTab('cuenta')
    }
    prevHasPendingRef.current = hasPending
  }, [hasPending, orders.length])

  const visibleItems = items.filter(i => i.category_id === activeCategory)
  const cartCount = cartItems.reduce((sum, c) => sum + c.quantity, 0)

  if (tableClosed) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed size={28} className="text-gold-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {hadOrders ? '¡Gracias por su visita!' : '¡Hasta la próxima!'}
          </h2>
          <p className="text-neutral-400 text-sm">{restaurant.name}</p>
          <div className="flex items-start gap-3 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-left mt-6">
            <QrCode size={18} className="text-neutral-400 shrink-0 mt-0.5" />
            <p className="text-sm text-neutral-300">
              Para volver a pedir, cerrá esta página y escaneá el QR de la mesa nuevamente.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 pb-28">
      {/* Solicitudes de unirse (owner) */}
      {isOwner && pendingJoins.length > 0 && (
        <div className="fixed top-0 inset-x-0 z-50 space-y-2 p-3 bg-neutral-950/95 backdrop-blur border-b border-neutral-800">
          {pendingJoins.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl animate-slide-in">
              <Users size={15} className="text-yellow-400 shrink-0" />
              <span className="flex-1 text-sm text-white">
                <span className="font-medium">{p.name}</span>
                <span className="text-neutral-400"> quiere unirse</span>
              </span>
              <button
                onClick={() => approveParticipant(p.id)}
                className="w-8 h-8 rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-400 flex items-center justify-center"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => rejectParticipant(p.id)}
                className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className={`bg-neutral-900 border-b border-neutral-800 sticky z-30 ${isOwner && pendingJoins.length > 0 ? 'top-[calc(56px*var(--joins))]' : 'top-0'}`}
        style={isOwner && pendingJoins.length > 0 ? { top: `${56 * pendingJoins.length + 12}px` } : {}}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-white text-base leading-tight">{restaurant.name}</h1>
            <p className="text-xs text-neutral-500">{table.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {restaurant.logo_url && (
              <img src={restaurant.logo_url} alt="Logo" className="w-9 h-9 rounded-lg object-cover" />
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2">
          <button
            onClick={() => setTab('menu')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === 'menu' ? 'bg-gold-500 text-neutral-900' : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            <UtensilsCrossed size={13} /> Menú
          </button>
          <button
            onClick={() => setTab('carrito')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors relative ${
              tab === 'carrito' ? 'bg-gold-500 text-neutral-900' : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            <ShoppingCart size={13} /> Carrito
            {cartCount > 0 && (
              <span className={`text-xs rounded-full px-1.5 ml-0.5 font-semibold ${
                tab === 'carrito' ? 'bg-neutral-900/30 text-neutral-900' : 'bg-gold-500 text-neutral-900'
              }`}>
                {cartCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('cuenta')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === 'cuenta' ? 'bg-gold-500 text-neutral-900' : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            <Receipt size={13} /> Cuenta
            {hasPending && (
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse ml-0.5" />
            )}
          </button>
        </div>

        {/* Categorías */}
        {tab === 'menu' && !loading && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide border-t border-neutral-800/50 pt-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-gold-500 text-neutral-900'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Participantes de la sesión */}
      {tab === 'menu' && participants.length > 1 && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl">
            <Users size={13} className="text-neutral-500" />
            <span className="text-xs text-neutral-400">
              {participants.map(p => p.name).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        {tab === 'menu' && (
          loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-neutral-700 border-t-gold-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {visibleItems.map(item => (
                  <SessionMenuItem
                    key={item.id}
                    item={item}
                    qty={myQty(item.id)}
                    cartItem={myCartItem(item.id)}
                    onAdd={() => addItem(item)}
                    onUpdateQty={(id, q) => updateQuantity(id, q)}
                  />
                ))}
                {visibleItems.length === 0 && (
                  <p className="text-center text-neutral-500 py-10 text-sm">No hay platos en esta categoría</p>
                )}
              </div>
              <div className="mt-8 space-y-3">
                <CallWaiterButton restaurantId={restaurant.id} tableId={table.id} />
                {isOwner && (
                  <button
                    onClick={() => {
                      if (confirm('¿Cerrar la mesa? Todos los participantes serán desconectados.')) closeSession()
                    }}
                    className="w-full py-3 border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-xl text-sm font-medium transition-colors"
                  >
                    Cerrar mesa
                  </button>
                )}
              </div>
              <div className="mt-6 pb-4 text-center text-xs text-neutral-600">
                Powered by Carta Virtual
              </div>
            </>
          )
        )}

        {tab === 'carrito' && (
          <SharedCartPanel
            byParticipant={byParticipant}
            grandTotal={grandTotal}
            cartItems={cartItems}
            isOwner={isOwner}
            myParticipantId={myParticipant.id}
            participants={participants}
            allReady={allReady}
            session={session}
            myParticipant={myParticipant}
            markOrderReady={markOrderReady}
            removeItem={removeItem}
            updateQuantity={updateQuantity}
            restaurantId={restaurant.id}
            tableId={table.id}
            onOrderSent={() => refetchOrders()}
            onViewBill={() => setTab('cuenta')}
            closeSession={closeSession}
          />
        )}

        {tab === 'cuenta' && (
          <TableBill
            orders={orders}
            total={total}
            restaurantId={restaurant.id}
            tableId={table.id}
            isOwner={isOwner}
          />
        )}
      </div>

      {/* FAB carrito flotante (en tab menú) */}
      {tab === 'menu' && cartCount > 0 && (
        <button
          onClick={() => setTab('carrito')}
          className="fixed bottom-6 right-4 flex items-center gap-2 px-4 py-3 bg-gold-500 hover:bg-gold-600 text-neutral-900 font-semibold rounded-full shadow-lg transition-colors z-40"
        >
          <ShoppingCart size={18} />
          <span className="text-sm">{cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
          <span className="text-sm">${grandTotal.toLocaleString('es-AR')}</span>
        </button>
      )}
    </div>
  )
}

function SessionMenuItem({ item, qty, cartItem, onAdd, onUpdateQty }) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-colors
      ${!item.is_available ? 'opacity-40 pointer-events-none' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'}
      ${qty > 0 ? 'border-gold-500/40' : ''}`}>

      {item.image_url
        ? <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-lg object-cover shrink-0" />
        : <div className="w-20 h-20 rounded-lg bg-neutral-800 shrink-0" />
      }

      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm">{item.name}</p>
        {item.description && (
          <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{item.description}</p>
        )}
        {item.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.tags.map(tag => (
              <span key={tag} className="text-xs px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded">{tag}</span>
            ))}
          </div>
        )}
        {!item.is_available && (
          <span className="text-xs text-red-400 mt-1 block">No disponible</span>
        )}
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="text-gold-400 font-semibold text-sm">
          ${Number(item.price).toLocaleString('es-AR')}
        </span>
        {qty === 0 ? (
          <button
            onClick={onAdd}
            className="w-8 h-8 rounded-full bg-gold-500 hover:bg-gold-600 text-neutral-900 flex items-center justify-center transition-colors"
          >
            <span className="text-lg leading-none">+</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateQty(cartItem.id, qty - 1)}
              className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors text-sm"
            >−</button>
            <span className="text-white font-medium text-sm w-4 text-center">{qty}</span>
            <button
              onClick={onAdd}
              className="w-7 h-7 rounded-full bg-gold-500 hover:bg-gold-600 text-neutral-900 flex items-center justify-center transition-colors text-sm"
            >+</button>
          </div>
        )}
      </div>
    </div>
  )
}
