import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSessionCart(sessionId, myParticipantId) {
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
    const { data } = await supabase
      .from('session_cart_items')
      .select('*, session_participants(name)')
      .eq('session_id', sessionId)
      .order('created_at')
    setCartItems(data ?? [])
  }

  async function addItem(menuItem) {
    const existing = cartItems.find(
      c => c.menu_item_id === menuItem.id && c.participant_id === myParticipantId
    )
    if (existing) {
      await supabase
        .from('session_cart_items')
        .update({ quantity: existing.quantity + 1 })
        .eq('id', existing.id)
    } else {
      await supabase.from('session_cart_items').insert({
        session_id: sessionId,
        participant_id: myParticipantId,
        menu_item_id: menuItem.id,
        item_name: menuItem.name,
        unit_price: menuItem.price,
        quantity: 1,
      })
    }
  }

  async function removeItem(cartItemId) {
    await supabase
      .from('session_cart_items')
      .delete()
      .eq('id', cartItemId)
  }

  async function updateQuantity(cartItemId, quantity) {
    if (quantity <= 0) {
      await removeItem(cartItemId)
    } else {
      await supabase
        .from('session_cart_items')
        .update({ quantity })
        .eq('id', cartItemId)
    }
  }

  // Items grouped by participant
  const byParticipant = cartItems.reduce((acc, item) => {
    const pid = item.participant_id
    if (!acc[pid]) {
      acc[pid] = {
        participantId: pid,
        name: item.session_participants?.name ?? 'Desconocido',
        items: [],
      }
    }
    acc[pid].items.push(item)
    return acc
  }, {})

  const myItems = cartItems.filter(c => c.participant_id === myParticipantId)
  const myQty = (menuItemId) =>
    myItems.find(c => c.menu_item_id === menuItemId)?.quantity ?? 0
  const myCartItem = (menuItemId) =>
    myItems.find(c => c.menu_item_id === menuItemId)

  const grandTotal = cartItems.reduce((sum, c) => sum + c.unit_price * c.quantity, 0)

  return {
    cartItems, byParticipant, grandTotal,
    myQty, myCartItem,
    addItem, removeItem, updateQuantity,
  }
}
