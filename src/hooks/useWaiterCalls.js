import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useWaiterCalls(restaurantId) {
  const [calls, setCalls] = useState([])

  useEffect(() => {
    if (!restaurantId) return
    fetchCalls()

    const channel = supabase
      .channel(`waiter_calls:${restaurantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'waiter_calls',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, () => fetchCalls())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [restaurantId])

  async function fetchCalls() {
    const { data } = await supabase
      .from('waiter_calls')
      .select('*, tables(name, number)')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    setCalls(data ?? [])
  }

  async function attendCall(callId) {
    await supabase
      .from('waiter_calls')
      .update({ status: 'attended', attended_at: new Date().toISOString() })
      .eq('id', callId)
  }

  const waiterCalls = calls.filter(c => c.type !== 'payment')
  const paymentCalls = calls.filter(c => c.type === 'payment')

  return { calls, waiterCalls, paymentCalls, attendCall }
}
