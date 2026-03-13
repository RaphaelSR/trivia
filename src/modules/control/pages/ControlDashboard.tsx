import {
  BookOpen,
  ClipboardList,
  Dice5,
  Eye,
  Info,
  Palette,
  RefreshCw,
  RotateCcw,
  UserPlus,
  UsersRound,
  Theater,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { FilmRoulette } from '@/components/ui/FilmRoulette'
import { InfoModal } from '@/components/ui/InfoModal'
import { MimicaModal } from '@/components/ui/MimicaModal'
import { Modal } from '@/components/ui/Modal'
import { Navbar } from '@/components/ui/Navbar'
import { TeamBadge } from '@/components/ui/TeamBadge'
import { Timer } from '@/components/ui/Timer'
import { TriviaBoard } from '@/components/ui/TriviaBoard'
import type { TriviaColumn, TriviaParticipant, TriviaQuestionTile, TriviaTeam } from '@/modules/trivia/types'
import { useTriviaSession } from '@/modules/trivia/hooks/useTriviaSession'
import { useThemeMode } from '@/app/providers/useThemeMode'
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
import { STORAGE_KEYS } from '@/shared/constants/storage'
import { storageService } from '@/shared/services/storage.service'
import { countAnsweredTiles, countTotalTiles } from '@/modules/game/domain/board.utils'
import { buildTurnSequence } from '@/modules/game/domain/turn-order'
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
    theme,
    orderedTeams,
    participants,
    activeTeam,
    activeParticipant,
    nextParticipant,
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
  const { gameMode, getModeDisplayName, getModeDescription } = useGameMode()
  const { verifyPin, saveCustomPin } = usePinManagement()
  const { saveSession, loadSession } = useOfflineSession()

  const dashboardState = useControlDashboardState()
  const {
    selectedIds,
    setSelectedIds,
    showAnswer,
    setShowAnswer,
    scoreboardOpen,
    setScoreboardOpen,
    libraryOpen,
    setLibraryOpen,
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
    infoModalOpen,
    setInfoModalOpen,
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
    confirmActionOpen,
    setConfirmActionOpen,
    confirmActionConfig,
    setConfirmActionConfig,
  } = dashboardState

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

  const layoutStyle = useMemo(() => {
    return {
      '--color-primary': theme.palette.primary,
      '--color-secondary': theme.palette.accent,
      '--color-surface': theme.palette.surface,
      '--color-background': theme.palette.background,
    } as CSSProperties
  }, [theme.palette.accent, theme.palette.primary, theme.palette.surface, theme.palette.background])

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

  const activeParticipantTeamName = useMemo(() => {
    if (!activeParticipant) return null
    return orderedTeams.find((team) => team.id === activeParticipant.teamId)?.name ?? null
  }, [activeParticipant, orderedTeams])

  const nextParticipantTeamName = useMemo(() => {
    if (!nextParticipant) return null
    return orderedTeams.find((team) => team.id === nextParticipant.teamId)?.name ?? null
  }, [nextParticipant, orderedTeams])

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
  }

  const handleCloseQuestionModal = () => {
    if (selectedTile) {
      updateTileState(selectedTile.tile.id, 'available')
    }
    setSelectedIds(null)
    setShowAnswer(false)
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
    if (!libraryUnlocked) {
      setPinModalOpen(true)
      return
    }
    setLibraryOpen(true)
  }

  const confirmPin = () => {
    if (verifyPin(pinInput.trim())) {
      setLibraryUnlocked(true)
      setPinModalOpen(false)
      setPinInput('')
      setPinError('')
      setLibraryOpen(true)
      toast.success('Acesso liberado')
      return
    }
    setPinError('PIN inválido')
  }

  const handleStartOnboarding = () => {
    setOfflineOnboardingOpen(true)
    setShowOnboardingSuggestion(false)
  }

  const handleDismissOnboardingSuggestion = () => {
    setShowOnboardingSuggestion(false)
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
      
      // Salva o PIN personalizado
      saveCustomPin(config.pin)
      
      // Cria colunas para os filmes customizados
      const filmColumns: string[] = []
      config.customFilms.forEach(film => {
        const columnId = addFilmColumn(film.name)
        filmColumns.push(columnId)
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


  const quickActions = [
    {
      id: 'random',
      icon: <Dice5 size={18} />,
      label: 'Sortear Pergunta',
      description: 'Seleciona uma pergunta aleatória disponível',
      onClick: handleRandomQuestion,
    },
    {
      id: 'answer',
      icon: <Eye size={18} />,
      label: 'Mostrar Resposta',
      description: 'Exibe a resposta da pergunta selecionada',
      onClick: () => {
        if (!selectedTile) {
          toast.info('Selecione uma carta para exibir a resposta')
          return
        }
        setShowAnswer(true)
        toast.success('Resposta exibida para a sala')
      },
      disabled: !selectedTile,
    },
    {
      id: 'mimica',
      icon: <Theater size={18} />,
      label: 'Modo Mímica',
      description: 'Abre o modo de mímica para pontuação especial',
      onClick: () => setMimicaModalOpen(true),
    },
    {
      id: 'scoreboard',
      icon: <ClipboardList size={18} />,
      label: 'Ranking',
      description: 'Visualiza o ranking atual dos times',
      onClick: () => setScoreboardOpen(true),
    },
    {
      id: 'teams',
      icon: <UsersRound size={18} />,
      label: 'Gerenciar Times',
      description: 'Edita times, participantes e ordem de turno',
      onClick: () => setTeamsModalOpen(true),
    },
    {
      id: 'library',
      icon: <BookOpen size={18} />,
      label: 'Biblioteca',
      description: 'Edita perguntas e respostas (requer PIN)',
      onClick: handleShowLibrary,
    },
    {
      id: 'theme',
      icon: <Palette size={18} />,
      label: 'Alterar Tema',
      description: 'Muda o tema visual da aplicação',
      onClick: () => setThemeModalOpen(true),
    },
    {
      id: 'revert',
      icon: <RefreshCw size={18} />,
      label: 'Reverter Ação',
      description: 'Desfaz a última ação (em breve)',
      onClick: () => toast.warning('Reversão manual será liberada em breve'),
    },
    {
      id: 'info',
      icon: <Info size={18} />,
      label: 'Informações',
      description: 'Ajuda e informações sobre o sistema',
      onClick: () => setInfoModalOpen(true),
    },
    {
      id: 'roulette',
      icon: <RotateCcw size={18} />,
      label: 'Sorteio de Filmes',
      description: 'Sorteia filmes aleatórios para o tabuleiro',
      onClick: () => setFilmRouletteOpen(true),
    },
    {
      id: 'regenerate-turns',
      icon: <RefreshCw size={18} />,
      label: 'Regenerar Turnos',
      description: 'Recria a sequência de turnos alternando entre times',
      onClick: handleRegenerateTurnSequence,
      disabled: orderedTeams.length === 0,
    },
  ]

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


  return (
    <div className="flex min-h-screen flex-col" style={layoutStyle}>
      <Navbar
        title={`${session.title} - ${getModeDisplayName(gameMode)}`}
        mode="controle"
        onOpenSessionManager={() => setSessionManagerOpen(true)}
        onExit={() => toast.info('Encerrando sessão atual')}
      />
      <main className="flex-1 space-y-6 px-8 py-6">
        <section className="card-surface rounded-3xl p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--color-muted)]">
                  Turno atual
                </p>
                <p className="text-lg font-semibold text-[var(--color-text)]">
                  {gameMode === 'offline' && orderedTeams.length === 0 
                    ? 'Configure times para começar'
                    : activeParticipant?.name ?? 'Aguardando início'
                  }
                  {activeParticipantTeamName ? ` · ${activeParticipantTeamName}` : ''}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--color-muted)]">
                  Modo de jogo
                </p>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${
                    gameMode === 'demo' ? 'bg-blue-500' :
                    gameMode === 'offline' ? 'bg-orange-500' :
                    'bg-green-500'
                  }`} />
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {getModeDisplayName(gameMode)}
                  </p>
                </div>
                <p className="text-xs text-[var(--color-muted)]">
                  {getModeDescription(gameMode)}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-4">
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 shadow-sm">
                  <Timer initialSeconds={45} variant="compact" editable />
                </div>
                {quickActions.map((action) => (
                  <div key={action.id} className="relative group">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={action.label}
                      title={action.label}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className="w-full h-full"
                    >
                      {action.icon}
                    </Button>
                    <div className="tooltip">
                      <div className="font-semibold">{action.label}</div>
                      <div className="text-xs opacity-90 mt-1">{action.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {orderedTeams.map((team) => (
                  <TeamBadge key={team.id} team={team} isActive={team.id === activeTeam?.id} />
                ))}
              </div>
              <div className="ml-auto flex flex-col gap-2">
                {/* Contador de Rodadas Completas */}
                {orderedTeams.length > 0 && (
                  <div className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-primary)] shadow-sm">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Rodada {currentRound}
                  </div>
                )}
                
                {/* Contador de Turnos */}
                {orderedTeams.length > 0 && (
                  <div className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-secondary)]/30 bg-[var(--color-secondary)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-secondary)]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Turno {session.turnSequence.indexOf(session.activeParticipantId || '') + 1} de {session.turnSequence.length}
                  </div>
                )}
                
                {/* Time e Participante Atual */}
                {activeParticipant && activeTeam && (
                  <div className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-primary)] shadow-md">
                    <UsersRound size={14} className="font-bold" /> 
                    Vez de: {activeParticipant.name} · {activeTeam.name}
                  </div>
                )}
                {/* Próximo Time e Participante */}
                {nextParticipant && nextParticipantTeamName && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)] shadow-sm">
                    <UsersRound size={14} /> Próximo: {nextParticipant.name} · {nextParticipantTeamName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Seção de instruções para modo offline */}
        {gameMode === 'offline' && orderedTeams.length === 0 && (
          <section className="card-surface rounded-3xl p-6 border-2 border-dashed border-[var(--color-primary)]/30">
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                <UsersRound className="h-8 w-8 text-[var(--color-primary)]" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-[var(--color-text)]">
                  Bem-vindo ao Modo Offline!
                </h3>
                <p className="text-[var(--color-muted)] max-w-md mx-auto">
                  Para começar sua sessão de trivia, você precisa configurar os times e participantes.
                  Clique no botão "Gerenciar Times" para criar sua primeira equipe.
                </p>
              </div>
              
              {/* Opções de Configuração em Layout Horizontal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {/* Configuração Rápida */}
                {showOnboardingSuggestion && (
                  <div className="p-4 rounded-2xl bg-[var(--color-secondary)]/5 border border-[var(--color-secondary)]/20">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🚀</span>
                        <h4 className="font-semibold text-[var(--color-text)]">
                          Configuração Rápida
                        </h4>
                      </div>
                      <p className="text-sm text-[var(--color-muted)]">
                        Assistente para configurar tema, PIN, filmes e times em poucos passos
                      </p>
                      <Button
                        onClick={handleStartOnboarding}
                        className="w-full text-sm"
                      >
                        Usar Assistente
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Configuração Manual */}
                <div className="p-4 rounded-2xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">⚙️</span>
                      <h4 className="font-semibold text-[var(--color-text)]">
                        Configuração Manual
                      </h4>
                    </div>
                    <p className="text-sm text-[var(--color-muted)]">
                      Configure cada parte separadamente: times, filmes e perguntas
                    </p>
                    <div className="space-y-2">
                      <Button
                        onClick={() => setTeamsModalOpen(true)}
                        variant="outline"
                        className="w-full text-sm"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Gerenciar Times
                      </Button>
                      {showOnboardingSuggestion && (
                        <Button
                          onClick={handleDismissOnboardingSuggestion}
                          variant="ghost"
                          className="w-full text-sm"
                        >
                          Dismissar Sugestão
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </section>
        )}

        <section className="card-surface rounded-3xl p-6">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--color-muted)]">
                Tabuleiro
              </p>
              <h2 className="text-2xl font-semibold text-[var(--color-text)]">Selecione a próxima pergunta</h2>
            </div>
            <span className="text-sm font-medium text-[var(--color-muted)]">
              {session.board.length} temas · {countTotalTiles(session.board)} cartas
            </span>
          </div>
          <TriviaBoard columns={session.board} onSelectTile={handleSelectTile} />
        </section>

        <section className="flex items-center justify-end pt-2">
          <Button variant="outline" className="gap-2" onClick={() => setTeamsModalOpen(true)}>
            <UsersRound size={16} />
            Gerenciar times
          </Button>
        </section>
      </main>

      <Modal
        isOpen={Boolean(selectedTile)}
        title={selectedTile ? `${selectedTile.column.film} · ${selectedTile.tile.points} pontos` : ''}
        description="Confirme a pergunta, conduza o timer e distribua a pontuação."
        onClose={handleCloseQuestionModal}
      >
        <div className="space-y-4 text-[var(--color-text)]">
          {/* Informação de quem está respondendo */}
          {activeParticipant && activeTeam && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: activeTeam.color }}
                />
                <span className="text-sm font-semibold text-[var(--color-text)]">
                  {activeParticipant.name}
                </span>
                <span className="text-sm text-[var(--color-muted)]">
                  · {activeTeam.name}
                </span>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                Respondendo
              </span>
            </div>
          )}

          <Timer
            initialSeconds={selectedTile?.tile.points ? Math.min(90, selectedTile.tile.points * 4) : 45}
            variant="compact"
            editable
          />
          <div className="rounded-2xl bg-[var(--color-surface)] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
              Pergunta
            </h3>
            <p className="mt-2 text-base">{selectedTile?.tile.question}</p>
          </div>
          {showAnswer ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
                Resposta
              </h3>
              <p className="mt-2 text-base">{selectedTile?.tile.answer || 'Resposta não cadastrada.'}</p>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowAnswer(true)}>
              Revelar resposta
            </Button>
          )}
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
      </Modal>

      <Modal
        isOpen={scoreboardOpen}
        title="Ranking da noite"
        description="Resumo parcial das equipes nesta sessão. Clique nos times para ver pontuação individual."
        onClose={() => setScoreboardOpen(false)}
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
                  onClick={() => setScoreboardAccordions((prev: Record<string, boolean>) => ({
                    ...prev,
                    [`scoreboard-${team.id}`]: !prev[`scoreboard-${team.id}`]
                  }))}
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
        onClose={() => setTeamsModalOpen(false)}
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
        }}
      />

      <Modal
        isOpen={pinModalOpen}
        title="Desbloquear biblioteca"
        description="Informe o PIN do anfitrião para editar perguntas e temas."
        onClose={() => {
          setPinModalOpen(false)
          setPinInput('')
          setPinError('')
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
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <QuestionLibraryModal
        isOpen={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        board={session.board}
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
        isOpen={themeModalOpen}
        title="Ajustar tema"
        description="Escolha o estilo de cores aplicado a todas as telas."
        onClose={() => setThemeModalOpen(false)}
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
                 `Paleta ${option.label.toLowerCase()}`}
              </span>
            </button>
          ))}
        </div>
      </Modal>

      <MimicaModal
        isOpen={mimicaModalOpen}
        onClose={() => setMimicaModalOpen(false)}
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

      <InfoModal
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        onOpenOnboarding={() => {
          const hasExistingData = 
            session.board.length > 0 || 
            orderedTeams.length > 0 || 
            participants.length > 0 ||
            session.board.some(column => column.tiles.some(tile => tile.state === 'answered')) ||
            orderedTeams.some(team => (team.score || 0) > 0)

          if (hasExistingData) {
            const filmsCount = session.board.length
            const questionsCount = countTotalTiles(session.board)
            const teamsCount = orderedTeams.length
            const totalScore = orderedTeams.reduce((acc, team) => acc + (team.score || 0), 0)

            const itemsToLose = []
            if (filmsCount > 0) itemsToLose.push(`${filmsCount} filme${filmsCount !== 1 ? 's' : ''}`)
            if (questionsCount > 0) itemsToLose.push(`${questionsCount} pergunta${questionsCount !== 1 ? 's' : ''}`)
            if (teamsCount > 0) itemsToLose.push(`${teamsCount} time${teamsCount !== 1 ? 's' : ''}`)
            if (totalScore > 0) itemsToLose.push(`${totalScore} pontos`)

            setConfirmActionConfig({
              title: 'Configurar Nova Sessão?',
              description: `Você já tem uma sessão ativa com dados: ${itemsToLose.join(', ')}. O onboarding irá criar uma nova sessão, substituindo os dados atuais. Deseja continuar?`,
              onConfirm: () => {
                sessionManagement.resetGame({
                  teams: true,
                  participants: true,
                  questions: true,
                  films: true,
                  points: true,
                  themes: false,
                })
                setOfflineOnboardingOpen(true)
                setInfoModalOpen(false)
              },
              variant: 'warning',
            })
            setConfirmActionOpen(true)
          } else {
            setOfflineOnboardingOpen(true)
            setInfoModalOpen(false)
          }
        }}
      />

      <FilmRoulette
        isOpen={filmRouletteOpen}
        onClose={() => setFilmRouletteOpen(false)}
        teams={orderedTeams}
        participants={participants}
        sessionFilms={session.board.map(column => ({ id: column.id, name: column.film }))}
      />

      <OfflineOnboardingModal
        isOpen={offlineOnboardingOpen}
        onClose={() => {
          // Marca como visto mesmo se fechar sem completar
          storageService.set(STORAGE_KEYS.onboardingSeen, 'true')
          setOfflineOnboardingOpen(false)
        }}
        onComplete={handleOfflineOnboardingComplete}
        onSkip={() => {
          // Marca como visto ao pular
          storageService.set(STORAGE_KEYS.onboardingSeen, 'true')
          setOfflineOnboardingOpen(false)
        }}
      />

      <SessionManager
        isOpen={sessionManagerOpen}
        onClose={() => setSessionManagerOpen(false)}
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
        onClose={() => setResetGameModalOpen(false)}
        onConfirmReset={handleResetGame}
      />

      <GameEndModal
        isOpen={gameEndModalOpen}
        onClose={() => setGameEndModalOpen(false)}
        teams={orderedTeams}
        participants={participants}
        board={session.board}
        onShowMimica={() => setMimicaModalOpen(true)}
      />

      {selectedParticipantId && (
        <ScoreDetailView
          isOpen={scoreDetailOpen}
          onClose={() => {
            setScoreDetailOpen(false)
            setSelectedParticipantId(null)
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
    </div>
  )
}
