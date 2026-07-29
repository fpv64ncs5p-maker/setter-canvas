import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import { uploadPendingPhotos, pendingPhotoCount } from '../lib/photos'

const nav = [
  { to: '/',        label: 'Dashboard' },
  { to: '/gyms',    label: 'Gyms'      },
  { to: '/settings', label: 'Settings' },
]

export default function AppLayout() {
  const { user, configured } = useAuth()
  const [pending, setPending] = useState(0)
  const [uploading, setUploading] = useState(false)

  // Photos are saved locally first — a gym is exactly where signal is worst.
  // Once signed in, send up whatever is still only on this device.
  useEffect(() => {
    let active = true

    async function run() {
      if (!user) {
        const count = await pendingPhotoCount()
        if (active) setPending(count)
        return
      }
      setUploading(true)
      await uploadPendingPhotos(user.id)
      const remaining = await pendingPhotoCount()
      if (active) {
        setPending(remaining)
        setUploading(false)
      }
    }

    run()
    return () => { active = false }
  }, [user])

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

          {/* Account — only shown once Supabase is configured. Sign-in is
              optional; the app is local-first and works without it. */}
          {configured && (
            <Link
              to="/login"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              title={user ? user.email : 'Not signed in — data stays on this device'}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${user ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span className="truncate">{user ? user.email : 'Sign in to sync'}</span>
            </Link>
          )}

          {/* Photos still only on this device */}
          {pending > 0 && (
            <p className="px-3 pt-1 text-xs text-slate-600">
              {uploading
                ? 'Uploading photos…'
                : `${pending} photo${pending === 1 ? '' : 's'} on this device only`}
            </p>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
