import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTableSession } from '../hooks/useTableSession'
import SessionGate from '../components/client/SessionGate'
import SessionMenu from '../components/client/SessionMenu'
import LoadingSpinner from '../components/shared/LoadingSpinner'

export default function ClientMenu() {
  const { tableId } = useParams()
  const [table, setTable]         = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [tableLoading, setTableLoading] = useState(true)

  useEffect(() => { fetchTableAndRestaurant() }, [tableId])

  async function fetchTableAndRestaurant() {
    const { data } = await supabase
      .from('tables')
      .select('*, restaurants(*)')
      .eq('id', tableId)
      .single()
    if (data) { setTable(data); setRestaurant(data.restaurants) }
    setTableLoading(false)
  }

  const tableSession = useTableSession(tableId, restaurant?.id)

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

  return (
    <SessionGate
      status={tableSession.status}
      ownerName={tableSession.ownerName}
      createSession={tableSession.createSession}
      joinSession={tableSession.joinSession}
    >
      <SessionMenu
        restaurant={restaurant}
        table={table}
        tableSession={tableSession}
      />
    </SessionGate>
  )
}
