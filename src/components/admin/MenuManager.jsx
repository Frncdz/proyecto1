import { useState } from 'react'
import { supabase, BUCKETS } from '../../lib/supabase'
import { Plus, Pencil, Trash2, ImagePlus, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react'

export default function MenuManager({ categories, items, restaurantId, onRefetch }) {
  const [activeCategory, setActiveCategory] = useState(null)
  const [showCatForm, setShowCatForm] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [saving, setSaving] = useState(false)

  const [catForm, setCatForm] = useState({ name: '', description: '' })
  const [itemForm, setItemForm] = useState({
    name: '', description: '', price: '', image_url: '', is_available: true, tags: '',
  })

  function openCatForm(cat = null) {
    setEditingCat(cat)
    setCatForm(cat ? { name: cat.name, description: cat.description ?? '' } : { name: '', description: '' })
    setShowCatForm(true)
  }

  function openItemForm(item = null, categoryId = null) {
    setEditingItem(item)
    setUploadError(null)
    setItemForm(item
      ? { name: item.name, description: item.description ?? '', price: item.price, image_url: item.image_url ?? '', is_available: item.is_available, tags: (item.tags ?? []).join(', ') }
      : { name: '', description: '', price: '', image_url: '', is_available: true, tags: '' }
    )
    if (categoryId) setActiveCategory(categoryId)
    setShowItemForm(true)
  }

  async function uploadImage(file) {
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
    const MAX_SIZE_MB = 2

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Formato no permitido. Usá JPG, PNG o WebP.')
      return null
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`La imagen supera los ${MAX_SIZE_MB}MB. Reducí el tamaño e intentá de nuevo.`)
      return null
    }

    setUploadError(null)
    setUploading(true)
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `${restaurantId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(BUCKETS.MENU_IMAGES).upload(path, file)
    setUploading(false)
    if (error) { setUploadError(`Error al subir: ${error.message}`); return null }
    const { data } = supabase.storage.from(BUCKETS.MENU_IMAGES).getPublicUrl(path)
    return data.publicUrl
  }

  async function saveCategory() {
    setSaving(true)
    const payload = { ...catForm, restaurant_id: restaurantId }
    if (editingCat) {
      await supabase.from('categories').update(payload).eq('id', editingCat.id)
    } else {
      await supabase.from('categories').insert(payload)
    }
    setSaving(false)
    setShowCatForm(false)
    onRefetch()
  }

  async function deleteCategory(id) {
    if (!confirm('¿Eliminar esta categoría y todos sus platos?')) return
    await supabase.from('categories').delete().eq('id', id)
    onRefetch()
  }

  async function saveItem() {
    setSaving(true)
    const payload = {
      name: itemForm.name,
      description: itemForm.description,
      price: parseFloat(itemForm.price),
      image_url: itemForm.image_url || null,
      is_available: itemForm.is_available,
      tags: itemForm.tags ? itemForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      category_id: activeCategory,
      restaurant_id: restaurantId,
    }
    if (editingItem) {
      await supabase.from('menu_items').update(payload).eq('id', editingItem.id)
    } else {
      await supabase.from('menu_items').insert(payload)
    }
    setSaving(false)
    setShowItemForm(false)
    onRefetch()
  }

  async function deleteItem(id) {
    if (!confirm('¿Eliminar este plato?')) return
    await supabase.from('menu_items').delete().eq('id', id)
    onRefetch()
  }

  async function toggleItemAvailability(item) {
    await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id)
    onRefetch()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Menú</h1>
        <button
          onClick={() => openCatForm()}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-neutral-900 font-medium rounded-lg text-sm transition-colors"
        >
          <Plus size={16} /> Nueva categoría
        </button>
      </div>

      {/* Lista de categorías */}
      <div className="space-y-4">
        {categories.map(cat => (
          <div key={cat.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            {/* Header categoría */}
            <div className="flex items-center justify-between p-4">
              <button
                className="flex items-center gap-2 text-white font-medium"
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              >
                {activeCategory === cat.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                {cat.name}
                <span className="text-xs text-neutral-500 font-normal ml-1">
                  ({items.filter(i => i.category_id === cat.id).length} platos)
                </span>
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => openItemForm(null, cat.id)} className="p-1.5 text-neutral-400 hover:text-gold-400 transition-colors" title="Agregar plato">
                  <Plus size={16} />
                </button>
                <button onClick={() => openCatForm(cat)} className="p-1.5 text-neutral-400 hover:text-white transition-colors">
                  <Pencil size={15} />
                </button>
                <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-neutral-400 hover:text-red-400 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Items de la categoría */}
            {activeCategory === cat.id && (
              <div className="border-t border-neutral-800">
                {items.filter(i => i.category_id === cat.id).map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border-b border-neutral-800/50 last:border-0">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                      : <div className="w-14 h-14 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                          <ImagePlus size={20} className="text-neutral-600" />
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${item.is_available ? 'text-white' : 'text-neutral-500 line-through'}`}>
                        {item.name}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">{item.description}</p>
                    </div>
                    <span className="text-gold-400 font-semibold text-sm shrink-0">
                      ${Number(item.price).toLocaleString('es-AR')}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => toggleItemAvailability(item)} className="p-1.5 text-neutral-400 hover:text-white transition-colors" title={item.is_available ? 'Deshabilitar' : 'Habilitar'}>
                        {item.is_available ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
                      </button>
                      <button onClick={() => openItemForm(item, cat.id)} className="p-1.5 text-neutral-400 hover:text-white transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => deleteItem(item.id)} className="p-1.5 text-neutral-400 hover:text-red-400 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="p-3">
                  <button
                    onClick={() => openItemForm(null, cat.id)}
                    className="w-full py-2 border border-dashed border-neutral-700 rounded-lg text-sm text-neutral-500 hover:border-gold-500/50 hover:text-gold-400 transition-colors"
                  >
                    + Agregar plato
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-16 text-neutral-500">
            <p>No hay categorías todavía.</p>
            <p className="text-sm mt-1">Crea la primera para empezar a armar el menú.</p>
          </div>
        )}
      </div>

      {/* Modal Categoría */}
      {showCatForm && (
        <Modal title={editingCat ? 'Editar categoría' : 'Nueva categoría'} onClose={() => setShowCatForm(false)}>
          <div className="space-y-4">
            <Field label="Nombre">
              <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                className="input" placeholder="Ej: Entradas, Principales..." />
            </Field>
            <Field label="Descripción (opcional)">
              <input value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))}
                className="input" placeholder="Descripción breve" />
            </Field>
            <ModalActions onCancel={() => setShowCatForm(false)} onSave={saveCategory} saving={saving} />
          </div>
        </Modal>
      )}

      {/* Modal Plato */}
      {showItemForm && (
        <Modal title={editingItem ? 'Editar plato' : 'Nuevo plato'} onClose={() => setShowItemForm(false)}>
          <div className="space-y-4">
            <Field label="Nombre">
              <input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                className="input" placeholder="Nombre del plato" />
            </Field>
            <Field label="Descripción">
              <textarea value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
                className="input resize-none" rows={3} placeholder="Descripción, ingredientes..." />
            </Field>
            <Field label="Precio">
              <input type="number" value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))}
                className="input" placeholder="0.00" min="0" step="0.01" />
            </Field>
            <Field label="Tags (opcional, separados por coma)">
              <input value={itemForm.tags} onChange={e => setItemForm(f => ({ ...f, tags: e.target.value }))}
                className="input" placeholder="vegano, sin-gluten, picante..." />
            </Field>
            <Field label="Imagen">
              {uploadError && (
                <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-2">
                  {uploadError}
                </p>
              )}
              <p className="text-xs text-neutral-600 mb-2">JPG, PNG o WebP · máximo 2MB</p>
              <div className="flex items-center gap-3">
                <input
                  type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" id="item-img"
                  className="hidden"
                  onChange={async e => {
                    const file = e.target.files[0]
                    if (!file) return
                    const url = await uploadImage(file)
                    if (url) setItemForm(f => ({ ...f, image_url: url }))
                  }}
                />
                <label htmlFor="item-img" className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-300 cursor-pointer transition-colors">
                  <ImagePlus size={16} />
                  {uploading ? 'Subiendo...' : 'Subir imagen'}
                </label>
                {itemForm.image_url && (
                  <img src={itemForm.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                )}
              </div>
              <input value={itemForm.image_url} onChange={e => setItemForm(f => ({ ...f, image_url: e.target.value }))}
                className="input mt-2" placeholder="O pegar URL de imagen..." />
            </Field>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={itemForm.is_available}
                onChange={e => setItemForm(f => ({ ...f, is_available: e.target.checked }))}
                className="w-4 h-4 accent-yellow-500" />
              <span className="text-sm text-neutral-300">Disponible para pedir</span>
            </label>
            <ModalActions onCancel={() => setShowItemForm(false)} onSave={saveItem} saving={saving} />
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <h2 className="font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors text-xl leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function ModalActions({ onCancel, onSave, saving }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button onClick={onCancel} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors">
        Cancelar
      </button>
      <button onClick={onSave} disabled={saving}
        className="px-4 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-neutral-900 font-medium rounded-lg text-sm transition-colors">
        {saving ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  )
}
