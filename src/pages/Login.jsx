import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../lib/authContext'

const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"

export default function Login() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [mode, setMode] = useState('signin')      // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // ── Not configured yet — explain rather than show a dead form ─────────────
  if (!isSupabaseConfigured) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold text-white">Account not set up yet</h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          SetterCanvas works fully offline without an account — everything you
          create is saved on this device.
        </p>
        <p className="text-slate-400 text-sm mt-3 leading-relaxed">
          Signing in becomes available once the Supabase project is created and
          its URL and key are added to <code className="text-slate-300">.env.local</code>.
          That's what will let your laptop and phone share data.
        </p>
        <Link to="/" className="mt-6 inline-block px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
          Back to the app
        </Link>
      </Shell>
    )
  }

  // ── Already signed in ─────────────────────────────────────────────────────
  if (user) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold text-white">Signed in</h1>
        <p className="text-slate-400 text-sm mt-2">{user.email}</p>
        <div className="flex gap-2 mt-6">
          <Link to="/" className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
            Back to the app
          </Link>
          <button
            onClick={async () => { await signOut(); navigate('/') }}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </Shell>
    )
  }

  // ── Sign in / sign up ─────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setNotice('')

    if (!email.trim() || !password) {
      setError('Email and password are both required.')
      return
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Use at least 8 characters for the password.')
      return
    }

    setBusy(true)
    const fn = mode === 'signin' ? 'signInWithPassword' : 'signUp'
    const { data, error: authError } = await supabase.auth[fn]({
      email: email.trim(),
      password,
    })
    setBusy(false)

    if (authError) {
      // Supabase returns the same vague "Invalid login credentials" whether the
      // password is wrong or the account exists but is unconfirmed, which sends
      // you hunting in the wrong place. Add the missing context.
      setError(
        /invalid login credentials/i.test(authError.message)
          ? 'Invalid login credentials — wrong password, or the account still needs email confirmation.'
          : authError.message
      )
      return
    }

    // Sign-up with email confirmation on returns a user but no session.
    if (mode === 'signup' && !data.session) {
      setNotice('Check your email to confirm the account, then sign in.')
      setMode('signin')
      return
    }

    navigate('/')
  }

  return (
    <Shell>
      <h1 className="text-lg font-semibold text-white">
        {mode === 'signin' ? 'Sign in' : 'Create account'}
      </h1>
      <p className="text-slate-500 text-xs mt-1">
        Only needed to sync between devices — the app works offline without it.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-5">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className={inputClass}
          />
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}
        {notice && <p className="text-emerald-400 text-xs">{notice}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 w-full py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors"
        >
          {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <div className="flex items-center justify-between mt-5 text-xs">
        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice('') }}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {mode === 'signin' ? 'Create an account' : 'I already have an account'}
        </button>
        <Link to="/" className="text-slate-500 hover:text-white transition-colors">
          Skip for now
        </Link>
      </div>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <div className="text-base font-bold tracking-tight text-white">SetterCanvas</div>
          <div className="text-xs text-slate-500 mt-0.5">Route setting workbench</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
