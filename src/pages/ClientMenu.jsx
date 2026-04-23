import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTableSession } from '../hooks/useTableSession'
import SessionGate from '../components/client/SessionGate'
import SessionMenu from '../components/client/SessionMenu'
import LoadingSpinner from '../components/shared/LoadingSpinner'

export default function ClientMenu() {
  const { tableId } = useParams()
  const [table, setTable] = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [tableLoading, setTableLoading] = useState(true)

  useEffect(() => {
    async function fetchTableAndRestaurant() {
      const { data } = await supabase
        .from('tables')
        .select('*, restaurants(*)')
        .eq('id', tableId)
        .single()
      if (data) { setTable(data); setRestaurant(data.restaurants) }
      setTableLoading(false)
    }
    fetchTableAndRestaurant()
  }, [tableId])

  if (tableLoading) return <LoadingSpinner text="Cargando menú..." />

  if (!table || !restaurant) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white font-medium">Mesa no encontrada</p>
          <p className="text-neutral-400 text-sm mt-1">El QR puede ser inválido o estar deshabilitado.</p>
        </div>
      </div>
    )
  }

  return <SessionFlow table={table} restaurant={restaurant} />
}

function SessionFlow({ table, restaurant }) {
  const session = useTableSession(table.id, restaurant.id)

  const {
    status, session: tableSession, myParticipant, participants, pendingJoins,
    ownerName, allReady, isOwner,
    createSession, joinSession,
    approveParticipant, rejectParticipant, markOrderReady, closeSession,
  } = session

  if (status === 'approved' && tableSession && myParticipant) {
    return (
      <SessionMenu
        restaurant={restaurant}
        table={table}
        session={tableSession}
        myParticipant={myParticipant}
        participants={participants}
        pendingJoins={pendingJoins}
        isOwner={isOwner}
        allReady={allReady}
        approveParticipant={approveParticipant}
        rejectParticipant={rejectParticipant}
        markOrderReady={markOrderReady}
        closeSession={closeSession}
      />
    )
  }

  return (
    <SessionGate
      status={status}
      ownerName={ownerName}
      createSession={createSession}
      joinSession={joinSession}
    />
  )
}
