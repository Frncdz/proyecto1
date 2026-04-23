import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useTableOrders(tableId) {
  const [orders, setOrders] = useState([])
  const [tableClosed, setTableClosed] = useState(false)
  const [loading, setLoading] = useState(true)
  const hadOrdersRef = useRef(false)

  useEffect(() => {
    if (!tableId) return
    fetchOrders()

    const channel = supabase
      .channel(`table-orders:${tableId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `table_id=eq.${tableId}`,
      }, () => fetchOrders())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [tableId])

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('table_id', tableId)
      .order('created_at')

    const all = data ?? []
    const active = all.filter(o => !['rejected', 'closed'].includes(o.status))

    if (active.length > 0) hadOrdersRef.current = true

    // Mesa cerrada: había pedidos y ahora todos están cerrados/rechazados
    if (hadOrdersRef.current && active.length === 0 && all.length > 0) {
      setTableClosed(true)
    }

    setOrders(active)
    setLoading(false)
  }

  const total = orders.reduce((sum, o) => sum + Number(o.total), 0)
  const hasPending = orders.some(o => o.status === 'pending')
  const hasActive = orders.length > 0

  return { orders, total, hasPending, hasActive, tableClosed, loading, refetch: fetchOrders }
}
