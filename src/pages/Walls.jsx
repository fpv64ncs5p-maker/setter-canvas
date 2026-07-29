import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, stamp, touch } from '../db/index'
import { savePhoto, deletePhoto } from '../lib/photos'
import { usePhoto } from '../lib/usePhoto'
import { PHOTO_SLOTS, displayPhotoId, availablePhotos } from '../lib/wallPhotos'

const WALL_TYPES = ['Boulder', 'Lead', 'Top-rope']
const ANGLES = ['Vertical', '15°', '30°', '45°', 'Roof']

const defaultForm = {
  name: '',
  type: 'Boulder',
  angle: 'Vertical',
  height: '',
  width: '',
  photoStrippedId: null,
  photoWithHoldsId: null,
  photoPartialId: null,
}

// ── Photo slot ───────────────────────────────────────────────────────────────

function PhotoSlot({ slot, photoId, busy, onPick, onRemove }) {
  const url = usePhoto(photoId)

  return (
    <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 rounded-lg p-2">
      {/* Thumbnail or placeholder */}
      <div className="w-16 h-12 shrink-0 rounded-md overflow-hidden bg-slate-800 flex items-center justify-center">
        {url
          ? <img src={url} alt={slot.label} className="w-full h-full object-cover" />
          : <span className="text-slate-600 text-xs">—</span>}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-200">{slot.label}</span>
          {slot.id === 'stripped' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-900">
              planning
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate">{busy ? 'Resizing…' : slot.hint}</p>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        <label className="text-xs px-2 py-1 rounded-md bg-slate-700 text-white hover:bg-slate-600 cursor-pointer transition-colors">
          {url ? 'Replace' : 'Add'}
          <input type="file" accept="image/*" onChange={onPick} disabled={busy} className="hidden" />
        </label>
        {url && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────────────────────

function WallModal({ wall, gymId, onClose, onSave }) {
  const [form, setForm] = useState(wall ? { ...wall } : { ...defaultForm })
  const [error, setError] = useState('')
  const [busySlot, setBusySlot] = useState(null)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSlotChange(slotKey, e) {
    const file = e.target.files[0]
    if (!file) return
    setBusySlot(slotKey)
    try {
      // Resized and stored locally; uploaded later if signed in.
      const photoId = await savePhoto(file, gymId)
      const previous = form[slotKey]
      set(slotKey, photoId)
      if (previous) await deletePhoto(previous)   // replacing, not accumulating
    } catch {
      setError('Could not read that image. Try a different file.')
    } finally {
      setBusySlot(null)
    }
  }

  async function handleRemoveSlot(slotKey) {
    const id = form[slotKey]
    set(slotKey, null)
    await deletePhoto(id)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Wall name is required.')
      return
    }
    await onSave(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-white mb-5">
          {wall ? 'Edit Wall' : 'New Wall'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Wall name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Overhang 45°, Slab Left"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Type + Angle */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Wall type</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
              >
                {WALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Angle</label>
              <select
                value={form.angle}
                onChange={e => set('angle', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
              >
                {ANGLES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Height + Width */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Height (m)</label>
              <input
                type="number" min="0" step="0.1"
                value={form.height}
                onChange={e => set('height', e.target.value)}
                placeholder="e.g. 4.5"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Width (m)</label>
              <input
                type="number" min="0" step="0.1"
                value={form.width}
                onChange={e => set('width', e.target.value)}
                placeholder="e.g. 8"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Wall photos</label>
            <div className="flex flex-col gap-2">
              {PHOTO_SLOTS.map(slot => (
                <PhotoSlot
                  key={slot.key}
                  slot={slot}
                  photoId={form[slot.key]}
                  busy={busySlot === slot.key}
                  onPick={e => handleSlotChange(slot.key, e)}
                  onRemove={() => handleRemoveSlot(slot.key)}
                />
              ))}
            </div>
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
              {wall ? 'Save changes' : 'Create wall'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Wall Card ─────────────────────────────────────────────────────────────────

function WallCard({ wall, onEdit, onDelete, onNewRoute }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const photo = usePhoto(displayPhotoId(wall))
  const slots = availablePhotos(wall)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col hover:border-slate-700 transition-colors">
      {/* Photo or placeholder */}
      <div className="relative">
        {photo ? (
          <img
            src={photo}
            alt={wall.name}
            className="w-full h-32 object-cover"
          />
        ) : (
          <div className="w-full h-32 bg-slate-800 flex items-center justify-center text-slate-600 text-xs">
            No photo
          </div>
        )}

        {/* Which photo types this wall has */}
        {slots.length > 0 && (
          <div className="absolute bottom-1.5 left-1.5 flex gap-1">
            {slots.map(s => (
              <span
                key={s.key}
                title={s.hint}
                className="text-xs px-1.5 py-0.5 rounded bg-black/70 text-slate-200 backdrop-blur-sm"
              >
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-white font-semibold text-sm">{wall.name}</h3>
          <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {wall.type}
          </span>
        </div>

        {/* Details */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">{wall.angle}</span>
          {wall.height && <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">{wall.height}m tall</span>}
          {wall.width && <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">{wall.width}m wide</span>}
        </div>

        {/* New Route button */}
        <button
          onClick={onNewRoute}
          className="w-full py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          + New Route
        </button>

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
              <span className="text-xs text-slate-400">Are you sure?</span>
              <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">
                Yes, delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-400 hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ gymName, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl">🧱</div>
      <div>
        <h3 className="text-white font-semibold text-lg">No walls yet</h3>
        <p className="text-slate-400 text-sm mt-1">Add your first wall to {gymName || 'this gym'}.</p>
      </div>
      <button
        onClick={onAdd}
        className="mt-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
      >
        Add wall
      </button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Walls() {
  const { gymId } = useParams()
  const navigate = useNavigate()
  const [gym, setGym] = useState(null)
  const [walls, setWalls] = useState([])
  const [modal, setModal] = useState(null)

  useEffect(() => { loadData() }, [gymId])

  async function loadData() {
    const gymData = await db.gyms.get(gymId)
    if (!gymData) { navigate('/gyms'); return }
    setGym(gymData)
    const wallData = await db.walls.where('gymId').equals(gymId).toArray()
    setWalls(wallData)
  }

  async function handleSave(form) {
    if (form.id) {
      await db.walls.update(form.id, touch({ ...form, gymId }))
    } else {
      await db.walls.add(stamp({ ...form, gymId }))
    }
    await loadData()
  }

  async function handleDelete(id) {
    await db.walls.delete(id)
    await loadData()
  }

  async function handleNewRoute(wall) {
    const routeId = await db.routes.add(stamp({
      wallId: wall.id,
      gymId,
      name: `Route on ${wall.name}`,
      grade: '',
      status: 'planned',
      dateSet: new Date().toISOString().split('T')[0],
      canvasState: null,
    }))
    navigate(`/planner/${routeId}`)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/gyms')}
        className="text-sm text-slate-400 hover:text-white transition-colors mb-4 flex items-center gap-1"
      >
        ← Gyms
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{gym?.name ?? 'Walls'}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {walls.length === 0 ? 'No walls added yet.' : `${walls.length} wall${walls.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/gyms/${gymId}/holds`)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            Holds Library
          </button>
          <button
            onClick={() => navigate(`/gyms/${gymId}/portfolio`)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            Portfolio
          </button>
          {walls.length > 0 && (
            <button
              onClick={() => setModal('new')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              + Add wall
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {walls.length === 0 ? (
        <EmptyState gymName={gym?.name} onAdd={() => setModal('new')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {walls.map(wall => (
            <WallCard
              key={wall.id}
              wall={wall}
              onEdit={() => setModal(wall)}
              onDelete={() => handleDelete(wall.id)}
              onNewRoute={() => handleNewRoute(wall)}
            />
          ))}
        </div>
      )}

      {modal !== null && (
        <WallModal
          wall={modal === 'new' ? null : modal}
          gymId={gymId}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
