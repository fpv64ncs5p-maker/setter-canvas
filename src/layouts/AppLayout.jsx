import { NavLink, Outlet } from 'react-router-dom'

const nav = [
  { to: '/',          label: 'Dashboard' },
  { to: '/gyms',      label: 'Gyms' },
  { to: '/holds',     label: 'Holds' },
  { to: '/planner',   label: 'Planner' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/settings',  label: 'Settings' },
]

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-slate-950 text-white">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col p-4 gap-1 shrink-0">
        <div className="text-lg font-bold tracking-tight mb-6 text-white">SetterCanvas</div>
        {nav.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
