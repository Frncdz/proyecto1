import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSessionCart(sessionId, myParticipantId, participants = []) {
  const [cartItems, setCartItems] = useState([])
  const channelRef = useRef(null)
  // Always holds latest cart state — avoids stale closures on rapid taps
  const cartRef = useRef([])
  // IDs being deleted — fetchCart() filters these to prevent race-condition restores
  const pendingDeletesRef = useRef(new Set())
  // cartItemId → latest intended quantity for in-flight updates
  // fetchCart() applies these instead of stale DB values while the update is in transit
  const pendingUpdatesRef = useRef(new Map())

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
      // Filter items mid-delete so concurrent fetchCart() calls can't restore them
      let result = (data ?? []).filter(item => !pendingDeletesRef.current.has(item.id))
      // Apply pending quantity updates so stale DB values don't overwrite optimistic state
      result = result.map(item => {
        const pending = pendingUpdatesRef.current.get(item.id)
        return pending !== undefined ? { ...item, quantity: pending } : item
      })
      cartRef.current = result
      setCartItems(result)
    }
  }

  async function addItem(menuItem) {
    const current = cartRef.current
    const existing = current.find(
      c => c.menu_item_id === menuItem.id && c.participant_id === myParticipantId
    )

    if (existing) {
      // existing.id is always a real DB UUID here — temp IDs are replaced synchronously
      // right after INSERT (see else-branch below), so this path is safe
      const newQty = existing.quantity + 1
      pendingUpdatesRef.current.set(existing.id, newQty)
      cartRef.current = cartRef.current.map(c => c.id === existing.id ? { ...c, quantity: newQty } : c)
      setCartItems(prev => prev.map(c => c.id === existing.id ? { ...c, quantity: newQty } : c))
      await supabase
        .from('session_cart_items')
        .update({ quantity: newQty })
        .eq('id', existing.id)
      pendingUpdatesRef.current.delete(existing.id)
      fetchCart()
    } else {
      const tempId = `tmp-${menuItem.id}-${myParticipantId}`
      if (current.some(c => c.id === tempId)) return // insert already in-flight
      const newItem = {
        id: tempId,
        session_id: sessionId,
        participant_id: myParticipantId,
        menu_item_id: menuItem.id,
        item_name: menuItem.name,
        unit_price: menuItem.price,
        quantity: 1,
      }
      cartRef.current = [...current, newItem]
      setCartItems(prev => [...prev, newItem])

      // Request the inserted row back so we immediately get the real UUID
      const { data: inserted, error: insertError } = await supabase
        .from('session_cart_items')
        .insert({
          session_id: sessionId,
          participant_id: myParticipantId,
          menu_item_id: menuItem.id,
          item_name: menuItem.name,
          unit_price: menuItem.price,
          quantity: 1,
        })
        .select()
        .single()

      if (insertError || !inserted) {
        // Revert optimistic state on failure
        cartRef.current = cartRef.current.filter(c => c.id !== tempId)
        setCartItems(prev => prev.filter(c => c.id !== tempId))
        return
      }

      // Replace temp ID with the real DB UUID so subsequent +/delete ops use the right ID
      // If fetchCart() from the realtime INSERT event already ran and replaced it, this is a no-op
      cartRef.current = cartRef.current.map(c => c.id === tempId ? { ...c, id: inserted.id } : c)
      setCartItems(prev => prev.map(c => c.id === tempId ? { ...c, id: inserted.id } : c))
      fetchCart()
    }
  }

  async function removeItem(cartItemId) {
    pendingDeletesRef.current.add(cartItemId)
    cartRef.current = cartRef.current.filter(c => c.id !== cartItemId)
    setCartItems(prev => prev.filter(c => c.id !== cartItemId))
    const { error } = await supabase
      .from('session_cart_items')
      .delete()
      .eq('id', cartItemId)
    pendingDeletesRef.current.delete(cartItemId)
    if (error) fetchCart()
  }

  async function updateQuantity(cartItemId, quantity) {
    if (quantity <= 0) {
      await removeItem(cartItemId)
    } else {
      pendingUpdatesRef.current.set(cartItemId, quantity)
      cartRef.current = cartRef.current.map(c => c.id === cartItemId ? { ...c, quantity } : c)
      setCartItems(prev => prev.map(c => c.id === cartItemId ? { ...c, quantity } : c))
      await supabase
        .from('session_cart_items')
        .update({ quantity })
        .eq('id', cartItemId)
      pendingUpdatesRef.current.delete(cartItemId)
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
