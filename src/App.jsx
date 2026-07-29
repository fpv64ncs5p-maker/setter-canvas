import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import { AuthProvider } from './lib/useAuth'
import Dashboard from './pages/Dashboard'
import Gyms from './pages/Gyms'
import Walls from './pages/Walls'
import HoldsLibrary from './pages/HoldsLibrary'
import Planner from './pages/Planner'
import Portfolio from './pages/Portfolio'
import MobileUpload from './pages/MobileUpload'
import Login from './pages/Login'

const Settings = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-white">Settings</h1>
    <p className="text-slate-400 mt-2">Coming in a future update.</p>
  </div>
)

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Full-screen routes — no sidebar */}
          <Route path="/planner/:routeId" element={<Planner />} />
          <Route path="/upload"           element={<MobileUpload />} />
          {/* Sign-in is optional: the app is local-first and works without it */}
          <Route path="/login"            element={<Login />} />

          {/* All other pages use the sidebar layout */}
          <Route path="/" element={<AppLayout />}>
            <Route index                         element={<Dashboard />} />
            <Route path="gyms"                   element={<Gyms />} />
            <Route path="gyms/:gymId/walls"      element={<Walls />} />
            <Route path="gyms/:gymId/holds"      element={<HoldsLibrary />} />
            <Route path="gyms/:gymId/portfolio"  element={<Portfolio />} />
            <Route path="settings"               element={<Settings />} />
            {/* Catch-all redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
