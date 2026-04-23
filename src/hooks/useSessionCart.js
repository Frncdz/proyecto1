import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSessionCart(sessionId, myParticipantId, participants = []) {
  const [cartItems, setCartItems] = useState([])
  const channelRef = useRef(null)
  // Ref always holds the latest cart to avoid stale closures and React 18
  // StrictMode double-invocation of setState updaters triggering duplicate INSERTs
  const cartRef = useRef([])

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
    if (!error) {
      cartRef.current = data ?? []
      setCartItems(data ?? [])
    }
  }

  async function addItem(menuItem) {
    const current = cartRef.current
    const existing = current.find(
      c => c.menu_item_id === menuItem.id && c.participant_id === myParticipantId
    )

    if (existing) {
      const newQty = existing.quantity + 1
      setCartItems(prev => prev.map(c => c.id === existing.id ? { ...c, quantity: newQty } : c))
      await supabase
        .from('session_cart_items')
        .update({ quantity: newQty })
        .eq('id', existing.id)
      fetchCart()
    } else {
      const tempId = `tmp-${menuItem.id}-${myParticipantId}`
      if (current.some(c => c.id === tempId)) return // already pending
      const newItem = {
        id: tempId,
        session_id: sessionId,
        participant_id: myParticipantId,
        menu_item_id: menuItem.id,
        item_name: menuItem.name,
        unit_price: menuItem.price,
        quantity: 1,
      }
      // Update ref immediately to guard against double-calls before state propagates
      cartRef.current = [...current, newItem]
      setCartItems(prev => [...prev, newItem])
      await supabase.from('session_cart_items').insert({
        session_id: sessionId,
        participant_id: myParticipantId,
        menu_item_id: menuItem.id,
        item_name: menuItem.name,
        unit_price: menuItem.price,
        quantity: 1,
      })
      fetchCart()
    }
  }

  async function removeItem(cartItemId) {
    cartRef.current = cartRef.current.filter(c => c.id !== cartItemId)
    setCartItems(prev => prev.filter(c => c.id !== cartItemId))
    const { error } = await supabase
      .from('session_cart_items')
      .delete()
      .eq('id', cartItemId)
    if (error) fetchCart()
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

  // Group by participant; merge duplicate rows for the same menu item defensively
  const byParticipant = cartItems.reduce((acc, item) => {
    const pid = item.participant_id
    if (!acc[pid]) {
      acc[pid] = { participantId: pid, name: nameById[pid] ?? 'Desconocido', items: [] }
    }
    const dup = acc[pid].items.find(i => i.menu_item_id === item.menu_item_id)
    if (dup) {
      dup.quantity += item.quantity
    } else {
      acc[pid].items.push({ ...item })
    }
    return acc
  }, {})

  const myItems = cartItems.filter(c => c.participant_id === myParticipantId)
  const myQty = (menuItemId) =>
    myItems.filter(c => c.menu_item_id === menuItemId).reduce((sum, c) => sum + c.quantity, 0)
  const myCartItem = (menuItemId) => myItems.find(c => c.menu_item_id === menuItemId)
  const grandTotal = cartItems.reduce((sum, c) => sum + c.unit_price * c.quantity, 0)

  return {
    cartItems, byParticipant, grandTotal,
    myQty, myCartItem,
    addItem, removeItem, updateQuantity,
    refetch: fetchCart,
  }
}
