import { Toaster } from 'sonner'
import { AppRouter } from './router/AppRouter'

function App() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text)]">
      <AppRouter />
      <Toaster position="top-center" richColors theme="dark" expand />
    </div>
  )
}

export default App
