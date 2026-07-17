import {
  BookOpen,
  ClipboardList,
  Dice5,
  Info,
  Palette,
  RefreshCw,
  RotateCcw,
  TriangleAlert,
  UserPlus,
  UsersRound,
  Theater,
  Volume2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { FilmRoulette } from '@/components/ui/FilmRoulette'
import { MimicaModal } from '@/components/ui/MimicaModal'
import { Modal } from '@/components/ui/Modal'
import { TriviaBoard } from '@/components/ui/TriviaBoard'
import type { TriviaColumn, TriviaParticipant, TriviaQuestionTile, TriviaSession, TriviaTeam } from '@/modules/trivia/types'
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
import { Timer } from '@/components/ui/Timer'
import { STORAGE_KEYS } from '@/shared/constants/storage'
import { FloatingActionBar } from '@/shared/components/FloatingActionBar'
import { storageService } from '@/shared/services/storage.service'
import { countAnsweredTiles, countTotalTiles, releaseActiveTiles } from '@/modules/game/domain/board.utils'
import { planImport } from '@/modules/control/utils/filmExportUtils'
import { getDefaultTimerForPoints } from '@/modules/game/domain/timer'
import { buildTurnSequence, getTurnPosition } from '@/modules/game/domain/turn-order'
import { canDrawTeamsBeforePlay } from '@/modules/game/domain/team-draw'
import { FaqPanel } from '../ui/FaqPanel'
import { GameStatusStrip } from '../ui/GameStatusStrip'
import { ControlShell } from '../ui/ControlShell'
import { ControlSidebar } from '../ui/ControlSidebar'
import { ControlTopbar } from '../ui/ControlTopbar'
import { EmptyStatePanel } from '../ui/EmptyStatePanel'
import { SidebarNavGroup } from '../ui/SidebarNavGroup'
import { SidebarNavItem } from '../ui/SidebarNavItem'
import { BrazilBackground } from '@/shared/components/BrazilBackground'
import { EasterBackground } from '@/shared/components/EasterBackground'
import { useControlDashboardState } from '../hooks/useControlDashboardState'
import { useTeamManagement } from '../hooks/useTeamManagement'
import { useSessionManagement } from '../hooks/useSessionManagement'
import { TeamsManagementModal } from '../components/TeamsManagementModal'
import { ScoringControls } from '../components/ScoringControls'
import { TurnOrderPreview } from '../components/TurnOrderPreview'
import { createTeamId, createParticipantId, hasRosterChanges } from '../utils/teamUtils'
import { buildParticipantScoreBreakdown, buildTeamScoreboard } from '../utils/scoreboardUtils'
import type { OnboardingConfig } from '../types/control.types'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { isSupabaseConfigured } from '@/shared/services/supabase.client'
import { useCloudSync, type CloudSyncConflict } from '@/modules/game/application/useCloudSync'
import { useTabGuard } from '@/modules/game/application/useTabGuard'
import { ConflictResolutionModal } from '@/components/ui/ConflictResolutionModal'
import { VersionHistoryModal } from '@/components/ui/VersionHistoryModal'
import { describeMove, listCheckpoints, saveCheckpoint, type SessionCheckpoint } from '@/modules/game/infrastructure/session-checkpoint.service'
import { listSessionSnapshots, type SessionSnapshot } from '@/modules/game/infrastructure/session-snapshot.service'
import { SoundSettingsModal } from '@/components/ui/SoundSettingsModal'
import { playSound } from '@/shared/services/audio.service'
import { AuthPanel } from '@/modules/auth/components/AuthPanel'
import { useLiveParticipantIdentities } from '@/modules/auth/hooks/useLiveParticipantIdentities'
import { ParticipantAvatar } from '@/shared/components/ParticipantAvatar'
import { useTranslation } from 'react-i18next'
// PIN será gerenciado pelo hook usePinManagement

export function ControlDashboard() {
  const { t, i18n } = useTranslation(['control', 'game', 'common'])
  const {
    session,
    orderedTeams,
    participants,
    activeTeam,
    nextTeam,
    activeParticipant,
    nextParticipant,
    updateTileState,
    updateTileContent,
    updateColumnTitle,
    addFilmColumn,
    removeFilmColumn,
    addQuestionTile,
    replaceColumnTiles,
    removeQuestionTile,
    updateTeamsAndParticipants,
    awardPoints,
    voidQuestion,
    awardMimicaPoints,
    updateSessionInfo,
    advanceTurn,
    restoreSession,
  } = useTriviaSession()
  const { theme: themeMode, setTheme } = useThemeMode()
  const { gameMode, getModeDisplayName } = useGameMode()
  const { user } = useAuth()
  const { verifyPin, saveCustomPin, clearCustomPin, hasCustomPin } = usePinManagement()
  const { currentSession, saveSession, loadSession, getSessionStatus } = useOfflineSession()
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
    confirmActionOpen,
    setConfirmActionOpen,
    confirmActionConfig,
    setConfirmActionConfig,
  } = dashboardState

  const [timerOverrides, setTimerOverrides] = useState<Record<number, number>>({})
  const [questionRevealed, setQuestionRevealed] = useState(false)
  const [turnPreviewOpen, setTurnPreviewOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

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
    return buildTeamScoreboard(orderedTeams)
  }, [orderedTeams])

  const answeredCards = useMemo(() => countAnsweredTiles(session.board), [session.board])
  const totalCards = useMemo(() => countTotalTiles(session.board), [session.board])
  const sessionStatus = getSessionStatus()
  const currentTurnPosition = getTurnPosition(
    session.activeParticipantId,
    session.turnSequence,
    session.activeTurnIndex,
  )
  const currentTurnLabel = currentTurnPosition
    ? t('turn.counterCompact', currentTurnPosition)
    : t('turn.waitingCompact')
  const canOpenTurnPreview = useMemo(
    () =>
      totalCards > 0 &&
      session.turnSequence.length > 0 &&
      orderedTeams.length >= 2 &&
      orderedTeams.every((team) => team.members.length > 0),
    [orderedTeams, session.turnSequence.length, totalCards],
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

  // Salva sessão automaticamente quando há mudanças (modo offline e online; demo fica fora).
  // Jogadas (carta respondida / placar) salvam NA HORA — fechar a aba logo após
  // um lance não pode perdê-lo; o debounce de 1s fica para edições cosméticas.
  const lastSavedProgressRef = useRef<string | null>(null)
  // Estado da renderização anterior — é ele que vira checkpoint quando uma
  // jogada acontece ("voltar para antes de responder X").
  const prevSessionRef = useRef<TriviaSession | null>(null)
  useEffect(() => {
    if ((gameMode === 'offline' || gameMode === 'online') && orderedTeams.length > 0) {
      const progressSignature = `${countAnsweredTiles(session.board)}:${session.teams.reduce((sum, team) => sum + team.score, 0)}`
      const significantChange =
        lastSavedProgressRef.current !== null && progressSignature !== lastSavedProgressRef.current
      lastSavedProgressRef.current = progressSignature

      if (significantChange) {
        // Checkpoint local do estado ANTERIOR, rotulado pela jogada que
        // acabou de acontecer (primeiro evento novo do log append-only).
        const prev = prevSessionRef.current
        if (prev && prev.id === session.id) {
          const prevLogLength = prev.eventLog?.length ?? 0
          const newLogLength = session.eventLog?.length ?? 0
          let label: string = t('dashboard.checkpoints.beforeRestore')
          if (newLogLength >= prevLogLength) {
            const move = describeMove(session.eventLog?.[prevLogLength])
            const questionFallback = t('dashboard.checkpoints.questionFallback')
            if (move.type === 'score-adjustment') {
              label = t('dashboard.checkpoints.scoreAdjustment')
            } else if (move.type === 'mimica') {
              label = t('dashboard.checkpoints.mimica', {
                points: t('common:entities.pointsShort', { count: move.points }),
              })
            } else if (move.type === 'trivia-void') {
              label = t('dashboard.checkpoints.voidQuestion', { film: move.film ?? questionFallback })
            } else {
              label = t('dashboard.checkpoints.answerQuestion', {
                film: move.film ?? questionFallback,
                points: t('common:entities.pointsShort', { count: move.points }),
              })
            }
          }
          // Checkpoint nasce sem cartas 'active' (estado de modal aberto).
          saveCheckpoint(releaseActiveTiles(prev), label)
        }
        prevSessionRef.current = session
        saveSession(session, session.title)
        return
      }

      prevSessionRef.current = session
      const timer = setTimeout(() => {
        saveSession(session, session.title);
      }, 1000); // Debounce de 1 segundo

      return () => clearTimeout(timer);
    }
  }, [session, gameMode, orderedTeams.length, saveSession, t])

  // Backup na nuvem em background para o jogo local-first.
  // Quando o usuário está logado e o Supabase está configurado:
  //  - empurra cada mudança de sessão com debounce (2.5 s);
  //  - ao ativar (login/mount), reconcilia com a nuvem e restaura se mais novo.
  // Demo nunca sincroniza (enabled=false quando gameMode==='demo').
  const syncEnabled = gameMode !== 'demo' && Boolean(user) && isSupabaseConfigured()
  // Convites, identidades e avatares são capacidades da conta sincronizada,
  // não um terceiro estilo de jogo. Os valores internos de GameMode continuam
  // existindo apenas para manter rotas e sessões antigas compatíveis.
  const connectedGameFeaturesEnabled = syncEnabled
  const { identities: participantIdentities } = useLiveParticipantIdentities(
    session.id,
    connectedGameFeaturesEnabled,
  )
  // Conflito detectado pelo reconcile (local x nuvem divergem de forma ambígua).
  const [sessionConflict, setSessionConflict] = useState<CloudSyncConflict | null>(null)
  const { status: syncStatus, forceSync, snapshotFailing, lastSyncedAt } = useCloudSync({
    session,
    enabled: syncEnabled,
    title: session.title,
    localUpdatedAtIso: currentSession?.metadata.lastModified ?? null,
    onRestore: (cloudSession) => {
      // Aplica no estado React e persiste localmente para sobreviver a um reload
      restoreSession(cloudSession)
      saveSession(cloudSession, cloudSession.title)
    },
    onConflict: (conflict) => setSessionConflict(conflict),
  })

  // Outra aba deste navegador com a mesma sessão aberta? Duas abas se
  // sobrescrevem no localStorage — a UI avisa para jogar em uma só.
  const otherTabOpen = useTabGuard(session.id, gameMode !== 'demo')

  // Snapshots (T4) falhando em sequência: avisa uma vez por transição — o
  // jogo continua salvo, mas o histórico de versões parou de ganhar pontos
  // de restauração.
  useEffect(() => {
    if (snapshotFailing) {
      toast.warning(t('dashboard.notifications.snapshotFailure'), {
        id: 'snapshot-failing',
        description: t('dashboard.notifications.snapshotFailureDescription'),
        duration: 8000,
      })
    }
  }, [snapshotFailing, t])

  // T9 — configurações de som.
  const [soundSettingsOpen, setSoundSettingsOpen] = useState(false)

  // T4 — histórico de versões (snapshots na nuvem + checkpoints locais por jogada).
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [snapshots, setSnapshots] = useState<SessionSnapshot[]>([])
  const [snapshotsLoading, setSnapshotsLoading] = useState(false)
  const [checkpoints, setCheckpoints] = useState<SessionCheckpoint[]>([])

  useEffect(() => {
    if (!versionsOpen) return
    setCheckpoints(listCheckpoints(session.id))
    let cancelled = false
    setSnapshotsLoading(true)
    listSessionSnapshots(session.id)
      .then((list) => { if (!cancelled) setSnapshots(list) })
      .finally(() => { if (!cancelled) setSnapshotsLoading(false) })
    return () => { cancelled = true }
  }, [versionsOpen, session.id])

  const handleRestoreVersion = (snap: SessionSnapshot) => {
    restoreSession(snap.session)
    saveSession(snap.session, snap.session.title)
    setVersionsOpen(false)
    toast.success(t('dashboard.notifications.versionRestored'))
  }

  const handleRestoreCheckpoint = (checkpoint: SessionCheckpoint) => {
    restoreSession(checkpoint.session)
    saveSession(checkpoint.session, checkpoint.session.title)
    setVersionsOpen(false)
    toast.success(t('dashboard.notifications.checkpointRestored', { label: checkpoint.label.toLocaleLowerCase(i18n.resolvedLanguage) }))
  }

  // O usuário escolheu qual versão manter no modal de conflito.
  const handleConflictChoice = (which: 'local' | 'cloud') => {
    const conflict = sessionConflict
    setSessionConflict(null)
    if (!conflict) return
    if (which === 'cloud') {
      restoreSession(conflict.cloudSession)
      saveSession(conflict.cloudSession, conflict.cloudSession.title)
      toast.success(t('dashboard.notifications.usingCloud'))
    } else {
      // Mantém o local e sobe ele por cima da nuvem.
      void forceSync()
      toast.success(t('dashboard.notifications.usingDevice'))
    }
  }

  // Handler de force sync: chama forceSync() e exibe toast contextual em pt-BR.
  const handleForceSync = async () => {
    const result = await forceSync()
    switch (result) {
      case 'already-synced':
        toast.success(t('dashboard.notifications.alreadySynced'))
        break
      case 'synced':
        toast.success(t('dashboard.notifications.synced'))
        break
      case 'pending':
        toast.error(t('dashboard.notifications.syncPending'))
        break
      case 'disabled':
        toast(t('dashboard.notifications.signInToSync'))
        setAccountOpen(true)
        break
    }
  }

  const prepareLiveInvite = useCallback(async () => {
    const result = await forceSync()
    return result === 'synced' || result === 'already-synced'
  }, [forceSync])

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
      toast.warning(t('dashboard.notifications.noAvailableCards'))
      return
    }
    
    setConfirmActionConfig({
      title: t('dashboard.dialogs.randomQuestionTitle'),
      description: t('dashboard.dialogs.randomQuestionDescription'),
      onConfirm: () => {
        const random = availableTiles[Math.floor(Math.random() * availableTiles.length)]
        handleSelectTile(random.tile, random.column)
        toast.success(t('dashboard.notifications.questionDrawn'))
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
      toast.success(t('dashboard.notifications.libraryUnlocked'))
      return
    }
    setPinError(t('dashboard.pin.invalid'))
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

      const itemsToLose: string[] = []
      if (filmsCount > 0) itemsToLose.push(t('common:entities.film', { count: filmsCount }))
      if (questionsCount > 0) itemsToLose.push(t('common:entities.question', { count: questionsCount }))
      if (answeredCount > 0) itemsToLose.push(t('dashboard.dialogs.answeredQuestion', { count: answeredCount }))
      if (teamsCount > 0) itemsToLose.push(t('common:entities.team', { count: teamsCount }))
      if (totalScore > 0) itemsToLose.push(t('common:entities.point', { count: totalScore }))
      const formattedItems = new Intl.ListFormat(i18n.resolvedLanguage, {
        style: 'long',
        type: 'conjunction',
      }).format(itemsToLose)

      setConfirmActionConfig({
        title: t('dashboard.dialogs.loadTitle'),
        description: t('dashboard.dialogs.loadDescription', { items: formattedItems }),
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

  const handleResetGame: typeof sessionManagement.resetGame = (...args) => {
    // Reset é a ação mais destrutiva do jogo — merece um ponto de retorno.
    if (gameMode !== 'demo') {
      saveCheckpoint(releaseActiveTiles(session), t('dashboard.checkpoints.beforeReset'))
    }
    return sessionManagement.resetGame(...args)
  }

  const handleOfflineOnboardingComplete = (config: OnboardingConfig) => {
    try {
      // Aplica o tema selecionado
      setTheme(config.theme)
      
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
      
      // Título e data vão para o ESTADO — o antigo setTimeout salvava um
      // closure desatualizado e o autosave gravava por cima com o título
      // velho: o nome dado no onboarding nunca pegava.
      const sessionTitle = config.sessionTitle || t('dashboard.setup.defaultTitle', {
        date: new Date().toLocaleDateString(i18n.resolvedLanguage),
      })
      const sessionDate = config.sessionDate || new Date().toISOString()
      updateSessionInfo({ title: sessionTitle, scheduledAt: sessionDate })
      toast.success(t('dashboard.notifications.setupCreated', { title: sessionTitle }))
      
      // Marca onboarding como visto
      storageService.set(STORAGE_KEYS.onboardingSeen, 'true')
      
      // T10 — fecha o onboarding e abre a BIBLIOTECA direto, para o host
      // adicionar os filmes + perguntas (que é onde o board é montado de fato).
      // Abre direto (sem PIN) por ser logo após o setup; o PIN protege acessos
      // posteriores via handleShowLibrary.
      setOfflineOnboardingOpen(false)
      setShowOnboardingSuggestion(false)
      setActivePanel('library')
      setLibraryOpen(true)

      toast.success(t('dashboard.notifications.setupComplete'))
      
    } catch (error) {
      console.error('Erro ao configurar sessão offline:', error)
      toast.error(t('dashboard.notifications.setupError'))
    }
  }

  const handleRegenerateTurnSequence = () => {
    setConfirmActionConfig({
      title: t('dashboard.dialogs.reorganizeTitle'),
      description: t('dashboard.dialogs.reorganizeDescription'),
      onConfirm: () => {
        sessionManagement.regenerateTurnSequence()
      },
      variant: 'warning',
    })
    setConfirmActionOpen(true)
  }

  const handleAddFilm = () => {
    setConfirmActionConfig({
      title: t('dashboard.dialogs.addFilmTitle'),
      description: t('dashboard.dialogs.addFilmDescription'),
      onConfirm: () => {
        addFilmColumn(t('dashboard.question.newFilm'))
        toast.success(t('dashboard.notifications.filmAdded'))
      },
      variant: 'info',
    })
    setConfirmActionOpen(true)
  }

  const handleRemoveFilm = (columnId: string, filmName: string) => {
    setConfirmActionConfig({
      title: t('dashboard.dialogs.removeFilmTitle'),
      description: t('dashboard.dialogs.removeFilmDescription', { film: filmName }),
      variant: 'danger',
      onConfirm: () => {
        if (gameMode !== 'demo') {
          saveCheckpoint(releaseActiveTiles(session), t('dashboard.checkpoints.beforeRemoveFilm', { film: filmName }))
        }
        removeFilmColumn(columnId)
        toast.success(t('dashboard.notifications.filmRemoved'))
      },
    })
    setConfirmActionOpen(true)
  }

  const handleAddQuestion = (columnId: string) => {
    addQuestionTile(columnId, {
      points: 10,
      question: t('dashboard.question.newQuestion'),
      answer: '',
    })
    toast.success(t('dashboard.notifications.questionAdded'))
  }

  const handleRemoveQuestion = (columnId: string, tileId: string) => {
    const film = session.board.find((column) => column.id === columnId)?.film ?? t('common:entities.film', { count: 1 })
    setConfirmActionConfig({
      title: t('dashboard.dialogs.removeQuestionTitle'),
      description: t('dashboard.dialogs.removeQuestionDescription', { film }),
      variant: 'danger',
      onConfirm: () => {
        if (gameMode !== 'demo') {
          saveCheckpoint(releaseActiveTiles(session), t('dashboard.checkpoints.beforeRemoveQuestion', { film }))
        }
        removeQuestionTile(columnId, tileId)
        toast.success(t('dashboard.notifications.questionRemoved'))
      },
    })
    setConfirmActionOpen(true)
  }

  const handleCloseMobileSidebar = () => setMobileSidebarOpen(false)

  const handleOpenParticipantDetails = () => {
    if (activeParticipant?.id) {
      setActivePanel('teams')
      setSelectedParticipantId(activeParticipant.id)
      setScoreDetailOpen(true)
      return
    }

    toast.info(t('dashboard.notifications.noActiveParticipant'))
    handleOpenScoreboard()
  }

  const handleOpenInfo = () => {
    setActivePanel('faq')
    handleCloseMobileSidebar()
  }

  const sidebarContent = (
    <>
      <SidebarNavGroup title={t('dashboard.sidebar.game')}>
        <SidebarNavItem
          icon={<ClipboardList size={18} />}
          title={t('dashboard.sidebar.board')}
          description={t('dashboard.sidebar.boardDescription')}
          badge={`${answeredCards}/${totalCards || 0}`}
          active={activePanel === 'board'}
          onClick={() => {
            setActivePanel('board')
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<RefreshCw size={18} />}
          title={t('dashboard.sidebar.nextTurn')}
          description={t('dashboard.sidebar.nextTurnDescription')}
          badge={currentTurnLabel}
          variant="highlight"
          disabled={orderedTeams.length === 0}
          onClick={() => {
            advanceTurn()
            setActivePanel('board')
            handleCloseMobileSidebar()
            toast.success(t('dashboard.notifications.turnAdvanced'))
          }}
        />
        <SidebarNavItem
          icon={<Theater size={18} />}
          title={t('dashboard.sidebar.mimica')}
          description={t('dashboard.sidebar.mimicaDescription')}
          onClick={() => {
            setActivePanel('board')
            setMimicaModalOpen(true)
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<ClipboardList size={18} />}
          title={t('dashboard.sidebar.scoreboard')}
          description={t('dashboard.sidebar.scoreboardDescription')}
          badge={t('common:entities.pointsShort', { count: scoreboard[0]?.points ?? 0 })}
          active={activePanel === 'scoreboard'}
          onClick={() => {
            handleOpenScoreboard()
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<RefreshCw size={14} />}
          title={t('dashboard.sidebar.regenerate')}
          description={t('dashboard.sidebar.regenerateDescription')}
          disabled={orderedTeams.length === 0}
          onClick={() => {
            handleRegenerateTurnSequence()
            handleCloseMobileSidebar()
          }}
        />
      </SidebarNavGroup>

      <SidebarNavGroup title={t('dashboard.sidebar.gameSetup')}>
        <SidebarNavItem
          icon={<RefreshCw size={18} />}
          title={t('dashboard.sidebar.games')}
          description={t('dashboard.sidebar.gamesDescription')}
          badge={sessionStatus.hasActiveSession ? t('dashboard.sidebar.activeBadge') : t('dashboard.sidebar.newBadge')}
          active={activePanel === 'sessions'}
          onClick={() => {
            handleOpenSessions()
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<Palette size={18} />}
          title={t('dashboard.sidebar.theme')}
          description={t('dashboard.sidebar.themeDescription')}
          active={activePanel === 'theme'}
          onClick={() => {
            handleOpenTheme()
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<RotateCcw size={18} />}
          title={t('dashboard.sidebar.reset')}
          description={t('dashboard.sidebar.resetDescription')}
          variant="danger"
          onClick={() => {
            setActivePanel('sessions')
            setResetGameModalOpen(true)
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<Info size={18} />}
          title={t('dashboard.sidebar.onboarding')}
          description={t('dashboard.sidebar.onboardingDescription')}
          onClick={() => {
            handleStartOnboarding()
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<BookOpen size={18} />}
          title={t('dashboard.sidebar.help')}
          description={t('dashboard.sidebar.helpDescription')}
          active={activePanel === 'faq'}
          onClick={handleOpenInfo}
        />
      </SidebarNavGroup>

      <SidebarNavGroup title={t('dashboard.sidebar.content')}>
        <SidebarNavItem
          icon={<BookOpen size={18} />}
          title={t('dashboard.sidebar.library')}
          description={t('dashboard.sidebar.libraryDescription')}
          badge={t('common:entities.film', { count: session.board.length })}
          active={activePanel === 'library'}
          onClick={() => {
            handleShowLibrary()
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<BookOpen size={18} />}
          title={t('dashboard.sidebar.importExport')}
          description={t('dashboard.sidebar.importExportDescription')}
          onClick={() => {
            handleShowLibrary()
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<RotateCcw size={18} />}
          title={t('dashboard.sidebar.roulette')}
          description={t('dashboard.sidebar.rouletteDescription')}
          onClick={() => {
            setActivePanel('board')
            setFilmRouletteOpen(true)
            handleCloseMobileSidebar()
          }}
        />
      </SidebarNavGroup>

      <SidebarNavGroup title={t('dashboard.sidebar.teams')}>
        <SidebarNavItem
          icon={<UsersRound size={18} />}
          title={t('dashboard.sidebar.manageTeams')}
          description={t('dashboard.sidebar.manageTeamsDescription')}
          badge={t('common:entities.team', { count: orderedTeams.length })}
          active={activePanel === 'teams'}
          onClick={() => {
            handleOpenTeams()
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<ClipboardList size={18} />}
          title={t('dashboard.sidebar.orderPreview')}
          description={t('dashboard.sidebar.orderPreviewDescription')}
          disabled={!canOpenTurnPreview}
          onClick={() => {
            setTurnPreviewOpen(true)
            handleCloseMobileSidebar()
          }}
        />
        <SidebarNavItem
          icon={<UserPlus size={18} />}
          title={t('dashboard.sidebar.participantDetails')}
          description={t('dashboard.sidebar.participantDetailsDescription')}
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
    {themeMode === 'brazil' && <BrazilBackground />}
    {themeMode === 'easter' && <EasterBackground />}
    <ControlShell
      sidebarCollapsed={sidebarCollapsed}
      topbar={
        <ControlTopbar
          title={sessionStatus.sessionName ?? session.title}
          mode={gameMode}
          modeLabel={getModeDisplayName(gameMode)}
          syncStatus={gameMode !== 'demo' ? syncStatus : undefined}
          lastSyncedAt={gameMode !== 'demo' ? lastSyncedAt : undefined}
          onForceSync={gameMode !== 'demo' ? handleForceSync : undefined}
          onOpenSessions={handleOpenSessions}
          onExit={() => {
            setActivePanel('board')
            toast.info(t('dashboard.notifications.mainViewRestored'))
          }}
          onToggleSidebar={() => setMobileSidebarOpen(true)}
          onOpenAccount={isSupabaseConfigured() ? () => setAccountOpen(true) : undefined}
        />
      }
      statusStrip={
        <>
          {otherTabOpen && (
            <div
              role="alert"
              className="flex items-center gap-2 border-b border-amber-400/20 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-300"
            >
              <TriangleAlert size={14} className="shrink-0" />
              {t('dashboard.tabWarning')}
            </div>
          )}
          <GameStatusStrip
            activeParticipant={activeParticipant}
            activeTeam={activeTeam}
            nextParticipant={nextParticipant}
            nextTeam={nextTeam}
            currentTurnLabel={currentTurnLabel}
            scoreboard={scoreboard}
            participantIdentities={participantIdentities}
          />
        </>
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--color-muted)]">{t('session.active')}</p>
            <p className="mt-3 text-sm font-semibold text-[var(--color-text)]">
              {sessionStatus.hasActiveSession ? sessionStatus.sessionName : t('session.none')}
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--color-muted)]">
              {sessionStatus.hasActiveSession
                ? t('session.createdAt', {
                    date: new Date(currentSession?.metadata.createdAt ?? session.scheduledAt).toLocaleDateString(i18n.resolvedLanguage),
                    status: syncEnabled ? t('sync.cloud') : t('sync.local'),
                  })
                : t('session.draftLocal')}
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
            title={t('session.configureTitle')}
            description={t('session.configureDescription')}
            action={
              <div className="flex flex-wrap justify-center gap-3">
                {showOnboardingSuggestion ? (
                  <Button onClick={handleStartOnboarding} className="gap-2">
                    <Info size={16} />
                    {t('dashboard.setup.useAssistant')}
                  </Button>
                ) : null}
                <Button variant="outline" onClick={handleOpenTeams} className="gap-2">
                  <UserPlus size={16} />
                  {t('dashboard.setup.manageTeams')}
                </Button>
                {showOnboardingSuggestion ? (
                  <Button variant="ghost" onClick={handleDismissOnboardingSuggestion}>
                    {t('dashboard.setup.dismissSuggestion')}
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
          <Button variant="secondary" size="icon" aria-label={t('dashboard.quickActions.randomQuestion')} onClick={handleRandomQuestion}>
            <Dice5 size={16} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t('dashboard.quickActions.library')}
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
            aria-label={t('dashboard.quickActions.mimica')}
            onClick={() => {
              setActivePanel('board')
              setMimicaModalOpen(true)
            }}
          >
            <Theater size={16} />
          </Button>
          <Button variant="outline" size="icon" aria-label={t('dashboard.quickActions.scoreboard')} onClick={handleOpenScoreboard}>
            <ClipboardList size={16} />
          </Button>
          <Button variant="outline" size="icon" aria-label={t('dashboard.quickActions.sound')} title={t('dashboard.quickActions.sound')} onClick={() => setSoundSettingsOpen(true)}>
            <Volume2 size={16} />
          </Button>
          <Button variant="ghost" size="icon" aria-label={t('dashboard.quickActions.help')} onClick={handleOpenInfo}>
            <Info size={16} />
          </Button>
        </FloatingActionBar>
      </div>

      <Modal
        isOpen={Boolean(selectedTile)}
        title={selectedTile ? `${selectedTile.column.film} · ${t('common:entities.pointsShort', { count: selectedTile.tile.points })}` : ''}
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
                <span className="text-xs text-[var(--color-muted)]">{t('dashboard.question.noTurn')}</span>
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
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">{t('dashboard.question.question')}</p>
                <p className="text-base font-medium leading-relaxed tracking-wide text-[var(--color-text)]">{selectedTile?.tile.question}</p>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setQuestionRevealed(true)}>
                {t('dashboard.question.revealQuestion')}
              </Button>
            )}

            {/* Resposta */}
            {showAnswer ? (
              <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-4 shadow-sm">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-primary)]">{t('dashboard.question.answer')}</p>
                <p className="text-base font-bold leading-relaxed tracking-wide text-[var(--color-text)]">{selectedTile?.tile.answer || t('dashboard.question.noAnswer')}</p>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowAnswer(true)}>
                {t('dashboard.question.revealAnswer')}
              </Button>
            )}
          </div>

          {/* Coluna direita: scoring */}
          <div className="md:w-72 md:max-w-72 md:shrink-0">
            <ScoringControls
              teams={orderedTeams}
              participants={participants}
              activeTeamId={activeTeam?.id ?? null}
              activeParticipantId={activeParticipant?.id ?? null}
              basePoints={selectedTile?.tile.points ?? 0}
              onConfirm={(distributions) => {
                if (!selectedTile || !activeParticipant) {
                  toast.info(t('dashboard.notifications.noScoringContext'))
                  return
                }

                if (distributions.length === 0) {
                  setConfirmActionConfig({
                    title: t('dashboard.dialogs.voidQuestionTitle'),
                    description: t('dashboard.dialogs.voidQuestionDescription', {
                      question: selectedTile.tile.question,
                      film: selectedTile.column.film,
                    }),
                    onConfirm: () => {
                      // Anula a carta E registra um evento 'trivia-void' no log,
                      // para a ação ficar auditável (a vez é consumida).
                      voidQuestion(
                        selectedTile.tile.id,
                        activeParticipant.id,
                        activeParticipant.teamId ?? activeTeam?.id ?? '',
                      )
                      playSound('wrong')
                      const message = t('dashboard.notifications.questionVoided', { film: selectedTile.column.film })
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
                  title: t('dashboard.dialogs.confirmScoreTitle'),
                  description: t('dashboard.dialogs.confirmScoreDescription', {
                    points: t('common:entities.point', { count: totalPoints }),
                    teams: t('common:entities.team', { count: teamsAffected }),
                  }),
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

                      const recipient = participant ? `${participant.name} (${team?.name})` : team?.name ?? t('dashboard.question.teamFallback')
                      message += `${t('dashboard.notifications.pointsAwarded', {
                        points: t('common:entities.point', { count: distribution.points }),
                        recipient,
                      })}\n`
                    })

                    playSound('correct')
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
        title={t('dashboard.scoreboard.title')}
        description={t('dashboard.scoreboard.description')}
        onClose={() => {
          setScoreboardOpen(false)
          setActivePanel('board')
        }}
      >
        <div className="space-y-3">
          {scoreboard.map(({ team, position, points }) => {
            const isExpanded = scoreboardAccordions[`scoreboard-${team.id}`]
            
            const participantScores = buildParticipantScoreBreakdown(
              team,
              participants,
              session.board,
              session.mimicaScores,
            )
            
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
                      {t('dashboard.scoreboard.position', { position })}
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-text)]">{team.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--color-text)]">{t('common:entities.pointsShort', { count: points })}</span>
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
                        <div key={participant.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-background)]">
                          <ParticipantAvatar
                            name={participant.name}
                            src={participantIdentities[participant.id]?.avatarUrl}
                            size={32}
                          />
                          <div className="flex-1">
                            <span className="text-xs font-medium text-[var(--color-muted)]">
                              {participant.name}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-[var(--color-muted)]">
                                {t('dashboard.scoreboard.triviaPoints', { points: t('common:entities.pointsShort', { count: triviaPoints }) })}
                              </span>
                              {mimicaPoints > 0 && (
                                <span className="text-xs text-[var(--color-muted)]">
                                  · {t('dashboard.scoreboard.mimicaPoints', { points: t('common:entities.pointsShort', { count: mimicaPoints }) })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--color-text)]">
                              {t('common:entities.pointsShort', { count: individualPoints })}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedParticipantId(participant.id)
                                setScoreDetailOpen(true)
                              }}
                              className="text-xs"
                            >
                              {t('dashboard.scoreboard.details')}
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
        previewTeams={teamManagement.previewTeams}
        previewParticipants={teamManagement.previewParticipants}
        previewTurnSequence={teamManagement.previewTurnSequence}
        previewQuestionCount={teamManagement.previewQuestionCount}
        onSave={() => {
          if (
            gameMode !== 'demo' &&
            orderedTeams.length > 0 &&
            hasRosterChanges(
              orderedTeams,
              participants,
              teamManagement.previewTeams,
              teamManagement.previewParticipants,
            )
          ) {
            saveCheckpoint(
              releaseActiveTiles(session),
              t('dashboard.checkpoints.beforeRosterChange'),
            )
          }
          teamManagement.saveTeams()
          setTeamsModalOpen(false)
          setActivePanel('board')
        }}
        onReplaceDrafts={teamManagement.replaceTeamDrafts}
        canRandomizeRoster={canDrawTeamsBeforePlay(session)}
        connectedFeaturesEnabled={connectedGameFeaturesEnabled}
        canInviteLivePlayers={connectedGameFeaturesEnabled}
        hasUnsavedLiveRosterChanges={hasRosterChanges(
          orderedTeams,
          participants,
          teamManagement.previewTeams,
          teamManagement.previewParticipants,
        )}
        sessionClientId={session.id}
        onPrepareLiveInvite={prepareLiveInvite}
        participantIdentities={participantIdentities}
      />

      <Modal
        isOpen={pinModalOpen}
        title={t('dashboard.pin.title')}
        description={t('dashboard.pin.description')}
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
            placeholder={t('dashboard.pin.placeholder')}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm"
          />
          {pinError ? <p className="text-sm text-[var(--color-danger)]">{pinError}</p> : null}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={confirmPin}>
              {t('common:actions.confirm')}
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
              {t('common:actions.cancel')}
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
          // Filme com o mesmo nome é ATUALIZADO (perguntas/pontos substituídos);
          // só nomes novos viram colunas novas — re-importar não duplica.
          if (gameMode !== 'demo' && session.board.length > 0) {
            saveCheckpoint(releaseActiveTiles(session), t('dashboard.checkpoints.beforeImport'))
          }
          const plan = planImport(session.board, importData)
          plan.updates.forEach(({ columnId, tiles }) => {
            replaceColumnTiles(columnId, tiles)
          })
          plan.additions.forEach(({ film, tiles }) => {
            const columnId = addFilmColumn(film)
            tiles.forEach((tile) => {
              addQuestionTile(columnId, {
                points: tile.points,
                question: tile.question,
                answer: tile.answer,
              })
            })
          })
          const parts: string[] = []
          if (plan.additions.length) parts.push(t('dashboard.import.added', { count: plan.additions.length }))
          if (plan.updates.length) parts.push(t('dashboard.import.updated', { count: plan.updates.length }))
          if (parts.length === 0) {
            toast.info(t('dashboard.notifications.importNoChanges'))
          } else {
            const summary = parts.length === 2
              ? t('dashboard.import.join', { first: parts[0], second: parts[1] })
              : parts[0]
            toast.success(t('dashboard.notifications.importComplete', { summary }))
          }
        }}
      />

      <Modal
        isOpen={themeModalOpen}
        title={t('dashboard.theme.title')}
        description={t('dashboard.theme.description')}
        onClose={() => {
          setThemeModalOpen(false)
          setActivePanel('board')
        }}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              { id: 'light', label: t('game:onboarding.themes.light.name'), description: t('game:onboarding.themes.light.description') },
              { id: 'dark', label: t('game:onboarding.themes.dark.name'), description: t('game:onboarding.themes.dark.description') },
              { id: 'cinema', label: t('game:onboarding.themes.cinema.name'), description: t('game:onboarding.themes.cinema.description') },
              { id: 'retro', label: t('game:onboarding.themes.retro.name'), description: t('game:onboarding.themes.retro.description') },
              { id: 'matrix', label: t('game:onboarding.themes.matrix.name'), description: t('game:onboarding.themes.matrix.description') },
              { id: 'brazil', label: t('game:onboarding.themes.brazil.name'), description: t('game:onboarding.themes.brazil.description') },
              { id: 'easter', label: t('game:onboarding.themes.easter.name'), description: t('game:onboarding.themes.easter.description') },
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
              <span className="text-xs text-[var(--color-muted)]">{option.description}</span>
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
        triviaActiveParticipantId={session.activeParticipantId}
        triviaActiveTurnIndex={session.activeTurnIndex}
        participantIdentities={participantIdentities}
        onScore={(participantId, mode, targetTeamId, points, turnNumber, roundNumber) => {
          let message = ''
          
          try {
            const mimicaParticipant = participants.find(participant => participant.id === participantId)
            const mimicaTeam = orderedTeams.find(team => team.id === mimicaParticipant?.teamId)
            if (!mimicaParticipant || !mimicaTeam) {
              toast.error(t('dashboard.notifications.noMimicaParticipant'))
              return
            }

            let teamId = mimicaTeam.id

            switch (mode) {
              case 'full-current':
                if (mimicaTeam) {
                  teamId = mimicaTeam.id
                  awardMimicaPoints(participantId, teamId, points, turnNumber, roundNumber, mode)
                  message = t('dashboard.notifications.mimicaPoints', {
                    points: t('common:entities.point', { count: points }),
                    team: mimicaTeam.name,
                  })
                }
                break
              case 'half-current':
                if (mimicaTeam) {
                  teamId = mimicaTeam.id
                  awardMimicaPoints(participantId, teamId, points, turnNumber, roundNumber, mode)
                  message = t('dashboard.notifications.mimicaPoints', {
                    points: t('common:entities.point', { count: points }),
                    team: mimicaTeam.name,
                  })
                }
                break
              case 'steal':
                if (targetTeamId) {
                  const targetTeam = orderedTeams.find((team) => team.id === targetTeamId)
                  if (targetTeam) {
                    teamId = targetTeamId
                    awardMimicaPoints(participantId, teamId, points, turnNumber, roundNumber, mode, targetTeamId)
                    message = t('dashboard.notifications.mimicaTransferred', {
                      points: t('common:entities.point', { count: points }),
                      team: targetTeam.name,
                    })
                  }
                }
                break
              case 'everyone': {
                const pointsPerTeam = points
                orderedTeams.forEach((team) => {
                  awardMimicaPoints(participantId, team.id, pointsPerTeam, turnNumber, roundNumber, mode)
                })
                message = t('dashboard.notifications.mimicaEveryone', {
                  points: t('common:entities.point', { count: pointsPerTeam }),
                })
                break
              }
              case 'void':
                if (mimicaTeam) {
                  teamId = mimicaTeam.id
                  awardMimicaPoints(participantId, teamId, 0, turnNumber, roundNumber, mode)
                }
                message = t('dashboard.notifications.mimicaVoid')
                break
            }
            
            toast.success(message)
          } catch (error) {
            console.error('Erro ao adicionar pontos da mímica:', error)
            toast.error(t('dashboard.notifications.mimicaError'))
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

      <Modal
        isOpen={turnPreviewOpen}
        title={t('dashboard.turnPreview.title')}
        description={t('dashboard.turnPreview.description')}
        onClose={() => setTurnPreviewOpen(false)}
        size="xl"
      >
        <TurnOrderPreview
          teams={orderedTeams}
          participants={participants}
          turnSequence={session.turnSequence}
          activeTurnIndex={session.activeTurnIndex}
          maxGroups={Number.MAX_SAFE_INTEGER}
          title={t('dashboard.turnPreview.sequenceTitle')}
          description={t('dashboard.turnPreview.sequenceDescription')}
          onReorganize={() => {
            setTurnPreviewOpen(false)
            handleRegenerateTurnSequence()
          }}
        />
      </Modal>

      <ConflictResolutionModal
        isOpen={sessionConflict !== null}
        conflict={sessionConflict}
        onChoose={handleConflictChoice}
      />

      <VersionHistoryModal
        isOpen={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        snapshots={snapshots}
        loading={snapshotsLoading}
        onRestore={handleRestoreVersion}
        checkpoints={checkpoints}
        onRestoreCheckpoint={handleRestoreCheckpoint}
        cloudAvailable={syncEnabled}
      />

      <SoundSettingsModal
        isOpen={soundSettingsOpen}
        onClose={() => setSoundSettingsOpen(false)}
      />

      <SessionManager
        isOpen={sessionManagerOpen}
        onClose={() => {
          setSessionManagerOpen(false)
          setActivePanel('board')
        }}
        cloudStatus={gameMode !== 'demo' ? syncStatus : undefined}
        cloudLastSyncedAt={gameMode !== 'demo' ? lastSyncedAt : undefined}
        onOpenVersions={gameMode !== 'demo' ? () => setVersionsOpen(true) : undefined}
        onOpenAccount={isSupabaseConfigured() ? () => setAccountOpen(true) : undefined}
        onLoadSession={handleLoadSession}
        onNewSession={() => {
          // Mostra modal de confirmação antes de limpar tudo
          setConfirmActionConfig({
            title: t('dashboard.dialogs.newGameTitle'),
            description: t('dashboard.dialogs.newGameDescription'),
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

      {/* Overlay da conta — mesmo padrão da LandingPage */}
      {isSupabaseConfigured() && accountOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setAccountOpen(false) }}
        >
          <AuthPanel onClose={() => setAccountOpen(false)} />
        </div>
      )}
    </ControlShell>
    </>
  )
}
