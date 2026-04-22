import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMenu } from '../hooks/useMenu'
import { supabase } from '../lib/supabase'
import AdminLayout from '../components/shared/AdminLayout'
import DashboardHome from '../components/admin/DashboardHome'
import MenuManager from '../components/admin/MenuManager'
import OrdersPanel from '../components/admin/OrdersPanel'
import TableManager from '../components/admin/TableManager'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { UtensilsCrossed } from 'lucide-react'

export default function AdminDashboard() {
  const { profile, loading, signOut } = useAuth()

  if (loading) return <LoadingSpinner text="Cargando panel..." />

  // Sin restaurante asignado → onboarding
  if (!profile?.restaurant_id) {
    return <RestaurantOnboarding userId={profile?.id} />
  }

  return (
    <AdminLayout>
      <AdminRoutes restaurantId={profile.restaurant_id} restaurantName={profile.restaurants?.name} />
    </AdminLayout>
  )
}

function RestaurantOnboarding({ userId }) {
  const { signOut } = useAuth()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now()

    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .insert({ name: name.trim(), slug })
      .select()
      .single()

    if (restError) {
      setError('No se pudo crear el restaurante. Intentá de nuevo.')
      setSaving(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ restaurant_id: restaurant.id })
      .eq('id', userId)

    if (profileError) {
      setError('Restaurante creado pero no se pudo vincular al perfil.')
      setSaving(false)
      return
    }

    // Recargar la página para que AuthContext lea el perfil actualizado
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gold-500 flex items-center justify-center mb-4">
            <UtensilsCrossed size={28} className="text-neutral-900" />
          </div>
          <h1 className="text-xl font-bold text-white">Configurar restaurante</h1>
          <p className="text-neutral-400 text-sm mt-1 text-center">
            Tu cuenta no tiene un restaurante asignado.<br />Creá uno para empezar.
          </p>
        </div>

        <form onSubmit={handleCreate} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
              Nombre del restaurante
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="input"
              placeholder="Mi Restaurante"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-neutral-900 font-semibold rounded-xl transition-colors"
          >
            {saving ? 'Creando...' : 'Crear y entrar al panel'}
          </button>
        </form>

        <button
          onClick={signOut}
          className="w-full mt-3 text-sm text-neutral-600 hover:text-neutral-400 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

function AdminRoutes({ restaurantId, restaurantName }) {
  const { categories, items, refetch } = useMenu(restaurantId)

  return (
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DashboardHome restaurantId={restaurantId} restaurantName={restaurantName} />} />
      <Route path="menu"      element={<MenuManager categories={categories} items={items} restaurantId={restaurantId} onRefetch={refetch} />} />
      <Route path="orders"    element={<OrdersPanel restaurantId={restaurantId} />} />
      <Route path="tables"    element={<TableManager restaurantId={restaurantId} />} />
    </Routes>
  )
}
