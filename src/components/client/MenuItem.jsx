import { useCart } from '../../context/CartContext'
import { Plus, Minus } from 'lucide-react'

export default function MenuItem({ item }) {
  const { items, dispatch } = useCart()
  const cartItem = items.find(i => i.id === item.id)
  const qty = cartItem?.quantity ?? 0

  function add() {
    dispatch({ type: 'ADD_ITEM', item: { id: item.id, name: item.name, price: item.price, image_url: item.image_url } })
  }
  function remove() {
    dispatch({ type: 'UPDATE_QUANTITY', id: item.id, quantity: qty - 1 })
  }

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
              <span key={tag} className="text-xs px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded">
                {tag}
              </span>
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
            onClick={add}
            className="w-8 h-8 rounded-full bg-gold-500 hover:bg-gold-600 text-neutral-900 flex items-center justify-center transition-colors"
          >
            <Plus size={16} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={remove} className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors">
              <Minus size={13} />
            </button>
            <span className="text-white font-medium text-sm w-4 text-center">{qty}</span>
            <button onClick={add} className="w-7 h-7 rounded-full bg-gold-500 hover:bg-gold-600 text-neutral-900 flex items-center justify-center transition-colors">
              <Plus size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
