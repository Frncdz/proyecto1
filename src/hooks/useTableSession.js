import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const TOKEN_KEY = (tableId) => `sv_token_${tableId}`

export function useTableSession(tableId, restaurantId) {
  const [status, setStatus] = useState('loading')
  // loading | enter_name | join_existing | waiting_approval | approved | rejected | closed

  const [session, setSession]             = useState(null)
  const [myParticipant, setMyParticipant] = useState(null)
  const [participants, setParticipants]   = useState([])
  const [pendingJoins, setPendingJoins]   = useState([])
  const [ownerName, setOwnerName]         = useState('')

  const sessionChannelRef     = useRef(null)
  const participantChannelRef = useRef(null)

  useEffect(() => {
    if (tableId && restaurantId) initialize()
    return () => {
      sessionChannelRef.current && supabase.removeChannel(sessionChannelRef.current)
      participantChannelRef.current && supabase.removeChannel(participantChannelRef.current)
    }
  }, [tableId, restaurantId])

  async function initialize() {
    const savedToken = localStorage.getItem(TOKEN_KEY(tableId))

    if (savedToken) {
      const { data: participant } = await supabase
        .from('session_participants')
        .select('*, table_sessions(*)')
        .eq('token', savedToken)
        .single()

      if (participant) {
        const sess = participant.table_sessions
        if (sess.status === 'closed') { setStatus('closed'); return }
        if (participant.status === 'rejected') {
          localStorage.removeItem(TOKEN_KEY(tableId))
          setStatus('rejected'); return
        }
        setSession(sess)
        setMyParticipant(participant)
        if (participant.status === 'approved') {
          setStatus('approved')
          subscribeToSession(sess.id)
        } else {
          setStatus('waiting_approval')
          subscribeToParticipant(participant.id, sess.id)
        }
        return
      }
      localStorage.removeItem(TOKEN_KEY(tableId))
    }

    // No token — buscar sesión activa en la mesa
    const { data: activeSession } = await supabase
      .from('table_sessions')
      .select('*, session_participants(id, name, role, status)')
      .eq('table_id', tableId)
      .eq('status', 'open')
      .maybeSingle()

    if (activeSession) {
      const owner = activeSession.session_participants?.find(p => p.role === 'owner' && p.status === 'approved')
      setSession(activeSession)
      setOwnerName(owner?.name ?? 'el dueño de la mesa')
      setStatus('join_existing')
    } else {
      setStatus('enter_name')
    }
  }

  async function createSession(name) {
    const { data: newSession, error: sessErr } = await supabase
      .from('table_sessions')
      .insert({ table_id: tableId, restaurant_id: restaurantId })
      .select()
      .single()
    if (sessErr) return

    const { data: participant, error: partErr } = await supabase
      .from('session_participants')
      .insert({ session_id: newSession.id, name, role: 'owner', status: 'approved' })
      .select()
      .single()
    if (partErr) return

    localStorage.setItem(TOKEN_KEY(tableId), participant.token)
    setSession(newSession)
    setMyParticipant(participant)
    setStatus('approved')
    subscribeToSession(newSession.id)
  }

  async function joinSession(name) {
    if (!session) return
    const { data: participant, error } = await supabase
      .from('session_participants')
      .insert({ session_id: session.id, name, role: 'companion', status: 'pending' })
      .select()
      .single()
    if (error) return

    localStorage.setItem(TOKEN_KEY(tableId), participant.token)
    setMyParticipant(participant)
    setStatus('waiting_approval')
    subscribeToParticipant(participant.id, session.id)
  }

  function subscribeToParticipant(participantId, sessionId) {
    const ch = supabase
      .channel(`participant:${participantId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'session_participants',
        filter: `id=eq.${participantId}`,
      }, ({ new: updated }) => {
        setMyParticipant(updated)
        if (updated.status === 'approved') {
          setStatus('approved')
          subscribeToSession(sessionId)
        } else if (updated.status === 'rejected') {
          localStorage.removeItem(TOKEN_KEY(tableId))
          setStatus('rejected')
        }
      })
      .subscribe()
    participantChannelRef.current = ch
  }

  function subscribeToSession(sessionId) {
    fetchParticipants(sessionId)

    const ch = supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'session_participants',
        filter: `session_id=eq.${sessionId}`,
      }, () => fetchParticipants(sessionId))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'table_sessions',
        filter: `id=eq.${sessionId}`,
      }, ({ new: updated }) => {
        setSession(updated)
        if (updated.status === 'closed') setStatus('closed')
      })
      .subscribe()
    sessionChannelRef.current = ch
  }

  async function fetchParticipants(sessionId) {
    const { data } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at')
    const all = data ?? []
    setParticipants(all.filter(p => p.status === 'approved'))
    setPendingJoins(all.filter(p => p.status === 'pending'))
  }

  async function approveParticipant(id) {
    await supabase.from('session_participants').update({ status: 'approved' }).eq('id', id)
  }

  async function rejectParticipant(id) {
    await supabase.from('session_participants').update({ status: 'rejected' }).eq('id', id)
  }

  async function markOrderReady(participantId, value = true) {
    await supabase.from('session_participants').update({ order_ready: value }).eq('id', participantId)
    setMyParticipant(p => p ? { ...p, order_ready: value } : p)
  }

  const allReady = participants.length > 0 && participants.every(p => p.order_ready)
  const isOwner  = myParticipant?.role === 'owner'

  return {
    status, session, myParticipant, participants, pendingJoins, ownerName,
    allReady, isOwner,
    createSession, joinSession,
    approveParticipant, rejectParticipant, markOrderReady,
  }
}
