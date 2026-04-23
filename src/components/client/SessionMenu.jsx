import { useEffect, useState } from 'react'
import { useMenu } from '../../hooks/useMenu'
import { CartProvider } from '../../context/CartContext'
import MenuItem from './MenuItem'
import Cart from './Cart'
import CallWaiterButton from './CallWaiterButton'
import { Check, X, Users } from 'lucide-react'

export default function SessionMenu({ restaurant, table, tableSession }) {
  const { categories, items, loading } = useMenu(restaurant.id)
  const [activeCategory, setActiveCategory] = useState(null)

  const {
    session, isOwner, participants, pendingJoins,
    approveParticipant, rejectParticipant,
  } = tableSession

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) setActiveCategory(categories[0].id)
  }, [categories])

  const visibleItems = items.filter(i => i.category_id === activeCategory)
  const pendingCount = pendingJoins.length

  return (
    <CartProvider>
      <div className="min-h-screen bg-neutral-950 pb-32">

        {/* ── Solicitudes de unirse (owner, sticky top) ─────────────── */}
        {isOwner && pendingCount > 0 && (
          <div className="fixed top-0 inset-x-0 z-50 bg-neutral-950/95 backdrop-blur border-b border-neutral-800 p-3 space-y-2">
            {pendingJoins.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-3 py-2.5 bg-yellow-500/5 border border-yellow-500/20 rounded-xl"
              >
                <Users size={15} className="text-yellow-400 shrink-0" />
                <span className="flex-1 text-sm text-white">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-neutral-400"> quiere unirse a la mesa</span>
                </span>
                <button
                  onClick={() => approveParticipant(p.id)}
                  className="w-8 h-8 rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-400 flex items-center justify-center transition-colors"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => rejectParticipant(p.id)}
                  className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Header ────────────────────────────────────────────────── */}
        <div
          className="bg-neutral-900 border-b border-neutral-800 sticky z-30"
          style={{ top: isOwner && pendingCount > 0 ? `${pendingCount * 60 + 12}px` : '0px' }}
        >
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="font-bold text-white text-lg leading-tight">{restaurant.name}</h1>
              <p className="text-xs text-neutral-500">
                {table.name}
                {session?.owner_name ? ` · Mesa de ${session.owner_name}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {participants.length > 1 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 rounded-full text-xs text-neutral-400">
                  <Users size={12} />
                  <span>{participants.length}</span>
                </div>
              )}
              {restaurant.logo_url && (
                <img src={restaurant.logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-cover" />
              )}
            </div>
          </div>

          {/* Categorías */}
          {!loading && (
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
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

        {/* ── Participantes activos (si hay más de uno) ──────────────── */}
        {participants.length > 1 && (
          <div className="max-w-2xl mx-auto px-4 pt-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl">
              <Users size={13} className="text-neutral-500 shrink-0" />
              <span className="text-xs text-neutral-400 truncate">
                {participants.map(p => p.name).join(', ')}
              </span>
            </div>
          </div>
        )}

        {/* ── Ítems del menú ─────────────────────────────────────────── */}
        <div className="max-w-2xl mx-auto px-4 pt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-neutral-700 border-t-gold-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {visibleItems.map(item => <MenuItem key={item.id} item={item} />)}
                {visibleItems.length === 0 && (
                  <p className="text-center text-neutral-500 py-10 text-sm">
                    No hay platos en esta categoría.
                  </p>
                )}
              </div>

              <div className="mt-8">
                <CallWaiterButton restaurantId={restaurant.id} tableId={table.id} />
              </div>

              <div className="mt-6 pb-4 text-center text-xs text-neutral-600">
                Powered by Carta Virtual
              </div>
            </>
          )}
        </div>

        {/* ── Carrito individual (placeholder hasta Feature 2) ───────── */}
        <Cart
          restaurantId={restaurant.id}
          tableId={table.id}
          sessionId={session?.id}
        />
      </div>
    </CartProvider>
  )
}
