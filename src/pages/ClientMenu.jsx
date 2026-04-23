import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useMenu } from '../hooks/useMenu'
import { CartProvider } from '../context/CartContext'
import MenuItem from '../components/client/MenuItem'
import Cart from '../components/client/Cart'
import CallWaiterButton from '../components/client/CallWaiterButton'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { CheckCircle } from 'lucide-react'

export default function ClientMenu() {
  const { tableId } = useParams()
  const [table, setTable] = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [tableLoading, setTableLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [orderSent, setOrderSent] = useState(false)

  useEffect(() => {
    fetchTableAndRestaurant()
  }, [tableId])

  async function fetchTableAndRestaurant() {
    const { data: tableData } = await supabase
      .from('tables')
      .select('*, restaurants(*)')
      .eq('id', tableId)
      .single()

    if (tableData) {
      setTable(tableData)
      setRestaurant(tableData.restaurants)
    }
    setTableLoading(false)
  }

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
      <MenuContent
        restaurant={restaurant}
        table={table}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        orderSent={orderSent}
        setOrderSent={setOrderSent}
      />
    </CartProvider>
  )
}

function MenuContent({ restaurant, table, activeCategory, setActiveCategory, orderSent, setOrderSent }) {
  const { categories, items, loading } = useMenu(restaurant.id)

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id)
    }
  }, [categories])

  function handleOrderSent() {
    setOrderSent(true)
    setTimeout(() => setOrderSent(false), 5000)
  }

  const visibleItems = items.filter(i => i.category_id === activeCategory)

  return (
    <div className="min-h-screen bg-neutral-950 pb-32">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-white text-lg">{restaurant.name}</h1>
            <p className="text-xs text-neutral-500">{table.name}</p>
          </div>
          {restaurant.logo_url && (
            <img src={restaurant.logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-cover" />
          )}
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

      {/* Notificación pedido enviado */}
      {orderSent && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm animate-slide-in">
            <CheckCircle size={18} />
            ¡Pedido enviado! El equipo ya lo está viendo.
          </div>
        </div>
      )}

      {/* Items */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-neutral-700 border-t-gold-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {visibleItems.map(item => (
                <MenuItem key={item.id} item={item} />
              ))}
              {visibleItems.length === 0 && (
                <p className="text-center text-neutral-500 py-10 text-sm">
                  No hay platos en esta categoría
                </p>
              )}
            </div>

            {/* Llamar al mozo */}
            <div className="mt-8">
              <CallWaiterButton restaurantId={restaurant.id} tableId={table.id} />
            </div>

            {/* Footer */}
            <div className="mt-6 pb-4 text-center text-xs text-neutral-600">
              Powered by Carta Virtual
            </div>
          </>
        )}
      </div>

      {/* Carrito flotante */}
      <Cart
        restaurantId={restaurant.id}
        tableId={table.id}
        onOrderSent={handleOrderSent}
      />
    </div>
  )
}
