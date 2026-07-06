import { Toaster } from 'sonner'
import { AppRouter } from './router/AppRouter'
import { PasswordRecoveryModal } from '../modules/auth/components/PasswordRecoveryModal'

function App() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text)]">
      <AppRouter />
      {/* Global: assume em qualquer rota quando o usuário chega pelo link de redefinição de senha */}
      <PasswordRecoveryModal />
      <Toaster position="top-center" richColors theme="dark" expand />
    </div>
  )
}

export default App
