import { Route, Routes } from 'react-router-dom'
import { ControlDashboard } from '../../modules/control/pages/ControlDashboard'
import { LandingPage } from '../../modules/landing/pages/LandingPage'
import { ClaimPage } from '../../modules/auth/pages/ClaimPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/control" element={<ControlDashboard />} />
      <Route path="/claim" element={<ClaimPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  )
}
