import { NavLink, Outlet } from 'react-router-dom'

const nav = [
  { to: '/',        label: 'Dashboard' },
  { to: '/gyms',    label: 'Gyms'      },
  { to: '/settings', label: 'Settings' },
]

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-slate-950 text-white">
      {/* Sidebar */}
      <aside className="w-52 bg-slate-900 border-r border-slate-800 flex flex-col p-4 shrink-0">
        {/* Logo */}
        <div className="mb-8">
          <div className="text-base font-bold tracking-tight text-white">SetterCanvas</div>
          <div className="text-xs text-slate-500 mt-0.5">Route setting workbench</div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
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
        </nav>

        {/* Mobile upload link at bottom */}
        <div className="pt-4 border-t border-slate-800">
          <a
            href="/upload"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span>📱</span>
            <span>Mobile upload</span>
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
