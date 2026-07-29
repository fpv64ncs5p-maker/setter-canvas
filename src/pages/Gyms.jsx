import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, stamp, touch } from '../db/index'

const GRADING_SYSTEMS = ['Fontainebleau', 'V-Scale', 'Custom']

const defaultForm = {
  name: '',
  location: '',
  gradingSystem: 'Fontainebleau',
  notes: '',
}

// ── Modal ────────────────────────────────────────────────────────────────────

function GymModal({ gym, onClose, onSave }) {
  const [form, setForm] = useState(gym ? { ...gym } : { ...defaultForm })
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Gym name is required.')
      return
    }
    await onSave(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-5">
          {gym ? 'Edit Gym' : 'New Gym'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Gym name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Boulder Barn"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="e.g. Amsterdam, NL"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Grading system */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Grading system</label>
            <select
              value={form.gradingSystem}
              onChange={e => set('gradingSystem', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
            >
              {GRADING_SYSTEMS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Optional notes about this gym..."
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 resize-none"
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
              {gym ? 'Save changes' : 'Create gym'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Gym Card ─────────────────────────────────────────────────────────────────

function GymCard({ gym, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const navigate = useNavigate()

  return (
    <div
      className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3 hover:border-slate-600 cursor-pointer transition-colors"
      onClick={() => navigate(`/gyms/${gym.id}/walls`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-white font-semibold text-base">{gym.name}</h3>
          {gym.location && (
            <p className="text-slate-400 text-sm mt-0.5">{gym.location}</p>
          )}
        </div>
        <span className="shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-slate-800 text-slate-300">
          {gym.gradingSystem}
        </span>
      </div>

      {/* Notes */}
      {gym.notes && (
        <p className="text-slate-500 text-sm line-clamp-2">{gym.notes}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-1 border-t border-slate-800">
        <button
          onClick={e => { e.stopPropagation(); onEdit() }}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Edit
        </button>

        {!confirmDelete ? (
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
            className="text-xs text-slate-400 hover:text-red-400 transition-colors ml-auto"
          >
            Delete
          </button>
        ) : (
          <div className="flex items-center gap-2 ml-auto" onClick={e => e.stopPropagation()}>
            <span className="text-xs text-slate-400">Are you sure?</span>
            <button
              onClick={onDelete}
              className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl">
        🧗
      </div>
      <div>
        <h3 className="text-white font-semibold text-lg">No gyms yet</h3>
        <p className="text-slate-400 text-sm mt-1">Add your first gym to get started.</p>
      </div>
      <button
        onClick={onAdd}
        className="mt-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
      >
        Add gym
      </button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Gyms() {
  const [gyms, setGyms] = useState([])
  const [modal, setModal] = useState(null) // null | 'new' | gym object

  useEffect(() => {
    loadGyms()
  }, [])

  async function loadGyms() {
    const all = await db.gyms.toArray()
    setGyms(all)
  }

  async function handleSave(form) {
    if (form.id) {
      await db.gyms.update(form.id, touch(form))
    } else {
      await db.gyms.add(stamp(form))
    }
    await loadGyms()
  }

  async function handleDelete(id) {
    await db.gyms.delete(id)
    await loadGyms()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Gyms</h1>
          <p className="text-slate-400 text-sm mt-1">
            {gyms.length === 0
              ? 'No gyms added yet.'
              : `${gyms.length} gym${gyms.length === 1 ? '' : 's'}`}
          </p>
        </div>
        {gyms.length > 0 && (
          <button
            onClick={() => setModal('new')}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            + Add gym
          </button>
        )}
      </div>

      {/* Content */}
      {gyms.length === 0 ? (
        <EmptyState onAdd={() => setModal('new')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gyms.map(gym => (
            <GymCard
              key={gym.id}
              gym={gym}
              onEdit={() => setModal(gym)}
              onDelete={() => handleDelete(gym.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <GymModal
          gym={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
