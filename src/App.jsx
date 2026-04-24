import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'

// Placeholder pages — to be built out per phase
const Placeholder = ({ name }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-white">{name}</h1>
    <p className="text-slate-400 mt-2">Coming soon.</p>
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="gyms/*"      element={<Placeholder name="Gyms" />} />
          <Route path="holds"       element={<Placeholder name="Holds Library" />} />
          <Route path="planner"     element={<Placeholder name="Route Planner" />} />
          <Route path="portfolio"   element={<Placeholder name="Portfolio" />} />
          <Route path="settings"    element={<Placeholder name="Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
