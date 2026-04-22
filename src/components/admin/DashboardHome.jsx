import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ClipboardList, UtensilsCrossed, QrCode, TrendingUp } from 'lucide-react'

export default function DashboardHome({ restaurantId, restaurantName }) {
  const [stats, setStats] = useState({ orders: 0, items: 0, tables: 0, todayTotal: 0 })

  useEffect(() => {
    if (!restaurantId) return
    fetchStats()
  }, [restaurantId])

  async function fetchStats() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [ordersRes, itemsRes, tablesRes, todayRes] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId).in('status', ['pending','accepted','preparing','ready']),
      supabase.from('menu_items').select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId),
      supabase.from('tables').select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId),
      supabase.from('orders').select('total')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', today.toISOString())
        .in('status', ['accepted','preparing','ready','served']),
    ])

    const todayTotal = (todayRes.data ?? []).reduce((sum, o) => sum + Number(o.total), 0)

    setStats({
      orders: ordersRes.count ?? 0,
      items: itemsRes.count ?? 0,
      tables: tablesRes.count ?? 0,
      todayTotal,
    })
  }

  const statCards = [
    { label: 'Pedidos activos',  value: stats.orders,                                 icon: ClipboardList, color: 'text-yellow-400' },
    { label: 'Platos en menú',   value: stats.items,                                  icon: UtensilsCrossed, color: 'text-purple-400' },
    { label: 'Mesas',            value: stats.tables,                                 icon: QrCode, color: 'text-blue-400' },
    { label: 'Vendido hoy',      value: `$${stats.todayTotal.toLocaleString('es-AR')}`, icon: TrendingUp, color: 'text-green-400' },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Bienvenido</h1>
        <p className="text-neutral-400 mt-1">{restaurantName}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-neutral-400">{label}</span>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 p-5 bg-neutral-900 border border-neutral-800 rounded-xl">
        <h2 className="font-medium text-white mb-2">Inicio rápido</h2>
        <ul className="text-sm text-neutral-400 space-y-1.5 list-disc list-inside">
          <li>Ir a <strong className="text-white">Menú</strong> para agregar categorías y platos</li>
          <li>Ir a <strong className="text-white">Mesas</strong> para crear las mesas y descargar sus QR</li>
          <li>Ir a <strong className="text-white">Pedidos</strong> para gestionar órdenes en tiempo real</li>
        </ul>
      </div>
    </div>
  )
}
