import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Download, QrCode } from 'lucide-react'

export default function TableManager({ restaurantId }) {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ number: '', name: '' })
  const [saving, setSaving] = useState(false)
  const [selectedTable, setSelectedTable] = useState(null)

  const baseUrl = window.location.origin

  useEffect(() => {
    if (restaurantId) fetchTables()
  }, [restaurantId])

  async function fetchTables() {
    const { data } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('number')
    setTables(data ?? [])
    setLoading(false)
  }

  async function saveTable() {
    if (!form.number || !form.name) return
    setSaving(true)
    await supabase.from('tables').insert({
      restaurant_id: restaurantId,
      number: parseInt(form.number),
      name: form.name,
    })
    setSaving(false)
    setShowForm(false)
    setForm({ number: '', name: '' })
    fetchTables()
  }

  async function deleteTable(id) {
    if (!confirm('¿Eliminar esta mesa?')) return
    await supabase.from('tables').delete().eq('id', id)
    fetchTables()
  }

  function downloadQR(table) {
    const svg = document.getElementById(`qr-${table.id}`)
    if (!svg) return
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 450
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 400, 450)
    const img = new Image()
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      ctx.drawImage(img, 50, 30, 300, 300)
      ctx.fillStyle = '#111111'
      ctx.font = 'bold 22px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(table.name, 200, 380)
      ctx.font = '14px Inter, sans-serif'
      ctx.fillStyle = '#666666'
      ctx.fillText('Escanear para ver el menú', 200, 410)
      URL.revokeObjectURL(url)
      const link = document.createElement('a')
      link.download = `QR-${table.name.replace(/\s+/g, '-')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = url
  }

  if (loading) return (
    <div className="p-6 flex justify-center">
      <div className="w-8 h-8 border-2 border-neutral-700 border-t-gold-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Mesas y QR</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-neutral-900 font-medium rounded-lg text-sm transition-colors"
        >
          <Plus size={16} /> Nueva mesa
        </button>
      </div>

      {tables.length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          <QrCode size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay mesas creadas</p>
          <p className="text-sm mt-1">Cada mesa tiene un QR único para que el cliente acceda al menú</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {tables.map(table => {
            const menuUrl = `${baseUrl}/menu/${table.id}`
            return (
              <div key={table.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col items-center gap-4">
                <p className="font-semibold text-white">{table.name}</p>
                <div className="bg-white p-3 rounded-xl">
                  <QRCodeSVG
                    id={`qr-${table.id}`}
                    value={menuUrl}
                    size={140}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => downloadQR(table)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Download size={13} /> Descargar
                  </button>
                  <button
                    onClick={() => setSelectedTable(table)}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-lg text-xs transition-colors"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => deleteTable(table.id)}
                    className="px-3 py-2 bg-neutral-800 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-lg text-xs transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nueva mesa */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-sm animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800">
              <h2 className="font-semibold text-white">Nueva mesa</h2>
              <button onClick={() => setShowForm(false)} className="text-neutral-500 hover:text-white text-xl leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Número</label>
                <input
                  type="number" value={form.number} min="1"
                  onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                  className="input" placeholder="1"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Nombre visible</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input" placeholder="Mesa 1, Terraza 3, Barra..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-neutral-400 hover:text-white">Cancelar</button>
                <button onClick={saveTable} disabled={saving}
                  className="px-4 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-neutral-900 font-medium rounded-lg text-sm">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal vista QR ampliado */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedTable(null)}>
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 animate-fade-in" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-neutral-900 text-xl">{selectedTable.name}</p>
            <QRCodeSVG value={`${baseUrl}/menu/${selectedTable.id}`} size={240} level="H" includeMargin />
            <p className="text-neutral-500 text-sm">Escanear para ver el menú</p>
            <button onClick={() => setSelectedTable(null)} className="text-neutral-400 text-sm hover:text-neutral-600">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}
