import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../db/index'
import { usePhoto } from '../lib/usePhoto'
import { displayPhotoId } from '../lib/wallPhotos'

const COLOR_MAP = {
  Red: '#ef4444', Blue: '#3b82f6', Green: '#22c55e', Yellow: '#eab308',
  Orange: '#f97316', Purple: '#a855f7', Pink: '#ec4899', White: '#f1f5f9',
  Black: '#1e293b', Grey: '#64748b', Brown: '#92400e', Teal: '#14b8a6',
}

const STATUS_STYLES = {
  'planned':     'bg-slate-700 text-slate-300',
  'in progress': 'bg-blue-900/50 text-blue-300',
  'set':         'bg-yellow-900/50 text-yellow-300',
  'open':        'bg-emerald-900/50 text-emerald-300',
  'stripped':    'bg-red-900/50 text-red-400',
}

// ── Stars ─────────────────────────────────────────────────────────────────────
function Stars({ rating }) {
  if (!rating) return null
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? 'text-yellow-400' : 'text-slate-700'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

// ── Route Card ────────────────────────────────────────────────────────────────
function RouteCard({ route, wall, avgRating, onClick }) {
  const statusStyle = STATUS_STYLES[route.status] ?? 'bg-slate-700 text-slate-300'
  const photo = usePhoto(displayPhotoId(wall))

  return (
    <div
      onClick={onClick}
      className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col cursor-pointer hover:border-slate-600 hover:shadow-lg hover:shadow-black/30 transition-all"
    >
      {/* Thumbnail */}
      {photo ? (
        <img src={photo} alt={wall.name} className="w-full h-36 object-cover" />
      ) : (
        <div className="w-full h-36 bg-slate-800 flex items-center justify-center text-slate-600 text-xs">
          No wall photo
        </div>
      )}

      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Name + tape color */}
        <div className="flex items-start gap-2">
          {route.tapeColor && (
            <span
              className="mt-0.5 w-3.5 h-3.5 rounded-full shrink-0 border border-white/10"
              style={{ backgroundColor: COLOR_MAP[route.tapeColor] ?? '#64748b' }}
            />
          )}
          <h3 className="text-white font-semibold text-sm leading-tight flex-1">
            {route.name || 'Unnamed route'}
          </h3>
          {route.grade && (
            <span className="shrink-0 text-xs font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
              {route.grade}
            </span>
          )}
        </div>

        {/* Wall name */}
        {wall && (
          <p className="text-slate-500 text-xs">{wall.name}</p>
        )}

        {/* Status + date */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusStyle}`}>
            {route.status}
          </span>
          {route.dateSet && (
            <span className="text-xs text-slate-600">{route.dateSet}</span>
          )}
        </div>

        {/* Style tags */}
        {route.styleTags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {route.styleTags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">{tag}</span>
            ))}
            {route.styleTags.length > 3 && (
              <span className="text-xs text-slate-600">+{route.styleTags.length - 3}</span>
            )}
          </div>
        )}

        {/* Rating */}
        {avgRating !== null && (
          <div className="flex items-center gap-1.5 mt-auto pt-1">
            <Stars rating={avgRating} />
            <span className="text-xs text-slate-500">{avgRating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Filter bar ────────────────────────────────────────────────────────────────
function FilterBar({ filters, onChange, walls, routes }) {
  const grades = [...new Set(routes.map(r => r.grade).filter(Boolean))].sort()
  const statuses = [...new Set(routes.map(r => r.status).filter(Boolean))]

  function set(key, val) { onChange({ ...filters, [key]: val }) }

  const selectClass = "bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-slate-500"
  const hasFilters = filters.wallId || filters.status || filters.grade

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <select value={filters.wallId} onChange={e => set('wallId', e.target.value)} className={selectClass}>
        <option value="">All walls</option>
        {walls.map(w => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
      </select>

      <select value={filters.status} onChange={e => set('status', e.target.value)} className={selectClass}>
        <option value="">All statuses</option>
        {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
      </select>

      {grades.length > 0 && (
        <select value={filters.grade} onChange={e => set('grade', e.target.value)} className={selectClass}>
          <option value="">All grades</option>
          {grades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      )}

      {hasFilters && (
        <button
          onClick={() => onChange({ wallId: '', status: '', grade: '' })}
          className="text-xs text-slate-400 hover:text-white px-2 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ gymName, hasFilters, onClear }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl">📋</div>
      <div>
        <h3 className="text-white font-semibold text-lg">
          {hasFilters ? 'No routes match your filters' : 'No routes yet'}
        </h3>
        <p className="text-slate-400 text-sm mt-1">
          {hasFilters
            ? 'Try clearing your filters.'
            : `Create your first route from ${gymName ? `${gymName}'s` : 'a'} wall.`}
        </p>
      </div>
      {hasFilters && (
        <button onClick={onClear} className="text-sm text-indigo-400 hover:text-indigo-300 underline transition-colors">
          Clear filters
        </button>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Portfolio() {
  const { gymId } = useParams()
  const navigate = useNavigate()

  const [gym, setGym] = useState(null)
  const [routes, setRoutes] = useState([])
  const [walls, setWalls] = useState([])
  const [ratings, setRatings] = useState({}) // routeId -> avgRating
  const [filters, setFilters] = useState({ wallId: '', status: '', grade: '' })

  useEffect(() => { loadData() }, [gymId])

  async function loadData() {
    const gymData = await db.gyms.get(gymId)
    if (!gymData) { navigate('/gyms'); return }
    setGym(gymData)

    const wallData = await db.walls.where('gymId').equals(gymId).toArray()
    setWalls(wallData)

    const routeData = await db.routes.where('gymId').equals(gymId).toArray()
    // Sort newest first
    routeData.sort((a, b) => (b.dateSet ?? '').localeCompare(a.dateSet ?? ''))
    setRoutes(routeData)

    // Compute avg ratings
    const ratingsMap = {}
    for (const r of routeData) {
      const fb = await db.feedback.where('routeId').equals(r.id).toArray()
      if (fb.length > 0) {
        ratingsMap[r.id] = fb.reduce((sum, f) => sum + (f.rating ?? 0), 0) / fb.length
      } else {
        ratingsMap[r.id] = null
      }
    }
    setRatings(ratingsMap)
  }

  const wallMap = Object.fromEntries(walls.map(w => [w.id, w]))

  const filtered = routes.filter(r => {
    if (filters.wallId && String(r.wallId) !== filters.wallId) return false
    if (filters.status && r.status !== filters.status) return false
    if (filters.grade && r.grade !== filters.grade) return false
    return true
  })

  const hasFilters = !!(filters.wallId || filters.status || filters.grade)

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
          <h1 className="text-2xl font-bold text-white">Portfolio</h1>
          <p className="text-slate-400 text-sm mt-1">
            {routes.length === 0
              ? 'No routes yet.'
              : `${routes.length} route${routes.length !== 1 ? 's' : ''} · ${filtered.length} shown`}
          </p>
        </div>
      </div>

      {/* Filters */}
      {routes.length > 0 && (
        <FilterBar
          filters={filters}
          onChange={setFilters}
          walls={walls}
          routes={routes}
        />
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          gymName={gym?.name}
          hasFilters={hasFilters}
          onClear={() => setFilters({ wallId: '', status: '', grade: '' })}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(route => (
            <RouteCard
              key={route.id}
              route={route}
              wall={wallMap[route.wallId] ?? null}
              avgRating={ratings[route.id] ?? null}
              onClick={() => navigate(`/planner/${route.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
