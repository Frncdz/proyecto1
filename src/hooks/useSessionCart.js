import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSessionCart(sessionId, myParticipantId, participants = []) {
  const [cartItems, setCartItems] = useState([])
  const channelRef = useRef(null)
  // Always holds latest cart state — avoids stale closures on rapid taps
  const cartRef = useRef([])
  // IDs being deleted — fetchCart() filters these to prevent race-condition restores
  const pendingDeletesRef = useRef(new Set())
  // cartItemId → latest intended quantity for in-flight DB updates
  const pendingUpdatesRef = useRef(new Map())
  // `${menu_item_id}:${participant_id}` → desired quantity while INSERT is in-flight
  // Prevents any DB call on temp IDs by accumulating changes and applying after INSERT
  const insertQueueRef = useRef(new Map())

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
      let result = (data ?? []).filter(item => !pendingDeletesRef.current.has(item.id))
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
    const insertKey = `${menuItem.id}:${myParticipantId}`

    if (existing) {
      if (existing.id.startsWith('tmp-')) {
        // INSERT still in-flight — accumulate in queue, no DB call
        const currentDesired = insertQueueRef.current.get(insertKey) ?? existing.quantity
        const newDesired = currentDesired + 1
        insertQueueRef.current.set(insertKey, newDesired)
        cartRef.current = cartRef.current.map(c =>
          c.id === existing.id ? { ...c, quantity: newDesired } : c
        )
        setCartItems(prev => prev.map(c =>
          c.id === existing.id ? { ...c, quantity: newDesired } : c
        ))
        return
      }
      // Real UUID — safe to UPDATE
      const newQty = existing.quantity + 1
      pendingUpdatesRef.current.set(existing.id, newQty)
      cartRef.current = cartRef.current.map(c =>
        c.id === existing.id ? { ...c, quantity: newQty } : c
      )
      setCartItems(prev => prev.map(c =>
        c.id === existing.id ? { ...c, quantity: newQty } : c
      ))
      await supabase
        .from('session_cart_items')
        .update({ quantity: newQty })
        .eq('id', existing.id)
      pendingUpdatesRef.current.delete(existing.id)
      fetchCart()
    } else {
      const tempId = `tmp-${menuItem.id}-${myParticipantId}`
      if (current.some(c => c.id === tempId)) return
      insertQueueRef.current.set(insertKey, 1)
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
        insertQueueRef.current.delete(insertKey)
        cartRef.current = cartRef.current.filter(c => c.id !== tempId)
        setCartItems(prev => prev.filter(c => c.id !== tempId))
        return
      }

      // Replace temp ID with real UUID
      cartRef.current = cartRef.current.map(c =>
        c.id === tempId ? { ...c, id: inserted.id } : c
      )
      setCartItems(prev => prev.map(c =>
        c.id === tempId ? { ...c, id: inserted.id } : c
      ))

      // Apply accumulated changes from taps that happened while INSERT was in-flight
      const desiredQty = insertQueueRef.current.get(insertKey) ?? 1
      insertQueueRef.current.delete(insertKey)

      if (desiredQty === 0) {
        // User deleted the item before INSERT completed
        pendingDeletesRef.current.add(inserted.id)
        cartRef.current = cartRef.current.filter(c => c.id !== inserted.id)
        setCartItems(prev => prev.filter(c => c.id !== inserted.id))
        await supabase.from('session_cart_items').delete().eq('id', inserted.id)
        pendingDeletesRef.current.delete(inserted.id)
      } else if (desiredQty > 1) {
        // User tapped + while INSERT was pending
        pendingUpdatesRef.current.set(inserted.id, desiredQty)
        cartRef.current = cartRef.current.map(c =>
          c.id === inserted.id ? { ...c, quantity: desiredQty } : c
        )
        setCartItems(prev => prev.map(c =>
          c.id === inserted.id ? { ...c, quantity: desiredQty } : c
        ))
        await supabase
          .from('session_cart_items')
          .update({ quantity: desiredQty })
          .eq('id', inserted.id)
        pendingUpdatesRef.current.delete(inserted.id)
      }

      fetchCart()
    }
  }

  async function removeItem(cartItemId) {
    if (cartItemId.startsWith('tmp-')) {
      // INSERT in-flight — mark for deletion, no DB call yet
      const item = cartRef.current.find(c => c.id === cartItemId)
      if (item) {
        insertQueueRef.current.set(`${item.menu_item_id}:${myParticipantId}`, 0)
      }
      cartRef.current = cartRef.current.filter(c => c.id !== cartItemId)
      setCartItems(prev => prev.filter(c => c.id !== cartItemId))
      return
    }
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
    if (cartItemId.startsWith('tmp-')) {
      // INSERT in-flight — accumulate, no DB call
      const item = cartRef.current.find(c => c.id === cartItemId)
      if (!item) return
      const insertKey = `${item.menu_item_id}:${myParticipantId}`
      if (quantity <= 0) {
        insertQueueRef.current.set(insertKey, 0)
        cartRef.current = cartRef.current.filter(c => c.id !== cartItemId)
        setCartItems(prev => prev.filter(c => c.id !== cartItemId))
      } else {
        insertQueueRef.current.set(insertKey, quantity)
        cartRef.current = cartRef.current.map(c =>
          c.id === cartItemId ? { ...c, quantity } : c
        )
        setCartItems(prev => prev.map(c =>
          c.id === cartItemId ? { ...c, quantity } : c
        ))
      }
      return
    }
    if (quantity <= 0) {
      await removeItem(cartItemId)
    } else {
      pendingUpdatesRef.current.set(cartItemId, quantity)
      cartRef.current = cartRef.current.map(c =>
        c.id === cartItemId ? { ...c, quantity } : c
      )
      setCartItems(prev => prev.map(c =>
        c.id === cartItemId ? { ...c, quantity } : c
      ))
      await supabase
        .from('session_cart_items')
        .update({ quantity })
        .eq('id', cartItemId)
      pendingUpdatesRef.current.delete(cartItemId)
      fetchCart()
    }
  }

  const nameById = participants.reduce((acc, p) => { acc[p.id] = p.name; return acc }, {})

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
