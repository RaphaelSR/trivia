/**
 * Testes de render básico para AuthPanel.
 * Mocka useAuth para controlar o estado sem precisar de Supabase real.
 */

import '@testing-library/jest-dom'
import { render, screen, fireEvent, act } from '@testing-library/react'
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

jest.mock('@/modules/auth/services/normalized-history.service', () => ({
  listNormalizedGames: jest.fn().mockResolvedValue([]),
  saveNormalizedGame: jest.fn().mockResolvedValue(null),
  getGameDetail: jest.fn().mockReturnValue(new Promise(() => {})),
}))

jest.mock('@/modules/auth/components/GameDetailView', () => ({
  GameDetailView: ({ onBack }: { onBack: () => void }) => (
    <div>
      <button onClick={onBack}>Voltar</button>
      <span>GameDetailView</span>
    </div>
  ),
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
  resend: jest.fn().mockResolvedValue(null),
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

// ---------------------------------------------------------------------------
// Testes do estado pós-cadastro (confirmação pendente)
// ---------------------------------------------------------------------------

describe('AuthPanel — estado pós-cadastro (confirmação pendente)', () => {
  const onClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // register retorna null (sem erro) mas sem sessão: Supabase retorna user sem sessão
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      register: jest.fn().mockResolvedValue(null),
      resend: jest.fn().mockResolvedValue(null),
    })
  })

  /** Leva o painel ao estado pós-cadastro preenchendo e submetendo o formulário de signup */
  async function goToConfirmationPending(email = 'novo@email.com') {
    render(<AuthPanel onClose={onClose} />)

    // Vai para aba Criar conta
    const tabs = screen.getAllByRole('button', { name: /criar conta/i })
    fireEvent.click(tabs[0])

    fireEvent.change(screen.getByPlaceholderText(/como você quer ser chamado/i), {
      target: { value: 'Teste' },
    })
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: email },
    })
    fireEvent.change(screen.getByPlaceholderText(/mínimo 8 caracteres/i), {
      target: { value: 'senha12345' },
    })

    await act(async () => {
      fireEvent.submit(document.querySelector('form')!)
    })

    return email
  }

  it('mostra mensagem com o email após signup bem-sucedido', async () => {
    await goToConfirmationPending('teste@exemplo.com')
    expect(screen.getByText(/link de confirmação para/i)).toBeInTheDocument()
    expect(screen.getByText('teste@exemplo.com')).toBeInTheDocument()
    expect(screen.getByText(/clique no link para entrar/i)).toBeInTheDocument()
  })

  it('exibe botão "Reenviar e-mail" no estado pós-cadastro', async () => {
    await goToConfirmationPending()
    expect(screen.getByRole('button', { name: /reenviar e-mail/i })).toBeInTheDocument()
  })

  it('chama resend com o email ao clicar em Reenviar', async () => {
    const resendMock = jest.fn().mockResolvedValue(null)
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      register: jest.fn().mockResolvedValue(null),
      resend: resendMock,
    })

    const email = await goToConfirmationPending('reenvia@test.com')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /reenviar e-mail/i }))
    })

    expect(resendMock).toHaveBeenCalledWith(email)
  })

  it('desabilita o botão de reenvio durante o cooldown', async () => {
    jest.useFakeTimers()

    try {
      const resendMock = jest.fn().mockResolvedValue(null)
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        register: jest.fn().mockResolvedValue(null),
        resend: resendMock,
      })

      await goToConfirmationPending()

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /reenviar e-mail/i }))
      })

      // Durante o cooldown o botão deve estar desabilitado
      const btn = screen.getByRole('button', { name: /reenviado/i })
      expect(btn).toBeDisabled()
      expect(btn).toHaveTextContent(/aguarde/i)

      // Avança o timer até o cooldown acabar
      act(() => {
        jest.advanceTimersByTime(30_000)
      })

      // Após o cooldown o botão volta ao estado original
      expect(screen.getByRole('button', { name: /reenviar e-mail/i })).not.toBeDisabled()
    } finally {
      jest.useRealTimers()
    }
  })

  it('exibe mensagem de erro quando resend falha', async () => {
    const resendMock = jest.fn().mockResolvedValue('Não foi possível reenviar. Tente novamente em instantes.')
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      register: jest.fn().mockResolvedValue(null),
      resend: resendMock,
    })

    await goToConfirmationPending()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /reenviar e-mail/i }))
    })

    expect(screen.getByText(/não foi possível reenviar/i)).toBeInTheDocument()
  })

  it('sai do estado pós-cadastro quando usuário aparece (link confirmado)', async () => {
    const { rerender } = render(<AuthPanel onClose={onClose} />)

    // Vai para aba signup e submete
    const tabs = screen.getAllByRole('button', { name: /criar conta/i })
    fireEvent.click(tabs[0])
    fireEvent.change(screen.getByPlaceholderText(/como você quer ser chamado/i), { target: { value: 'Teste' } })
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText(/mínimo 8 caracteres/i), { target: { value: 'senha12345' } })
    await act(async () => { fireEvent.submit(document.querySelector('form')!) })

    // Confirma que está no estado pendente
    expect(screen.getByText(/link de confirmação/i)).toBeInTheDocument()

    // Simula chegada da sessão (usuário confirmou o e-mail)
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      user: { id: 'uid-1', email: 'a@b.com', user_metadata: { display_name: 'Teste' } },
    })
    rerender(<AuthPanel onClose={onClose} />)

    // Deve mostrar o painel logado, não o de confirmação
    expect(screen.getByText('Teste')).toBeInTheDocument()
    expect(screen.queryByText(/link de confirmação/i)).not.toBeInTheDocument()
  })
})
