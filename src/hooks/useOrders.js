import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useOrders(restaurantId) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurantId) return
    fetchOrders()

    // Suscripción realtime a pedidos nuevos y cambios de estado
    const channel = supabase
      .channel(`orders:${restaurantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, () => {
        fetchOrders()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [restaurantId])

  async function fetchOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        tables(name, number),
        order_items(*)
      `)
      .eq('restaurant_id', restaurantId)
      .in('status', ['pending', 'accepted', 'preparing', 'ready'])
      .order('created_at', { ascending: false })

    if (!error) setOrders(data ?? [])
    setLoading(false)
  }

  async function updateStatus(orderId, status) {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
    return { error }
  }

  return { orders, loading, updateStatus }
}
