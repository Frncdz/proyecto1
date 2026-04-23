import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useMenu } from '../hooks/useMenu'
import { useTableOrders } from '../hooks/useTableOrders'
import { CartProvider } from '../context/CartContext'
import MenuItem from '../components/client/MenuItem'
import Cart from '../components/client/Cart'
import CallWaiterButton from '../components/client/CallWaiterButton'
import TableBill from '../components/client/TableBill'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { UtensilsCrossed, Receipt, Clock } from 'lucide-react'

export default function ClientMenu() {
  const { tableId } = useParams()
  const [table, setTable] = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [tableLoading, setTableLoading] = useState(true)

  useEffect(() => {
    async function fetchTableAndRestaurant() {
      const { data } = await supabase
        .from('tables')
        .select('*, restaurants(*)')
        .eq('id', tableId)
        .single()
      if (data) { setTable(data); setRestaurant(data.restaurants) }
      setTableLoading(false)
    }
    fetchTableAndRestaurant()
  }, [tableId])

  if (tableLoading) return <LoadingSpinner text="Cargando menú..." />

  if (!table || !restaurant) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white font-medium">Mesa no encontrada</p>
          <p className="text-neutral-400 text-sm mt-1">El QR puede ser inválido o estar deshabilitado.</p>
        </div>
      </div>
    )
  }

  return (
    <CartProvider>
      <MenuContent restaurant={restaurant} table={table} />
    </CartProvider>
  )
}

function MenuContent({ restaurant, table }) {
  const { categories, items, loading } = useMenu(restaurant.id)
  const { orders, total, hasPending, hasActive, tableClosed } = useTableOrders(table.id)
  const [activeCategory, setActiveCategory] = useState(null)
  const [tab, setTab] = useState('menu') // 'menu' | 'cuenta'

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id)
    }
  }, [categories])

  // Cuando llega el primer pedido, mostrar el tab de cuenta automáticamente
  useEffect(() => {
    if (hasPending) setTab('cuenta')
  }, [hasPending])

  const visibleItems = items.filter(i => i.category_id === activeCategory)

  // Mesa cerrada por el admin
  if (tableClosed) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed size={28} className="text-gold-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">¡Gracias por su visita!</h2>
          <p className="text-neutral-400 text-sm">{restaurant.name}</p>
          <p className="text-neutral-600 text-xs mt-4">Mesa cerrada</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 pb-32">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-white text-base leading-tight">{restaurant.name}</h1>
            <p className="text-xs text-neutral-500">{table.name}</p>
          </div>
          {restaurant.logo_url && (
            <img src={restaurant.logo_url} alt="Logo" className="w-9 h-9 rounded-lg object-cover" />
          )}
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
            onClick={() => setTab('cuenta')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === 'cuenta' ? 'bg-gold-500 text-neutral-900' : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            <Receipt size={13} /> Mi cuenta
            {hasPending && (
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse ml-0.5" />
            )}
            {hasActive && !hasPending && (
              <span className="text-xs bg-neutral-700 text-neutral-300 rounded-full px-1.5 ml-0.5">
                {orders.length}
              </span>
            )}
          </button>
        </div>

        {/* Categorías (solo en tab menú) */}
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

      {/* Banner pedido pendiente (en tab menú) */}
      {tab === 'menu' && hasPending && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <button
            onClick={() => setTab('cuenta')}
            className="w-full flex items-center gap-2 px-4 py-3 bg-yellow-400/10 border border-yellow-400/30 rounded-xl text-yellow-400 text-sm animate-slide-in"
          >
            <Clock size={16} className="shrink-0" />
            <span className="flex-1 text-left">Pedido en espera de aceptación</span>
            <span className="text-xs underline">Ver estado →</span>
          </button>
        </div>
      )}

      {/* Contenido principal */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        {tab === 'menu' ? (
          loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-neutral-700 border-t-gold-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {visibleItems.map(item => <MenuItem key={item.id} item={item} />)}
                {visibleItems.length === 0 && (
                  <p className="text-center text-neutral-500 py-10 text-sm">No hay platos en esta categoría</p>
                )}
              </div>
              <div className="mt-8 space-y-3">
                <CallWaiterButton restaurantId={restaurant.id} tableId={table.id} />
              </div>
              <div className="mt-6 pb-4 text-center text-xs text-neutral-600">
                Powered by Carta Virtual
              </div>
            </>
          )
        ) : (
          <TableBill
            orders={orders}
            total={total}
            restaurantId={restaurant.id}
            tableId={table.id}
          />
        )}
      </div>

      {/* Carrito flotante (siempre visible) */}
      <Cart
        restaurantId={restaurant.id}
        tableId={table.id}
        onOrderSent={() => setTab('cuenta')}
      />
    </div>
  )
}
