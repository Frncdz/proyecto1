import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSessionCart(sessionId, myParticipantId, participants = []) {
  const [cartItems, setCartItems] = useState([])
  const channelRef = useRef(null)

  useEffect(() => {
    if (!sessionId || !myParticipantId) return
    fetchCart()
    const ch = supabase
      .channel(`cart:${sessionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'session_cart_items',
        filter: `session_id=eq.${sessionId}`,
      }, () => fetchCart())
      .subscribe()
    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [sessionId, myParticipantId])

  async function fetchCart() {
    const { data, error } = await supabase
      .from('session_cart_items')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at')
    if (!error) setCartItems(data ?? [])
  }

  async function addItem(menuItem) {
    // Read from functional state to avoid stale closure on rapid taps
    setCartItems(prev => {
      const existing = prev.find(
        c => c.menu_item_id === menuItem.id && c.participant_id === myParticipantId
      )
      if (existing) {
        // Optimistic increment — also fire the DB update
        supabase
          .from('session_cart_items')
          .update({ quantity: existing.quantity + 1 })
          .eq('id', existing.id)
          .then(() => fetchCart())
        return prev.map(c =>
          c.id === existing.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      } else {
        // Optimistic insert with a temp id; fetchCart replaces it with the real row
        const tempId = `tmp-${menuItem.id}-${myParticipantId}`
        if (prev.some(c => c.id === tempId)) return prev // already pending
        supabase.from('session_cart_items').insert({
          session_id: sessionId,
          participant_id: myParticipantId,
          menu_item_id: menuItem.id,
          item_name: menuItem.name,
          unit_price: menuItem.price,
          quantity: 1,
        }).then(() => fetchCart())
        return [...prev, {
          id: tempId,
          session_id: sessionId,
          participant_id: myParticipantId,
          menu_item_id: menuItem.id,
          item_name: menuItem.name,
          unit_price: menuItem.price,
          quantity: 1,
        }]
      }
    })
  }

  async function removeItem(cartItemId) {
    setCartItems(prev => prev.filter(c => c.id !== cartItemId))
    const { error } = await supabase
      .from('session_cart_items')
      .delete()
      .eq('id', cartItemId)
    if (error) fetchCart() // revert optimistic on failure
  }

  async function updateQuantity(cartItemId, quantity) {
    if (quantity <= 0) {
      await removeItem(cartItemId)
    } else {
      setCartItems(prev => prev.map(c => c.id === cartItemId ? { ...c, quantity } : c))
      await supabase
        .from('session_cart_items')
        .update({ quantity })
        .eq('id', cartItemId)
      fetchCart()
    }
  }

  const nameById = participants.reduce((acc, p) => { acc[p.id] = p.name; return acc }, {})

  const byParticipant = cartItems.reduce((acc, item) => {
    const pid = item.participant_id
    if (!acc[pid]) {
      acc[pid] = { participantId: pid, name: nameById[pid] ?? 'Desconocido', items: [] }
    }
    acc[pid].items.push(item)
    return acc
  }, {})

  const myItems = cartItems.filter(c => c.participant_id === myParticipantId)
  const myQty = (menuItemId) => myItems.find(c => c.menu_item_id === menuItemId)?.quantity ?? 0
  const myCartItem = (menuItemId) => myItems.find(c => c.menu_item_id === menuItemId)
  const grandTotal = cartItems.reduce((sum, c) => sum + c.unit_price * c.quantity, 0)

  return {
    cartItems, byParticipant, grandTotal,
    myQty, myCartItem,
    addItem, removeItem, updateQuantity,
    refetch: fetchCart,
  }
}
