import {
  BookOpen,
  ClipboardList,
  Dice5,
  Film,
  Info,
  Palette,
  RefreshCw,
  RotateCcw,
  UserPlus,
  UsersRound,
  Theater,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { FilmRoulette } from '@/components/ui/FilmRoulette'
import { FilmManager } from '@/components/ui/FilmManager'
import { MimicaModal } from '@/components/ui/MimicaModal'
import { Modal } from '@/components/ui/Modal'
import { TriviaBoard } from '@/components/ui/TriviaBoard'
import type { TriviaColumn, TriviaParticipant, TriviaQuestionTile, TriviaTeam } from '@/modules/trivia/types'
import { useTriviaSession } from '@/modules/trivia/hooks/useTriviaSession'
import { useThemeMode } from '@/app/providers/useThemeMode'
import { useCustomFilms } from '@/hooks/useCustomFilms'
import { useGameMode } from '@/hooks/useGameMode'
import { usePinManagement } from '@/hooks/usePinManagement'
import { useOfflineSession } from '@/hooks/useOfflineSession'
import { OfflineOnboardingModal } from '@/components/ui/OfflineOnboardingModal'
import { SessionManager } from '@/components/ui/SessionManager'
import { ResetGameModal } from '@/components/ui/ResetGameModal'
import { GameEndModal } from '@/components/ui/GameEndModal'
import { QuestionLibraryModal } from '@/components/ui/QuestionLibraryModal'
import { ScoreDetailView } from '@/components/ui/ScoreDetailView'
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal'
import { Timer } from '@/components/ui/Timer'
import { STORAGE_KEYS } from '@/shared/constants/storage'
import { FloatingActionBar } from '@/shared/components/FloatingActionBar'
import { storageService } from '@/shared/services/storage.service'
import { countAnsweredTiles, countTotalTiles } from '@/modules/game/domain/board.utils'

const POINTS_TIMER_DEFAULTS: Array<{ maxPoints: number; seconds: number }> = [
  { maxPoints: 5, seconds: 30 },
  { maxPoints: 10, seconds: 40 },
  { maxPoints: 15, seconds: 50 },
  { maxPoints: 20, seconds: 60 },
  { maxPoints: 30, seconds: 65 },
  { maxPoints: Infinity, seconds: 80 },
]

function getDefaultTimerForPoints(points: number): number {
  const entry = POINTS_TIMER_DEFAULTS.find(e => points <= e.maxPoints)
  return entry?.seconds ?? 80
}
import { buildTurnSequence } from '@/modules/game/domain/turn-order'
import { FaqPanel } from '../ui/FaqPanel'
import { GameStatusStrip } from '../ui/GameStatusStrip'
import { ControlShell } from '../ui/ControlShell'
import { ControlSidebar } from '../ui/ControlSidebar'
import { ControlTopbar } from '../ui/ControlTopbar'
import { EmptyStatePanel } from '../ui/EmptyStatePanel'
import { SidebarNavGroup } from '../ui/SidebarNavGroup'
import { SidebarNavItem } from '../ui/SidebarNavItem'
import { EasterBackground } from '@/shared/components/EasterBackground'
import { useControlDashboardState } from '../hooks/useControlDashboardState'
import { useTeamManagement } from '../hooks/useTeamManagement'
import { useSessionManagement } from '../hooks/useSessionManagement'
import { TeamsManagementModal } from '../components/TeamsManagementModal'
import { ScoringControls } from '../components/ScoringControls'
import { createTeamId, createParticipantId } from '../utils/teamUtils'
// PIN será gerenciado pelo hook usePinManagement

export function ControlDashboard() {
  const {
    session,
    orderedTeams,
    participants,
    activeTeam,
    activeParticipant,
    updateTileState,
    updateTileContent,
    updateColumnTitle,
    addFilmColumn,
    removeFilmColumn,
    addQuestionTile,
    removeQuestionTile,
    updateTeamsAndParticipants,
    awardPoints,
    awardMimicaPoints,
    advanceTurn,
    restoreSession,
  } = useTriviaSession()
  const { theme: themeMode, setTheme } = useThemeMode()
  const { gameMode, getModeDisplayName } = useGameMode()
  const { verifyPin, saveCustomPin, clearCustomPin, hasCustomPin } = usePinManagement()
  const { saveSession, loadSession, getSessionStatus } = useOfflineSession()
  const { films: customFilms, addFilm: addCustomFilm, updateFilm: updateCustomFilm, removeFilm: removeCustomFilm } = useCustomFilms()

  const dashboardState = useControlDashboardState()
  const {
    selectedIds,
    setSelectedIds,
    activePanel,
    setActivePanel,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    showAnswer,
    setShowAnswer,
    scoreboardOpen,
    setScoreboardOpen,
    libraryOpen,
    setLibraryOpen,
    filmsOpen,
    setFilmsOpen,
    libraryUnlocked,
    setLibraryUnlocked,
    pinModalOpen,
    setPinModalOpen,
    pinInput,
    setPinInput,
    pinError,
    setPinError,
    themeModalOpen,
    setThemeModalOpen,
    scoreboardAccordions,
    setScoreboardAccordions,
    teamsModalOpen,
    setTeamsModalOpen,
    mimicaModalOpen,
    setMimicaModalOpen,
    filmRouletteOpen,
    setFilmRouletteOpen,
    offlineOnboardingOpen,
    setOfflineOnboardingOpen,
    showOnboardingSuggestion,
    setShowOnboardingSuggestion,
    sessionManagerOpen,
    setSessionManagerOpen,
    resetGameModalOpen,
    setResetGameModalOpen,
    gameEndModalOpen,
    setGameEndModalOpen,
    gameEndNotified,
    setGameEndNotified,
    scoreDetailOpen,
    setScoreDetailOpen,
    selectedParticipantId,
    setSelectedParticipantId,
    selectedFilmId,
    setSelectedFilmId,
    librarySearchQuery,
    setLibrarySearchQuery,
    libraryPointsFilter,
    setLibraryPointsFilter,
    librarySortMode,
    setLibrarySortMode,
    filmCatalogViewMode,
    setFilmCatalogViewMode,
    filmCatalogSortMode,
    setFilmCatalogSortMode,
    confirmActionOpen,
    setConfirmActionOpen,
    confirmActionConfig,
    setConfirmActionConfig,
  } = dashboardState

  const [timerOverrides, setTimerOverrides] = useState<Record<number, number>>({})
  const [questionRevealed, setQuestionRevealed] = useState(false)

  const getTimerForPoints = (points: number) => {
    if (timerOverrides[points] !== undefined) return timerOverrides[points]
    return getDefaultTimerForPoints(points)
  }

  const teamManagement = useTeamManagement(
    orderedTeams,
    participants,
    session.board,
    (teams, participants, turnSequence?: string[]) => {
      updateTeamsAndParticipants(teams, participants, turnSequence)
    }
  )


  const sessionManagement = useSessionManagement(
    orderedTeams,
    participants,
    session.board,
    (teams, participants, turnSequence?: string[]) => {
      updateTeamsAndParticipants(teams, participants, turnSequence)
    },
    removeQuestionTile,
    removeFilmColumn,
    setTheme,
    saveCustomPin,
    loadSession,
    restoreSession,
    setGameEndNotified
  )

  const selectedTile = useMemo(() => {
    if (!selectedIds) return null
    const column = session.board.find((col) => col.id === selectedIds.columnId)
    const tile = column?.tiles.find((item) => item.id === selectedIds.tileId)
    if (!column || !tile) return null
    return { column, tile }
  }, [selectedIds, session.board])

  const availableTiles = useMemo(() => {
    return session.board.flatMap((column) =>
      column.tiles.filter((tile) => tile.state === 'available').map((tile) => ({ tile, column })),
    )
  }, [session.board])

  // Detecta quando o jogo termina (todas as perguntas respondidas)
  const isGameFinished = useMemo(() => {
    const totalTiles = countTotalTiles(session.board)
    const answeredTiles = countAnsweredTiles(session.board)
    return totalTiles > 0 && totalTiles === answeredTiles
  }, [session.board])

  const scoreboard = useMemo(() => {
    // Ordena times por pontuação (maior para menor)
    const sorted = [...orderedTeams].sort((a, b) => (b.score || 0) - (a.score || 0))
    return sorted.map((team, index) => ({
      team,
      position: index + 1,
      points: team.score || 0,
    }))
  }, [orderedTeams])


  // Calcula o turno atual (rodada completa)
  // Uma rodada completa = todos os times jogaram uma vez (um participante de cada time)
  const currentRound = useMemo(() => {
    if (!session.activeParticipantId || session.turnSequence.length === 0 || orderedTeams.length === 0) return 1;
    const currentIndex = session.turnSequence.indexOf(session.activeParticipantId);
    if (currentIndex === -1) return 1;
    
    // Uma rodada = número de times (um de cada time por rodada)
    const teamsPerRound = orderedTeams.length;
    if (teamsPerRound === 0) return 1;
    
    // Calcula quantas rodadas completas já passaram + 1 (rodada atual)
    return Math.floor(currentIndex / teamsPerRound) + 1;
  }, [session.activeParticipantId, session.turnSequence, orderedTeams.length])

  const answeredCards = useMemo(() => countAnsweredTiles(session.board), [session.board])
  const totalCards = useMemo(() => countTotalTiles(session.board), [session.board])
  const sessionStatus = getSessionStatus()
  const backendLabel = gameMode === 'online' ? 'online-cache' : gameMode === 'offline' ? 'local' : 'demo'
  const activeTurnIndex = session.activeParticipantId ? session.turnSequence.indexOf(session.activeParticipantId) : -1
  const currentTurnLabel = activeTurnIndex >= 0
    ? `${activeTurnIndex + 1} de ${session.turnSequence.length}`
    : 'Aguardando sequência'
  const sessionFilms = useMemo(
    () => session.board.map((column) => ({ id: column.id, name: column.film })),
    [session.board],
  )


  // Fecha onboarding se mudar de modo
  useEffect(() => {
    if (gameMode !== 'offline') {
      setOfflineOnboardingOpen(false)
      setShowOnboardingSuggestion(false)
    }
  }, [gameMode, setOfflineOnboardingOpen, setShowOnboardingSuggestion])

  // Detecta primeira vez e mostra onboarding automaticamente
  useEffect(() => {
    if (gameMode === 'offline') {
      const hasSeenOnboarding = storageService.get(STORAGE_KEYS.onboardingSeen)
      if (!hasSeenOnboarding && !offlineOnboardingOpen) {
        // Primeira vez: abre onboarding automaticamente
        setOfflineOnboardingOpen(true)
      }
    }
  }, [gameMode, offlineOnboardingOpen, setOfflineOnboardingOpen])

  // Mostra sugestão de onboarding de forma não forçada (apenas se já viu onboarding antes)
  useEffect(() => {
    const hasSeenOnboarding = storageService.get(STORAGE_KEYS.onboardingSeen)
    if (gameMode === 'offline' && orderedTeams.length === 0 && !showOnboardingSuggestion && hasSeenOnboarding) {
      // Aguarda 2 segundos antes de mostrar a sugestão (apenas se já viu antes)
      const timer = setTimeout(() => {
        setShowOnboardingSuggestion(true)
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [gameMode, orderedTeams.length, showOnboardingSuggestion, setShowOnboardingSuggestion])

  // Salva sessão automaticamente quando há mudanças (apenas no modo offline)
  useEffect(() => {
    if (gameMode === 'offline' && orderedTeams.length > 0) {
      const timer = setTimeout(() => {
        saveSession(session, session.title);
      }, 1000); // Debounce de 1 segundo
      
      return () => clearTimeout(timer);
    }
  }, [session, gameMode, orderedTeams.length, saveSession])

  // Reseta flag de notificação quando o board muda (perguntas resetadas ou respondidas)
  useEffect(() => {
    // Se o jogo não está mais finalizado mas já foi notificado, reseta a flag
    if (!isGameFinished && gameEndNotified) {
      setGameEndNotified(false)
    }
  }, [isGameFinished, gameEndNotified, setGameEndNotified])

  // Mostra modal de fim de jogo quando todas as perguntas forem respondidas
  useEffect(() => {
    if (isGameFinished && !gameEndModalOpen && !gameEndNotified) {
      // Aguarda 1 segundo antes de mostrar o modal
      const timer = setTimeout(() => {
        setGameEndModalOpen(true);
        setGameEndNotified(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isGameFinished, gameEndModalOpen, gameEndNotified, setGameEndModalOpen, setGameEndNotified])


  const handleSelectTile = (tile: TriviaQuestionTile, column: TriviaColumn) => {
    updateTileState(tile.id, 'active')
    setSelectedIds({ tileId: tile.id, columnId: column.id })
    setShowAnswer(false)
    setQuestionRevealed(false)
  }

  const handleCloseQuestionModal = () => {
    if (selectedTile) {
      updateTileState(selectedTile.tile.id, 'available')
    }
    setSelectedIds(null)
    setShowAnswer(false)
    setQuestionRevealed(false)
  }

  const handleRandomQuestion = () => {
    if (availableTiles.length === 0) {
      toast.warning('Todas as cartas já foram utilizadas nesta sessão')
      return
    }
    
    setConfirmActionConfig({
      title: 'Sortear Pergunta Aleatória',
      description: 'Esta ação irá selecionar automaticamente uma pergunta aleatória disponível no tabuleiro. A pergunta será destacada e pronta para ser respondida.',
      onConfirm: () => {
        const random = availableTiles[Math.floor(Math.random() * availableTiles.length)]
        handleSelectTile(random.tile, random.column)
        toast.success('Pergunta sorteada!')
      },
      variant: 'info',
    })
    setConfirmActionOpen(true)
  }

  const handleShowLibrary = () => {
    if (!hasCustomPin()) {
      setLibraryUnlocked(true)
      setActivePanel('library')
      setLibraryOpen(true)
      return
    }

    if (!libraryUnlocked) {
      setActivePanel('library')
      setPinModalOpen(true)
      return
    }
    setActivePanel('library')
    setLibraryOpen(true)
  }

  const confirmPin = () => {
    if (verifyPin(pinInput.trim())) {
      setLibraryUnlocked(true)
      setPinModalOpen(false)
      setPinInput('')
      setPinError('')
      setActivePanel('library')
      setLibraryOpen(true)
      toast.success('Acesso liberado')
      return
    }
    setPinError('PIN inválido')
  }

  const handleStartOnboarding = () => {
    setActivePanel('sessions')
    setOfflineOnboardingOpen(true)
    setShowOnboardingSuggestion(false)
  }

  const handleDismissOnboardingSuggestion = () => {
    setShowOnboardingSuggestion(false)
  }

  const handleOpenScoreboard = () => {
    setActivePanel('scoreboard')
    setScoreboardOpen(true)
  }

  const handleOpenTeams = () => {
    setActivePanel('teams')
    setTeamsModalOpen(true)
  }

  const handleOpenSessions = () => {
    setActivePanel('sessions')
    setSessionManagerOpen(true)
  }

  const handleOpenTheme = () => {
    setActivePanel('theme')
    setThemeModalOpen(true)
  }

  const handleOpenFilms = () => {
    setActivePanel('films')
    setFilmsOpen(true)
  }

  const handleLoadSession = (sessionId: string) => {
    const hasCurrentData = 
      session.board.length > 0 || 
      orderedTeams.length > 0 || 
      participants.length > 0 ||
      session.board.some(column => column.tiles.some(tile => tile.state === 'answered')) ||
      orderedTeams.some(team => (team.score || 0) > 0)

    if (hasCurrentData) {
      const filmsCount = session.board.length
      const questionsCount = countTotalTiles(session.board)
      const answeredCount = countAnsweredTiles(session.board)
      const teamsCount = orderedTeams.length
      const totalScore = orderedTeams.reduce((acc, team) => acc + (team.score || 0), 0)

      const itemsToLose = []
      if (filmsCount > 0) itemsToLose.push(`${filmsCount} filme${filmsCount !== 1 ? 's' : ''}`)
      if (questionsCount > 0) itemsToLose.push(`${questionsCount} pergunta${questionsCount !== 1 ? 's' : ''}`)
      if (answeredCount > 0) itemsToLose.push(`${answeredCount} pergunta${answeredCount !== 1 ? 's' : ''} respondida${answeredCount !== 1 ? 's' : ''}`)
      if (teamsCount > 0) itemsToLose.push(`${teamsCount} time${teamsCount !== 1 ? 's' : ''}`)
      if (totalScore > 0) itemsToLose.push(`${totalScore} pontos`)

      setConfirmActionConfig({
        title: 'Carregar Sessão Anterior',
        description: `Você tem uma sessão ativa com dados: ${itemsToLose.join(', ')}. Ao carregar uma sessão anterior, todos esses dados serão substituídos pelos dados da sessão selecionada. Esta ação não pode ser desfeita.`,
        onConfirm: () => {
          sessionManagement.loadSessionById(sessionId)
        },
        variant: 'warning',
      })
      setConfirmActionOpen(true)
    } else {
      sessionManagement.loadSessionById(sessionId)
    }
  }

  const handleResetGame = sessionManagement.resetGame

  const handleOfflineOnboardingComplete = (config: { 
    theme: string; 
    pin: string; 
    sessionTitle: string; 
    sessionDate: string;
    customFilms: Array<{
      name: string;
      year?: number;
      genre?: string;
      streaming?: string;
      link?: string;
      notes?: string;
    }>;
    teams: Array<{
      name: string;
      color: string;
      members: string[];
    }>;
  }) => {
    try {
      // Aplica o tema selecionado
      setTheme(config.theme as "light" | "dark" | "cinema" | "retro" | "matrix" | "brazil")
      
      // Salva PIN apenas se o host quiser usar protecao
      if (config.pin.trim()) {
        saveCustomPin(config.pin)
      } else {
        clearCustomPin()
      }
      setLibraryUnlocked(false)
      
      // Cria colunas para os filmes customizados
      config.customFilms.forEach(film => {
        addFilmColumn(film.name)
      })
      
      // Cria times e participantes
      const newTeams: TriviaTeam[] = []
      const newParticipants: TriviaParticipant[] = []
      
      config.teams.forEach((teamConfig, index) => {
        const teamId = createTeamId()
        const team: TriviaTeam = {
          id: teamId,
          name: teamConfig.name,
          color: teamConfig.color,
          order: index,
          members: [],
          score: 0
        }
        
        teamConfig.members.forEach((memberName) => {
          const participantId = createParticipantId()
          const participant: TriviaParticipant = {
            id: participantId,
            name: memberName,
            role: 'player',
            teamId: teamId
          }
          newParticipants.push(participant)
          team.members.push(participantId)
        })
        
        newTeams.push(team)
      })
      
      // Calcula total de perguntas do board para usar sequência balanceada
      const totalQuestions = countTotalTiles(session.board)
      const turnSequence = buildTurnSequence(newTeams, totalQuestions)
      
      // Atualiza a sessão com os novos dados
      updateTeamsAndParticipants(newTeams, newParticipants, turnSequence)
      
      // Atualiza título e data da sessão
      const sessionTitle = config.sessionTitle || `Sessão ${new Date().toLocaleDateString('pt-BR')}`
      const sessionDate = config.sessionDate || new Date().toISOString()
      
      // Aguarda um momento para garantir que o estado foi atualizado antes de salvar
      setTimeout(() => {
        const currentSession = {
          ...session,
          title: sessionTitle,
          scheduledAt: sessionDate,
        }
        saveSession(currentSession, sessionTitle)
        toast.success(`Nova sessão "${sessionTitle}" criada e salva!`)
      }, 100)
      
      // Marca onboarding como visto
      storageService.set(STORAGE_KEYS.onboardingSeen, 'true')
      
      // Fecha o modal de onboarding e sugestão
      setOfflineOnboardingOpen(false)
      setShowOnboardingSuggestion(false)
      setActivePanel('board')
      
      toast.success('Configuração inicial concluída! Sessão pronta para jogar!')
      
    } catch (error) {
      console.error('Erro ao configurar sessão offline:', error)
      toast.error('Erro ao configurar sessão. Tente novamente.')
    }
  }

  const handleRegenerateTurnSequence = () => {
    setConfirmActionConfig({
      title: 'Regenerar Sequência de Turnos',
      description: 'Esta ação irá recriar completamente a sequência de turnos, alternando entre todos os times. A sequência atual será substituída por uma nova, garantindo que nenhum time jogue duas vezes consecutivas.',
      onConfirm: () => {
        sessionManagement.regenerateTurnSequence()
      },
      variant: 'warning',
    })
    setConfirmActionOpen(true)
  }

  const handleAddFilm = () => {
    setConfirmActionConfig({
      title: 'Adicionar Novo Filme',
      description: 'Esta ação irá adicionar uma nova coluna de filme ao tabuleiro. Você poderá adicionar perguntas a este filme posteriormente.',
      onConfirm: () => {
        addFilmColumn('Novo Filme')
        toast.success('Filme adicionado!')
      },
      variant: 'info',
    })
    setConfirmActionOpen(true)
  }

  const handleRemoveFilm = (columnId: string, filmName: string) => {
    if (window.confirm(`Remover o filme "${filmName}" e todas as suas perguntas?`)) {
      removeFilmColumn(columnId)
      toast.success('Filme removido da biblioteca')
    }
  }

  const handleAddQuestion = (columnId: string) => {
    addQuestionTile(columnId, {
      points: 10,
      question: 'Nova pergunta',
      answer: '',
    })
    toast.success('Pergunta adicionada')
  }

  const handleRemoveQuestion = (columnId: string, tileId: string) => {
    if (window.confirm('Remover esta pergunta?')) {
      removeQuestionTile(columnId, tileId)
      toast.success('Pergunta removida')
    }
  }

  const handleCloseMobileSidebar = () => setMobileSidebarOpen(false)

  const handleOpenParticipantDetails = () => {
    if (activeParticipant?.id) {
      setActivePanel('teams')
      setSelectedParticipantId(activeParticipant.id)
      setScoreDetailOpen(true)
      return
    }

    toast.info('Nenhum participante ativo no momento. Abrindo o placar completo.')
    handleOpenScoreboard()
  }

  const handleOpenInfo = () => {
    setActivePanel('faq')
    handleCloseMobileSidebar()
  }

  const sidebarContent = (
    <>
      <SidebarNavGroup title="Jogo">
        <SidebarNavItem
          icon={<ClipboardList size={18} />}
          title="Tabuleiro"
          description="Volta para a visão principal da rodada e mantém o host focado no board."
          badge={`${answeredCards}/${totalCards || 0}`}
          active={activePanel === 'board'}
          onClick={() => {
            setActivePanel('board')
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<RefreshCw size={18} />}
          title="Próximo turno"
          description="Avança a vez para o próximo participante da sequência."
          badge={currentTurnLabel}
          variant="highlight"
          disabled={orderedTeams.length === 0}
          onClick={() => {
            advanceTurn()
            setActivePanel('board')
            handleCloseMobileSidebar()
            toast.success('Turno avançado')
          }}
        />
        <SidebarNavItem
          icon={<Theater size={18} />}
          title="Mímica"
          description="Abre o modo especial de pontuação para rodada de mímica."
          onClick={() => {
            setActivePanel('board')
            setMimicaModalOpen(true)
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<ClipboardList size={18} />}
          title="Placar"
          description="Mostra o ranking consolidado e os detalhes por participante."
          badge={`${scoreboard[0]?.points ?? 0} pts`}
          active={activePanel === 'scoreboard'}
          onClick={() => {
            handleOpenScoreboard()
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<RefreshCw size={14} />}
          title="Regenerar turnos"
          description="Recria a sequência de turnos alternando os times."
          disabled={orderedTeams.length === 0}
          onClick={() => {
            handleRegenerateTurnSequence()
            handleCloseMobileSidebar()
          }}
        />
      </SidebarNavGroup>

      <SidebarNavGroup title="Sessão">
        <SidebarNavItem
          icon={<RefreshCw size={18} />}
          title="Sessões"
          description="Carrega, salva e cria novas sessões do jogo."
          badge={sessionStatus.hasActiveSession ? 'ativa' : 'nova'}
          active={activePanel === 'sessions'}
          onClick={() => {
            handleOpenSessions()
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<Palette size={18} />}
          title="Tema"
          description="Ajusta a paleta visual usada durante a apresentação."
          active={activePanel === 'theme'}
          onClick={() => {
            handleOpenTheme()
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<RotateCcw size={18} />}
          title="Reset"
          description="Abre as opções destrutivas para reiniciar a sessão com segurança."
          variant="danger"
          onClick={() => {
            setActivePanel('sessions')
            setResetGameModalOpen(true)
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<Info size={18} />}
          title="Onboarding"
          description="Executa o assistente guiado para preparar a sessao local neste navegador."
          onClick={() => {
            handleStartOnboarding()
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<BookOpen size={18} />}
          title="FAQ / Ajuda"
          description="Explica fluxo da rodada, pontuacao, biblioteca, sessoes locais e regras atuais."
          active={activePanel === 'faq'}
          onClick={handleOpenInfo}
        />
      </SidebarNavGroup>

      <SidebarNavGroup title="Conteúdo">
        <SidebarNavItem
          icon={<BookOpen size={18} />}
          title="Biblioteca"
          description="Edita filmes, perguntas e respostas em modo mestre-detalhe."
          badge={`${session.board.length} filmes`}
          active={activePanel === 'library'}
          onClick={() => {
            handleShowLibrary()
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<Film size={18} />}
          title="Filmes"
          description="Organiza o catálogo com filtros, visualização em grid e sessão atual."
          badge={`${customFilms.length}`}
          active={activePanel === 'films'}
          onClick={() => {
            handleOpenFilms()
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<BookOpen size={18} />}
          title="Importar / Exportar"
          description="Usa a biblioteca para trocar JSONs de filmes e perguntas."
          onClick={() => {
            handleShowLibrary()
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<RotateCcw size={18} />}
          title="Roleta"
          description="Sorteia filmes aleatórios para preencher o board."
          onClick={() => {
            setActivePanel('films')
            setFilmRouletteOpen(true)
            handleCloseMobileSidebar()
          }}
        />
      </SidebarNavGroup>

      <SidebarNavGroup title="Times">
        <SidebarNavItem
          icon={<UsersRound size={18} />}
          title="Gerenciar times"
          description="Edita times, participantes, ordem e composição da rodada."
          badge={`${orderedTeams.length} times`}
          active={activePanel === 'teams'}
          onClick={() => {
            handleOpenTeams()
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<UserPlus size={18} />}
          title="Detalhes por participante"
          description="Abre o detalhe do jogador atual ou leva ao ranking se ninguém estiver ativo."
          onClick={() => {
            handleOpenParticipantDetails()
            handleCloseMobileSidebar()
          }}
        />
      </SidebarNavGroup>
    </>
  )

  return (
    <>
    {themeMode === 'easter' && <EasterBackground />}
    <ControlShell
      sidebarCollapsed={sidebarCollapsed}
      topbar={
        <ControlTopbar
          title={sessionStatus.sessionName ?? session.title}
          mode={gameMode}
          modeLabel={getModeDisplayName(gameMode)}
          backendLabel={backendLabel}
          onOpenSessions={handleOpenSessions}
          onExit={() => {
            setActivePanel('board')
            toast.info('Contexto principal reativado')
          }}
          onToggleSidebar={() => setMobileSidebarOpen(true)}
        />
      }
      statusStrip={
        <GameStatusStrip
          activeParticipant={activeParticipant}
          activeTeam={activeTeam}
          currentRound={currentRound}
          currentTurnLabel={currentTurnLabel}
          scoreboard={scoreboard}
        />
      }
      sidebar={
        <ControlSidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
          onCloseMobile={handleCloseMobileSidebar}
          title={sessionStatus.sessionName ?? session.title}
        >
          {sidebarContent}
          <div className="rounded-[24px] border border-white/8 bg-black/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--color-muted)]">Sessão ativa</p>
            <p className="mt-3 text-sm font-semibold text-[var(--color-text)]">
              {sessionStatus.hasActiveSession ? sessionStatus.sessionName : 'Sem sessão salva no momento'}
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--color-muted)]">
              {sessionStatus.hasActiveSession
                ? `${sessionStatus.duration} min desde a criação · backend ${backendLabel}`
                : 'As alteracoes ficam nesta sessao local ate voce salvar ou carregar outra sessao do navegador.'}
            </p>
          </div>
        </ControlSidebar>
      }
    >
      <div className="flex h-full flex-col gap-3">
        {activePanel === 'faq' ? (
          <FaqPanel onOpenOnboarding={handleStartOnboarding} />
        ) : null}

        {activePanel !== 'faq' && gameMode === 'offline' && orderedTeams.length === 0 ? (
          <EmptyStatePanel
            icon={<UsersRound size={24} />}
            title="Configure a sessao local para comecar"
            description="Defina times, participantes, filmes e perguntas antes da primeira rodada. Voce pode usar o assistente guiado ou montar tudo manualmente."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                {showOnboardingSuggestion ? (
                  <Button onClick={handleStartOnboarding} className="gap-2">
                    <Info size={16} />
                    Usar assistente
                  </Button>
                ) : null}
                <Button variant="outline" onClick={handleOpenTeams} className="gap-2">
                  <UserPlus size={16} />
                  Gerenciar times
                </Button>
                {showOnboardingSuggestion ? (
                  <Button variant="ghost" onClick={handleDismissOnboardingSuggestion}>
                    Fechar sugestão
                  </Button>
                ) : null}
              </div>
            }
          />
        ) : null}

        {activePanel !== 'faq' ? (
          <section className="min-h-0 flex-1 overflow-auto rounded-2xl border border-white/8 bg-black/10 p-3">
            <TriviaBoard columns={session.board} onSelectTile={handleSelectTile} selectedTileId={selectedIds?.tileId ?? null} />
          </section>
        ) : null}

        <FloatingActionBar>
          <Button variant="secondary" size="icon" aria-label="Sortear pergunta" onClick={handleRandomQuestion}>
            <Dice5 size={16} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Abrir biblioteca"
            onClick={() => {
              handleShowLibrary()
              setMobileSidebarOpen(false)
            }}
          >
            <BookOpen size={16} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Abrir mímica"
            onClick={() => {
              setActivePanel('board')
              setMimicaModalOpen(true)
            }}
          >
            <Theater size={16} />
          </Button>
          <Button variant="outline" size="icon" aria-label="Abrir placar" onClick={handleOpenScoreboard}>
            <ClipboardList size={16} />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Ajuda" onClick={handleOpenInfo}>
            <Info size={16} />
          </Button>
        </FloatingActionBar>
      </div>

      <Modal
        isOpen={Boolean(selectedTile)}
        title={selectedTile ? `${selectedTile.column.film} · ${selectedTile.tile.points} pts` : ''}
        onClose={handleCloseQuestionModal}
        size="lg"
      >
        <div className="flex flex-col gap-3 md:flex-row md:gap-4">
          {/* Coluna esquerda: contexto + pergunta + resposta */}
          <div className="flex flex-1 flex-col gap-3 text-[var(--color-text)]">
            {/* Quem está respondendo + Timer */}
            <div className="flex items-center justify-between gap-3">
              {activeParticipant && activeTeam ? (
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: activeTeam.color }} />
                  <span className="text-sm font-semibold">{activeParticipant.name}</span>
                  <span className="text-xs text-[var(--color-muted)]">· {activeTeam.name}</span>
                </div>
              ) : (
                <span className="text-xs text-[var(--color-muted)]">Sem turno ativo</span>
              )}
              <Timer
                initialSeconds={getTimerForPoints(selectedTile?.tile.points ?? 0)}
                variant="compact"
                editable
                onRunningChange={(running) => {
                  if (running) setQuestionRevealed(true)
                }}
                onTimeEdit={(newSeconds) => {
                  const points = selectedTile?.tile.points ?? 0
                  if (points > 0) {
                    setTimerOverrides(prev => ({ ...prev, [points]: newSeconds }))
                  }
                }}
              />
            </div>

            {/* Pergunta */}
            {questionRevealed ? (
              <div className="rounded-xl bg-[var(--color-surface)] p-4 shadow-sm">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">Pergunta</p>
                <p className="text-base font-medium leading-relaxed tracking-wide text-[var(--color-text)]">{selectedTile?.tile.question}</p>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setQuestionRevealed(true)}>
                Revelar pergunta
              </Button>
            )}

            {/* Resposta */}
            {showAnswer ? (
              <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-4 shadow-sm">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-primary)]">Resposta</p>
                <p className="text-base font-bold leading-relaxed tracking-wide text-[var(--color-text)]">{selectedTile?.tile.answer || 'Resposta não cadastrada.'}</p>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowAnswer(true)}>
                Revelar resposta
              </Button>
            )}
          </div>

          {/* Coluna direita: scoring */}
          <div className="md:w-56 md:shrink-0">
            <ScoringControls
            teams={orderedTeams}
            participants={participants}
            activeTeamId={activeTeam?.id ?? null}
            activeParticipantId={activeParticipant?.id ?? null}
            basePoints={selectedTile?.tile.points ?? 0}
            onConfirm={(distributions) => {
              if (!selectedTile || !activeParticipant) {
                toast.info('Selecione uma carta e certifique-se de que há um participante ativo')
                return
              }
              
              if (distributions.length === 0) {
                setConfirmActionConfig({
                  title: 'Anular Pergunta',
                  description: `Esta ação irá anular a pergunta "${selectedTile.tile.question}" do filme "${selectedTile.column.film}" sem atribuir pontos. A pergunta será marcada como respondida e o turno avançará automaticamente para o próximo participante.`,
                  onConfirm: () => {
                    updateTileState(selectedTile.tile.id, 'answered')
                    const message = `${selectedTile.column.film}: pergunta anulada (sem pontuação)`
                    toast.success(message)
                    advanceTurn()
                    setSelectedIds(null)
                    setShowAnswer(false)
                  },
                  variant: 'warning',
                })
                setConfirmActionOpen(true)
                return
              }
              
              const totalPoints = distributions.reduce((sum, d) => sum + d.points, 0)
              const teamsAffected = [...new Set(distributions.map(d => d.teamId))].length
              
              setConfirmActionConfig({
                title: 'Confirmar Pontuação',
                description: `Esta ação irá atribuir ${totalPoints} pontos distribuídos entre ${teamsAffected} time(s) e avançará automaticamente para o próximo turno. A pergunta será marcada como respondida.`,
                onConfirm: () => {
                  let message = ''
                  
                  distributions.forEach((distribution) => {
                    const team = orderedTeams.find(t => t.id === distribution.teamId)
                    const participant = distribution.participantId 
                      ? participants.find(p => p.id === distribution.participantId)
                      : null
                    
                    awardPoints(
                      selectedTile.tile.id, 
                      distribution.teamId, 
                      distribution.participantId || activeParticipant.id, 
                      distribution.points
                    )
                    
                    const recipient = participant ? `${participant.name} (${team?.name})` : team?.name ?? 'time'
                    message += `${team?.name}: ${distribution.points} pontos para ${recipient}\n`
                  })
                  
                  toast.success(message.trim())
                  advanceTurn()
                  setSelectedIds(null)
                  setShowAnswer(false)
                },
                variant: 'info',
              })
              setConfirmActionOpen(true)
            }}
            onClose={handleCloseQuestionModal}
          />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={scoreboardOpen}
        title="Ranking da noite"
        description="Resumo parcial das equipes nesta sessão. Clique nos times para ver pontuação individual."
        onClose={() => {
          setScoreboardOpen(false)
          setActivePanel('board')
        }}
      >
        <div className="space-y-3">
          {scoreboard.map(({ team, position, points }) => {
            const isExpanded = scoreboardAccordions[`scoreboard-${team.id}`]
            
            // Calcula pontuação de cada participante do time
            const participantScores = team.members.map((memberId) => {
              const participant = participants.find((p) => p.id === memberId)
              // Soma todos os pontos das perguntas respondidas por este participante
              const triviaPoints = session.board
                .flatMap((column) => column.tiles)
                .filter((tile) => tile.answeredBy?.participantId === memberId)
                .reduce((sum, tile) => sum + (tile.answeredBy?.pointsAwarded || 0), 0)
              
              // Soma pontos de mimica
              const mimicaPoints = (session.mimicaScores || [])
                .filter((score) => score.participantId === memberId)
                .reduce((sum, score) => sum + score.pointsAwarded, 0)
              
              const individualPoints = triviaPoints + mimicaPoints
              
              return {
                participant,
                points: individualPoints,
                triviaPoints,
                mimicaPoints,
              }
            }).filter((p) => p.participant) // Remove participantes não encontrados
            
            return (
              <div key={team.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] overflow-hidden">
                <button
                  onClick={() =>
                    setScoreboardAccordions({
                      ...scoreboardAccordions,
                      [`scoreboard-${team.id}`]: !scoreboardAccordions[`scoreboard-${team.id}`],
                    })
                  }
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-full bg-[var(--color-primary)]/10 text-center text-sm font-semibold text-[var(--color-primary)] leading-8">
                      {position}º
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-text)]">{team.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--color-text)]">{points} pts</span>
                    <svg
                      className={`h-4 w-4 text-[var(--color-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                    <div className="space-y-2">
                      {participantScores.map(({ participant, points: individualPoints, triviaPoints, mimicaPoints }) => (
                        <div key={participant?.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-background)]">
                          <div className="flex-1">
                            <span className="text-xs font-medium text-[var(--color-muted)]">
                              {participant?.name}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-[var(--color-muted)]">
                                {triviaPoints} pts trivia
                              </span>
                              {mimicaPoints > 0 && (
                                <span className="text-xs text-[var(--color-muted)]">
                                  · {mimicaPoints} pts mimica
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--color-text)]">
                              {individualPoints} pts
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedParticipantId(participant?.id || null)
                                setScoreDetailOpen(true)
                              }}
                              className="text-xs"
                            >
                              Ver detalhes
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Modal>

      <TeamsManagementModal
        isOpen={teamsModalOpen}
        onClose={() => {
          setTeamsModalOpen(false)
          setActivePanel('board')
        }}
        teamDrafts={teamManagement.teamDrafts}
        canSave={teamManagement.canSave}
        onAddTeam={teamManagement.addTeam}
        onRemoveTeam={teamManagement.removeTeam}
        onUpdateTeam={teamManagement.updateTeam}
        onMoveTeam={teamManagement.moveTeam}
        onAddParticipant={teamManagement.addParticipant}
        onRemoveParticipant={teamManagement.removeParticipant}
        onUpdateParticipant={teamManagement.updateParticipant}
        onMoveParticipant={teamManagement.moveParticipant}
        onSave={() => {
          teamManagement.saveTeams()
          setTeamsModalOpen(false)
          setActivePanel('board')
        }}
      />

      <Modal
        isOpen={pinModalOpen}
        title="Desbloquear biblioteca"
        description="Digite o PIN apenas se o host tiver configurado protecao para a biblioteca."
        onClose={() => {
          setPinModalOpen(false)
          setPinInput('')
          setPinError('')
          setActivePanel('board')
        }}
      >
        <div className="space-y-4">
          <input
            type="password"
            value={pinInput}
            onChange={(event) => {
              setPinInput(event.target.value)
              setPinError('')
            }}
            placeholder="Digite o PIN"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm"
          />
          {pinError ? <p className="text-sm text-[var(--color-danger)]">{pinError}</p> : null}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={confirmPin}>
              Confirmar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPinModalOpen(false)
                setPinInput('')
                setPinError('')
                setActivePanel('board')
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <QuestionLibraryModal
        isOpen={libraryOpen}
        onClose={() => {
          setLibraryOpen(false)
          setActivePanel('board')
        }}
        board={session.board}
        selectedFilmId={selectedFilmId}
        onSelectedFilmIdChange={setSelectedFilmId}
        searchQuery={librarySearchQuery}
        onSearchQueryChange={setLibrarySearchQuery}
        filterPoints={libraryPointsFilter}
        onFilterPointsChange={setLibraryPointsFilter}
        sortMode={librarySortMode}
        onSortModeChange={setLibrarySortMode}
        onUpdateColumnTitle={updateColumnTitle}
        onAddQuestion={handleAddQuestion}
        onRemoveQuestion={handleRemoveQuestion}
        onUpdateTileContent={updateTileContent}
        onAddFilm={handleAddFilm}
        onRemoveFilm={handleRemoveFilm}
        onImportFilms={(importData) => {
          importData.forEach(({ column, tiles }) => {
            const columnId = addFilmColumn(column.film)
            tiles.forEach((tile) => {
              addQuestionTile(columnId, {
                points: tile.points,
                question: tile.question,
                answer: tile.answer,
              })
            })
          })
          toast.success(
            `${importData.length} filme${importData.length !== 1 ? 's' : ''} importado${importData.length !== 1 ? 's' : ''} com sucesso!`
          )
        }}
      />

      <Modal
        isOpen={filmsOpen}
        title="Catálogo de filmes"
        description="Organize os filmes da sessão e o catálogo personalizado em um só lugar."
        onClose={() => {
          setFilmsOpen(false)
          setActivePanel('board')
        }}
      >
        <FilmManager
          films={customFilms}
          participants={participants}
          sessionFilms={sessionFilms}
          viewMode={filmCatalogViewMode}
          onViewModeChange={setFilmCatalogViewMode}
          sortMode={filmCatalogSortMode}
          onSortModeChange={setFilmCatalogSortMode}
          onAddFilm={addCustomFilm}
          onUpdateFilm={updateCustomFilm}
          onRemoveFilm={removeCustomFilm}
          onClose={() => {
            setFilmsOpen(false)
            setActivePanel('board')
          }}
        />
      </Modal>

      <Modal
        isOpen={themeModalOpen}
        title="Ajustar tema"
        description="Escolha o estilo de cores aplicado a todas as telas."
        onClose={() => {
          setThemeModalOpen(false)
          setActivePanel('board')
        }}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              { id: 'light', label: 'Claro' },
              { id: 'dark', label: 'Escuro' },
              { id: 'cinema', label: 'Cinema' },
              { id: 'retro', label: 'Retro 80s' },
              { id: 'matrix', label: 'Matrix' },
              { id: 'brazil', label: 'Brasil 🇧🇷' },
              { id: 'easter', label: 'Páscoa 🐣' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              className={`flex flex-col items-start gap-2 rounded-2xl border px-4 py-3 text-left ${
                themeMode === option.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[var(--color-border)] bg-[var(--color-background)]'
              }`}
            >
              <span className="text-sm font-semibold text-[var(--color-text)]">{option.label}</span>
              <span className="text-xs text-[var(--color-muted)]">
                {option.id === 'cinema' ? 'Tons quentes e contraste elevado' : 
                 option.id === 'retro' ? 'Neon e cores vibrantes dos anos 80' :
                 option.id === 'matrix' ? 'Verde digital e efeito terminal' :
                 option.id === 'brazil' ? 'Verde e amarelo da bandeira brasileira' :
                 option.id === 'easter' ? 'Tons pastel com ovos e coelhos' :
                 `Paleta ${option.label.toLowerCase()}`}
              </span>
            </button>
          ))}
        </div>
      </Modal>

      <MimicaModal
        isOpen={mimicaModalOpen}
        onClose={() => {
          setMimicaModalOpen(false)
          setActivePanel('board')
        }}
        teams={orderedTeams}
        participants={participants}
        activeParticipant={activeParticipant}
        turnSequence={session.turnSequence}
        onAdvanceTurn={advanceTurn}
        onScore={(mode, targetTeamId, points, turnNumber, roundNumber) => {
          let message = ''
          
          try {
            if (!activeParticipant) {
              toast.error('Nenhum participante ativo')
              return
            }

            const participantId = activeParticipant.id
            let teamId = activeTeam?.id

            switch (mode) {
              case 'full-current':
                if (activeTeam) {
                  teamId = activeTeam.id
                  awardMimicaPoints(participantId, teamId, points, turnNumber, roundNumber, mode)
                  message = `Mímica: ${points} pontos para ${activeTeam.name}`
                }
                break
              case 'half-current':
                if (activeTeam) {
                  teamId = activeTeam.id
                  awardMimicaPoints(participantId, teamId, points, turnNumber, roundNumber, mode)
                  message = `Mímica: ${points} pontos para ${activeTeam.name}`
                }
                break
              case 'steal':
                if (targetTeamId) {
                  const targetTeam = orderedTeams.find((team) => team.id === targetTeamId)
                  if (targetTeam) {
                    teamId = targetTeamId
                    awardMimicaPoints(participantId, teamId, points, turnNumber, roundNumber, mode, targetTeamId)
                    message = `Mímica: ${points} pontos transferidos para ${targetTeam.name}`
                  }
                }
                break
              case 'everyone': {
                const pointsPerTeam = points
                orderedTeams.forEach((team) => {
                  awardMimicaPoints(participantId, team.id, pointsPerTeam, turnNumber, roundNumber, mode)
                })
                message = `Mímica: ${pointsPerTeam} pontos distribuídos para todos os times`
                break
              }
              case 'void':
                if (activeTeam) {
                  teamId = activeTeam.id
                  awardMimicaPoints(participantId, teamId, 0, turnNumber, roundNumber, mode)
                }
                message = `Mímica: sem pontuação`
                break
            }
            
            toast.success(message)
          } catch (error) {
            console.error('Erro ao adicionar pontos da mímica:', error)
            toast.error('Erro ao adicionar pontos da mímica')
          }
        }}
      />

      <FilmRoulette
        isOpen={filmRouletteOpen}
        onClose={() => {
          setFilmRouletteOpen(false)
          setActivePanel('board')
        }}
        teams={orderedTeams}
        participants={participants}
        sessionFilms={sessionFilms}
      />

      <OfflineOnboardingModal
        isOpen={offlineOnboardingOpen}
        onClose={() => {
          // Marca como visto mesmo se fechar sem completar
          storageService.set(STORAGE_KEYS.onboardingSeen, 'true')
          setOfflineOnboardingOpen(false)
          setActivePanel('board')
        }}
        onComplete={handleOfflineOnboardingComplete}
        onSkip={() => {
          // Marca como visto ao pular
          storageService.set(STORAGE_KEYS.onboardingSeen, 'true')
          setOfflineOnboardingOpen(false)
          setActivePanel('board')
        }}
      />

      <SessionManager
        isOpen={sessionManagerOpen}
        onClose={() => {
          setSessionManagerOpen(false)
          setActivePanel('board')
        }}
        onLoadSession={handleLoadSession}
        onNewSession={() => {
          // Mostra modal de confirmação antes de limpar tudo
          setConfirmActionConfig({
            title: 'Criar Nova Sessão',
            description: 'Esta ação irá limpar completamente a sessão atual e iniciar uma nova. Serão removidos: todos os filmes, todas as perguntas, todos os times e participantes, e todas as pontuações. O tema visual será mantido. Após a confirmação, o assistente de configuração inicial será aberto.',
            onConfirm: () => {
              // Limpa completamente a sessão atual antes de abrir onboarding
              sessionManagement.resetGame({
                teams: true,
                participants: true,
                questions: true,
                films: true,
                points: true,
                themes: false, // Mantém o tema atual
              })
              // Abre onboarding para nova sessão
              setOfflineOnboardingOpen(true)
              setSessionManagerOpen(false)
            },
            variant: 'warning',
          })
          setConfirmActionOpen(true)
        }}
        onResetGame={() => setResetGameModalOpen(true)}
      />

      <ResetGameModal
        isOpen={resetGameModalOpen}
        onClose={() => {
          setResetGameModalOpen(false)
          setActivePanel('board')
        }}
        onConfirmReset={handleResetGame}
      />

      <GameEndModal
        isOpen={gameEndModalOpen}
        onClose={() => {
          setGameEndModalOpen(false)
          setActivePanel('board')
        }}
        teams={orderedTeams}
        participants={participants}
        board={session.board}
        onShowMimica={() => {
          setActivePanel('board')
          setMimicaModalOpen(true)
        }}
      />

      {selectedParticipantId && (
        <ScoreDetailView
          isOpen={scoreDetailOpen}
          onClose={() => {
            setScoreDetailOpen(false)
            setSelectedParticipantId(null)
            setActivePanel('board')
          }}
          participant={participants.find((p) => p.id === selectedParticipantId)!}
          team={orderedTeams.find((t) => t.id === participants.find((p) => p.id === selectedParticipantId)?.teamId) || orderedTeams[0]}
          board={session.board}
          mimicaScores={session.mimicaScores || []}
          allParticipants={participants}
          allTeams={orderedTeams}
        />
      )}

      {confirmActionConfig && (
        <ConfirmActionModal
          isOpen={confirmActionOpen}
          onClose={() => {
            setConfirmActionOpen(false)
            setConfirmActionConfig(null)
          }}
          onConfirm={confirmActionConfig.onConfirm}
          title={confirmActionConfig.title}
          description={confirmActionConfig.description}
          variant={confirmActionConfig.variant}
        />
      )}
    </ControlShell>
    </>
  )
}
