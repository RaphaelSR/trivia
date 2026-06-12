/**
 * Testes de render básico para AuthPanel.
 * Mocka useAuth para controlar o estado sem precisar de Supabase real.
 */

import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { AuthPanel } from '@/modules/auth/components/AuthPanel'

// Mock completo do hook useAuth
jest.mock('@/modules/auth/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

// Previne que AuthPanel tente acessar Supabase nestes testes
jest.mock('@/modules/auth/services/history.service', () => ({
  listGameHistory: jest.fn().mockResolvedValue([]),
  saveGameToHistory: jest.fn().mockResolvedValue(null),
}))

import { useAuth } from '@/modules/auth/hooks/useAuth'

const mockUseAuth = useAuth as jest.Mock

const defaultAuthState = {
  user: null,
  loading: false,
  configured: true,
  login: jest.fn().mockResolvedValue(null),
  register: jest.fn().mockResolvedValue(null),
  logout: jest.fn().mockResolvedValue(undefined),
}

/** Encontra o botão de submit do formulário (type="submit") */
function getSubmitButton() {
  return screen.getByRole('button', { name: /^(entrar|criar conta|entrando…|criando conta…)$/i })
}

describe('AuthPanel', () => {
  const onClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue(defaultAuthState)
  })

  it('renderiza o campo de email e o formulário de login por padrão', () => {
    render(<AuthPanel onClose={onClose} />)
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument()
  })

  it('muda para aba "Criar conta" ao clicar', () => {
    render(<AuthPanel onClose={onClose} />)
    // Clica na tab de criar conta (não no botão de submit)
    const tabs = screen.getAllByRole('button', { name: /criar conta/i })
    fireEvent.click(tabs[0])
    expect(screen.getByPlaceholderText(/como você quer ser chamado/i)).toBeInTheDocument()
  })

  it('exibe erro de validação para email inválido', async () => {
    render(<AuthPanel onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'email-invalido' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'senha12345' },
    })
    // Submete o formulário via querySelector pelo type
    const form = document.querySelector('form')!
    fireEvent.submit(form)
    expect(await screen.findByText(/endereço de email válido/i)).toBeInTheDocument()
  })

  it('exibe erro de validação para senha curta', async () => {
    render(<AuthPanel onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'a@b.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: '1234' },
    })
    const form = document.querySelector('form')!
    fireEvent.submit(form)
    expect(await screen.findByText(/pelo menos 8 caracteres/i)).toBeInTheDocument()
  })

  it('chama login com credenciais válidas ao submeter', async () => {
    render(<AuthPanel onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'a@b.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'senhavalida' },
    })
    const form = document.querySelector('form')!
    fireEvent.submit(form)
    // Aguarda processamento async
    await screen.findByPlaceholderText('seu@email.com')
    expect(defaultAuthState.login).toHaveBeenCalledWith('a@b.com', 'senhavalida')
  })

  it('chama onClose ao clicar no botão fechar', () => {
    render(<AuthPanel onClose={onClose} />)
    fireEvent.click(screen.getByLabelText(/fechar/i))
    expect(onClose).toHaveBeenCalled()
  })

  it('exibe nome e botão sair quando usuário está logado', () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      user: {
        id: 'uid-1',
        email: 'a@b.com',
        user_metadata: { display_name: 'Raphael' },
      },
    })
    render(<AuthPanel onClose={onClose} />)
    expect(screen.getByText('Raphael')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument()
  })

  it('chama logout ao clicar em sair', async () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      user: {
        id: 'uid-1',
        email: 'a@b.com',
        user_metadata: { display_name: 'Raphael' },
      },
    })
    render(<AuthPanel onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /sair/i }))
    expect(defaultAuthState.logout).toHaveBeenCalled()
  })

  void getSubmitButton // silencia unused
})
