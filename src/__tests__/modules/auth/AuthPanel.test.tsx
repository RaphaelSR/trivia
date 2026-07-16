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
  deleteNormalizedGame: jest.fn().mockResolvedValue({ error: null }),
}))

jest.mock('@/modules/auth/services/auth.service', () => ({
  verifyPassword: jest.fn().mockResolvedValue(false),
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  onAuthStateChange: jest.fn().mockReturnValue(() => {}),
  resendConfirmation: jest.fn(),
}))

jest.mock('@/modules/auth/components/GameDetailView', () => ({
  GameDetailView: ({ onBack }: { onBack: () => void }) => (
    <div>
      <button onClick={onBack}>Voltar</button>
      <span>GameDetailView</span>
    </div>
  ),
}))

jest.mock('@/modules/auth/components/DeleteGameDialog', () => ({
  DeleteGameDialog: ({ onClose, gameTitle }: { onClose: () => void; gameTitle: string }) => (
    <div data-testid="delete-game-dialog">
      <span>{gameTitle}</span>
      <button onClick={onClose}>Cancelar</button>
    </div>
  ),
}))

jest.mock('@/modules/auth/components/ProfileAvatarEditor', () => ({
  ProfileAvatarEditor: ({ name }: { name: string }) => <div>Avatar de {name}</div>,
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
  requestReset: jest.fn().mockResolvedValue(null),
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

describe('AuthPanel — esqueci minha senha', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue(defaultAuthState)
  })

  it('mostra o link apenas na aba Entrar, ao lado do label de senha', () => {
    render(<AuthPanel onClose={() => {}} />)
    expect(screen.getByRole('button', { name: 'Esqueci minha senha' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(screen.queryByRole('button', { name: 'Esqueci minha senha' })).not.toBeInTheDocument()
  })

  it('abre a tela dedicada de redefinição, sem campo de senha, com e-mail pré-preenchido', () => {
    render(<AuthPanel onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'rrocha@teste.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }))

    expect(screen.getByText('Redefinir senha')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('rrocha@teste.com')
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
  })

  it('"Voltar para entrar" retorna ao formulário de login', () => {
    render(<AuthPanel onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }))
    fireEvent.click(screen.getByRole('button', { name: /Voltar para entrar/ }))

    expect(screen.queryByText('Redefinir senha')).not.toBeInTheDocument()
    // aba 'Entrar' + botão de submit 'Entrar' → o formulário de login voltou
    expect(screen.getAllByRole('button', { name: 'Entrar' })).toHaveLength(2)
  })

  it('exige e-mail válido antes de enviar', async () => {
    render(<AuthPanel onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enviar link de redefinição' }))
    })

    expect(screen.getByText('Informe um endereço de email válido.')).toBeInTheDocument()
    expect(defaultAuthState.requestReset).not.toHaveBeenCalled()
  })

  it('envia o link, mostra confirmação e entra em cooldown de reenvio', async () => {
    render(<AuthPanel onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'rrocha@teste.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enviar link de redefinição' }))
    })

    expect(defaultAuthState.requestReset).toHaveBeenCalledWith('rrocha@teste.com')
    expect(screen.getByText(/Link enviado para/)).toBeInTheDocument()
    const resendButton = screen.getByRole('button', { name: /reenviar em \d+s/ })
    expect(resendButton).toBeDisabled()
  })

  it('mostra o erro do serviço (ex.: rate limit) e permite tentar de novo', async () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      requestReset: jest.fn().mockResolvedValue('Muitos e-mails em pouco tempo. Aguarde um minuto e tente novamente.'),
    })
    render(<AuthPanel onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'rrocha@teste.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enviar link de redefinição' }))
    })

    expect(screen.getByText(/Muitos e-mails em pouco tempo/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar link de redefinição' })).toBeEnabled()
  })
})

describe('AuthPanel — atributos de autofill (gerenciador de senhas)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue(defaultAuthState)
  })

  it('inputs de login têm name/autocomplete para o navegador oferecer salvar', () => {
    render(<AuthPanel onClose={() => {}} />)
    const email = screen.getByPlaceholderText('seu@email.com')
    const senha = screen.getByPlaceholderText('••••••••')

    expect(email).toHaveAttribute('name', 'email')
    expect(email).toHaveAttribute('autocomplete', 'username')
    expect(senha).toHaveAttribute('name', 'password')
    expect(senha).toHaveAttribute('autocomplete', 'current-password')
  })

  it('cadastro usa new-password para o navegador sugerir senha forte', () => {
    render(<AuthPanel onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    const senha = screen.getByPlaceholderText('Mínimo 8 caracteres')
    expect(senha).toHaveAttribute('autocomplete', 'new-password')
  })

  it('botão de mostrar/ocultar senha alterna o tipo do input', () => {
    render(<AuthPanel onClose={() => {}} />)
    const senha = screen.getByPlaceholderText('••••••••')
    expect(senha).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(senha).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }))
    expect(senha).toHaveAttribute('type', 'password')
  })
})
