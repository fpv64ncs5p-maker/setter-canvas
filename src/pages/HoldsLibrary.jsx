import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../db/index'

const HOLD_TYPES = ['Jug', 'Crimp', 'Sloper', 'Pinch', 'Pocket', 'Volume', 'Feature', 'Down climb jug']
const SIZES = ['S', 'M', 'L', 'XL']
const CONDITIONS = ['New', 'Good', 'Worn', 'Damaged']
const COLORS = ['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink', 'White', 'Black', 'Grey', 'Brown', 'Teal']

const defaultForm = {
  name: '',
  brand: '',
  type: 'Jug',
  size: 'M',
  color: 'Red',
  quantity: 1,
  condition: 'Good',
}

// ── Color Dot ─────────────────────────────────────────────────────────────────

const COLOR_MAP = {
  Red: '#ef4444', Blue: '#3b82f6', Green: '#22c55e', Yellow: '#eab308',
  Orange: '#f97316', Purple: '#a855f7', Pink: '#ec4899', White: '#f1f5f9',
  Black: '#1e293b', Grey: '#64748b', Brown: '#92400e', Teal: '#14b8a6',
}

function ColorDot({ color, size = 'sm' }) {
  const px = size === 'sm' ? '10px' : '14px'
  return (
    <span
      style={{ backgroundColor: COLOR_MAP[color] ?? '#64748b', width: px, height: px }}
      className="inline-block rounded-full border border-white/10 shrink-0"
    />
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function HoldModal({ hold, onClose, onSave }) {
  const [form, setForm] = useState(hold ? { ...hold } : { ...defaultForm })
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Hold name is required.')
      return
    }
    await onSave(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-5">
          {hold ? 'Edit Hold' : 'New Hold'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Hold name / code *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Teknik Crimp #12"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Brand */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Brand</label>
            <input
              type="text"
              value={form.brand}
              onChange={e => set('brand', e.target.value)}
              placeholder="e.g. Teknik, Climb It, So iLL"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Type + Size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
              >
                {HOLD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Size</label>
              <select
                value={form.size}
                onChange={e => set('size', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
              >
                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Color + Condition */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Color</label>
              <select
                value={form.color}
                onChange={e => set('color', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
              >
                {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Condition</label>
              <select
                value={form.condition}
                onChange={e => set('condition', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
              >
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Quantity owned</label>
            <input
              type="number"
              min="0"
              value={form.quantity}
              onChange={e => set('quantity', Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              {hold ? 'Save changes' : 'Add hold'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Hold Card ─────────────────────────────────────────────────────────────────

const CONDITION_STYLES = {
  New:     'bg-emerald-900/40 text-emerald-400',
  Good:    'bg-slate-800 text-slate-300',
  Worn:    'bg-yellow-900/40 text-yellow-400',
  Damaged: 'bg-red-900/40 text-red-400',
}

function HoldCard({ hold, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 hover:border-slate-700 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3">
        <ColorDot color={hold.color} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium text-sm truncate">{hold.name}</h3>
          {hold.brand && <p className="text-slate-500 text-xs mt-0.5">{hold.brand}</p>}
        </div>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{hold.type}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{hold.size}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">×{hold.quantity}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${CONDITION_STYLES[hold.condition] ?? 'bg-slate-800 text-slate-300'}`}>
          {hold.condition}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
        <button
          onClick={onEdit}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Edit
        </button>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-slate-400 hover:text-red-400 transition-colors ml-auto"
          >
            Delete
          </button>
        ) : (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-400">Sure?</span>
            <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">
              Yes
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-400 hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Filter Bar ────────────────────────────────────────────────────────────────

function FilterBar({ filters, onChange, holds }) {
  const brands = [...new Set(holds.map(h => h.brand).filter(Boolean))]

  function setFilter(key, value) {
    onChange({ ...filters, [key]: value })
  }

  const selectClass = "bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-slate-500"

  return (
    <div className="flex flex-wrap gap-2 mb-5">
      <select value={filters.type} onChange={e => setFilter('type', e.target.value)} className={selectClass}>
        <option value="">All types</option>
        {HOLD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <select value={filters.size} onChange={e => setFilter('size', e.target.value)} className={selectClass}>
        <option value="">All sizes</option>
        {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <select value={filters.color} onChange={e => setFilter('color', e.target.value)} className={selectClass}>
        <option value="">All colors</option>
        {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {brands.length > 0 && (
        <select value={filters.brand} onChange={e => setFilter('brand', e.target.value)} className={selectClass}>
          <option value="">All brands</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      )}

      {(filters.type || filters.size || filters.color || filters.brand) && (
        <button
          onClick={() => onChange({ type: '', size: '', color: '', brand: '' })}
          className="text-xs text-slate-400 hover:text-white px-2 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ gymName, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl">
        🤜
      </div>
      <div>
        <h3 className="text-white font-semibold text-lg">No holds yet</h3>
        <p className="text-slate-400 text-sm mt-1">
          Add holds to {gymName ? `${gymName}'s` : 'this gym\'s'} inventory.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="mt-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
      >
        Add hold
      </button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HoldsLibrary() {
  const { gymId } = useParams()
  const navigate = useNavigate()
  const [gym, setGym] = useState(null)
  const [holds, setHolds] = useState([])
  const [modal, setModal] = useState(null)
  const [filters, setFilters] = useState({ type: '', size: '', color: '', brand: '' })

  useEffect(() => {
    loadData()
  }, [gymId])

  async function loadData() {
    const gymData = await db.gyms.get(Number(gymId))
    if (!gymData) { navigate('/gyms'); return }
    setGym(gymData)
    const holdData = await db.holds.where('gymId').equals(Number(gymId)).toArray()
    setHolds(holdData)
  }

  async function handleSave(form) {
    if (form.id) {
      await db.holds.update(form.id, { ...form, gymId: Number(gymId) })
    } else {
      await db.holds.add({ ...form, gymId: Number(gymId) })
    }
    await loadData()
  }

  async function handleDelete(id) {
    await db.holds.delete(id)
    await loadData()
  }

  const filtered = holds.filter(h => {
    if (filters.type && h.type !== filters.type) return false
    if (filters.size && h.size !== filters.size) return false
    if (filters.color && h.color !== filters.color) return false
    if (filters.brand && h.brand !== filters.brand) return false
    return true
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate(`/gyms/${gymId}/walls`)}
        className="text-sm text-slate-400 hover:text-white transition-colors mb-4 flex items-center gap-1"
      >
        ← {gym?.name ?? 'Walls'}
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Holds Library</h1>
          <p className="text-slate-400 text-sm mt-1">
            {holds.length === 0
              ? 'No holds added yet.'
              : `${holds.length} hold${holds.length === 1 ? '' : 's'} · ${filtered.length} shown`}
          </p>
        </div>
        {holds.length > 0 && (
          <button
            onClick={() => setModal('new')}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            + Add hold
          </button>
        )}
      </div>

      {/* Filters */}
      {holds.length > 0 && (
        <FilterBar filters={filters} onChange={setFilters} holds={holds} />
      )}

      {/* Content */}
      {holds.length === 0 ? (
        <EmptyState gymName={gym?.name} onAdd={() => setModal('new')} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          No holds match your filters.{' '}
          <button
            onClick={() => setFilters({ type: '', size: '', color: '', brand: '' })}
            className="text-indigo-400 hover:text-indigo-300 underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(hold => (
            <HoldCard
              key={hold.id}
              hold={hold}
              onEdit={() => setModal(hold)}
              onDelete={() => handleDelete(hold.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <HoldModal
          hold={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
