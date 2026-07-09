import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db/index'

const STATUS_STYLES = {
  'planned':     'bg-slate-700 text-slate-300',
  'in progress': 'bg-blue-900/50 text-blue-300',
  'set':         'bg-yellow-900/50 text-yellow-300',
  'open':        'bg-emerald-900/50 text-emerald-300',
  'stripped':    'bg-red-900/50 text-red-400',
}

const COLOR_MAP = {
  Red: '#ef4444', Blue: '#3b82f6', Green: '#22c55e', Yellow: '#eab308',
  Orange: '#f97316', Purple: '#a855f7', Pink: '#ec4899', White: '#f1f5f9',
  Black: '#1e293b', Grey: '#64748b', Brown: '#92400e', Teal: '#14b8a6',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [gyms, setGyms] = useState([])
  const [routes, setRoutes] = useState([])
  const [walls, setWalls] = useState([])
  const [recentRoutes, setRecentRoutes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [gymData, routeData, wallData] = await Promise.all([
      db.gyms.toArray(),
      db.routes.toArray(),
      db.walls.toArray(),
    ])

    setGyms(gymData)
    setRoutes(routeData)
    setWalls(wallData)

    // Recent routes: sort by dateSet desc, take 5
    const sorted = [...routeData].sort((a, b) =>
      (b.dateSet ?? '').localeCompare(a.dateSet ?? '')
    )
    setRecentRoutes(sorted.slice(0, 5))
    setLoading(false)
  }

  const wallMap = Object.fromEntries(walls.map(w => [w.id, w]))
  const gymMap  = Object.fromEntries(gyms.map(g => [g.id, g]))

  const byStatus = routes.reduce((acc, r) => {
    const s = r.status ?? 'planned'
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <div className="p-6 text-slate-500 text-sm">Loading…</div>
    )
  }

  // ── Empty state (no gyms yet)
  if (gyms.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center">
        <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center text-4xl">🧗</div>
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome to SetterCanvas</h1>
          <p className="text-slate-400 text-sm mt-2 max-w-sm">
            Your digital workbench for planning and tracking climbing routes. Start by adding your first gym.
          </p>
        </div>
        <button
          onClick={() => navigate('/gyms')}
          className="px-6 py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          + Add your first gym
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">{today}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Gyms',   value: gyms.length,   },
          { label: 'Walls',  value: walls.length,  },
          { label: 'Routes', value: routes.length, },
          { label: 'Open',   value: byStatus['open'] ?? 0, highlight: true },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <p className={`text-3xl font-bold ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent routes */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Recent Routes</h2>
          {recentRoutes.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-sm">
              No routes yet. Create one from a wall.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentRoutes.map(route => {
                const wall = wallMap[route.wallId]
                const gym  = wall ? gymMap[wall.gymId] : null
                return (
                  <button
                    key={route.id}
                    onClick={() => navigate(`/planner/${route.id}`)}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3 text-left hover:border-slate-600 transition-colors"
                  >
                    {/* Tape color dot */}
                    {route.tapeColor && (
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: COLOR_MAP[route.tapeColor] ?? '#64748b' }}
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {route.name || 'Unnamed route'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {[gym?.name, wall?.name].filter(Boolean).join(' › ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {route.grade && (
                        <span className="text-xs font-bold text-slate-300">{route.grade}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[route.status] ?? 'bg-slate-700 text-slate-300'}`}>
                        {route.status}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Gyms quick access + status breakdown */}
        <div className="flex flex-col gap-6">
          {/* Gyms */}
          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Your Gyms</h2>
            <div className="flex flex-col gap-2">
              {gyms.map(gym => {
                const gymWalls  = walls.filter(w => w.gymId === gym.id)
                const gymRoutes = routes.filter(r => r.gymId === gym.id)
                return (
                  <button
                    key={gym.id}
                    onClick={() => navigate(`/gyms/${gym.id}/walls`)}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-left hover:border-slate-600 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{gym.name}</p>
                      {gym.location && <p className="text-xs text-slate-500">{gym.location}</p>}
                    </div>
                    <div className="text-xs text-slate-600 text-right">
                      <p>{gymWalls.length} wall{gymWalls.length !== 1 ? 's' : ''}</p>
                      <p>{gymRoutes.length} route{gymRoutes.length !== 1 ? 's' : ''}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Status breakdown */}
          {routes.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Routes by Status</h2>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                {Object.entries(byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize w-24 text-center ${STATUS_STYLES[status] ?? 'bg-slate-700 text-slate-300'}`}>
                      {status}
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${(count / routes.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-4 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
