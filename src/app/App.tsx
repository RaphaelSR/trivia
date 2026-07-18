import { Toaster } from 'sonner'
import { AppRouter } from './router/AppRouter'
import { PasswordRecoveryModal } from '../modules/auth/components/PasswordRecoveryModal'
import { InterfaceSoundBridge } from '../shared/components/InterfaceSoundBridge'

function App() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-text)]">
      <InterfaceSoundBridge />
      <AppRouter />
      {/* Global: assume em qualquer rota quando o usuário chega pelo link de redefinição de senha */}
      <PasswordRecoveryModal />
      <Toaster position="top-center" richColors theme="dark" expand />
    </div>
  )
}

export default App
