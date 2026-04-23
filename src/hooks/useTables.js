import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useTables(restaurantId) {
  const [tables, setTables] = useState([])

  useEffect(() => {
    if (!restaurantId) return
    fetchTables()
    const ch = supabase
      .channel(`admin-tables:${restaurantId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tables',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, fetchTables)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'table_sessions',
      }, fetchTables)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [restaurantId])

  async function fetchTables() {
    const { data } = await supabase
      .from('tables')
      .select('id, name, status, table_sessions(id, status)')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('name')

    setTables(
      (data ?? []).map(t => ({
        ...t,
        // Derive "ocupada" from open session — no client-side write needed
        effectiveStatus: t.table_sessions?.some(s => s.status === 'open')
          ? 'ocupada'
          : (t.status ?? 'libre'),
      }))
    )
  }

  async function updateTableStatus(tableId, status) {
    await supabase.from('tables').update({ status }).eq('id', tableId)
  }

  return { tables, updateTableStatus }
}
