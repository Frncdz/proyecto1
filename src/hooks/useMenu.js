import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useMenu(restaurantId) {
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!restaurantId) return
    fetchMenu()
  }, [restaurantId])

  async function fetchMenu() {
    setLoading(true)
    setError(null)
    try {
      const [catRes, itemRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .eq('is_active', true)
          .order('order_index'),
        supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('order_index'),
      ])
      if (catRes.error) throw catRes.error
      if (itemRes.error) throw itemRes.error
      setCategories(catRes.data)
      setItems(itemRes.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { categories, items, loading, error, refetch: fetchMenu }
}
