import { Route, Routes } from 'react-router-dom'
import { ControlDashboard } from '../../modules/control/pages/ControlDashboard'
import { DisplayPreviewPage } from '../../modules/display/pages/DisplayPreviewPage'
import { LandingPage } from '../../modules/landing/pages/LandingPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/control" element={<ControlDashboard />} />
      <Route path="/display" element={<DisplayPreviewPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  )
}
