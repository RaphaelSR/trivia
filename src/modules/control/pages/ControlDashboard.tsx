import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ClipboardList,
  Dice5,
  Eye,
  Info,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
  UserPlus,
  UsersRound,
  Theater,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/Button'
import { FilmRoulette } from '../../../components/ui/FilmRoulette'
import { InfoModal } from '../../../components/ui/InfoModal'
import { MimicaModal } from '../../../components/ui/MimicaModal'
import { Modal } from '../../../components/ui/Modal'
import { Navbar } from '../../../components/ui/Navbar'
import { TeamBadge } from '../../../components/ui/TeamBadge'
import { Timer } from '../../../components/ui/Timer'
import { TriviaBoard } from '../../../components/ui/TriviaBoard'
import type { TriviaColumn, TriviaParticipant, TriviaQuestionTile, TriviaTeam } from '../../trivia/types'
import { useTriviaSession } from '../../trivia/hooks/useTriviaSession'
import { useThemeMode } from '../../../app/providers/useThemeMode'
import { useGameMode } from '../../../hooks/useGameMode'
import { usePinManagement } from '../../../hooks/usePinManagement'
import { useOfflineSession } from '../../../hooks/useOfflineSession'
import { createAlternatingTurnSequence } from '../../trivia/utils/createAlternatingTurnSequence'
import { OfflineOnboardingModal } from '../../../components/ui/OfflineOnboardingModal'
import { SessionManager } from '../../../components/ui/SessionManager'
import { ResetGameModal } from '../../../components/ui/ResetGameModal'
import { GameEndModal } from '../../../components/ui/GameEndModal'
import { QuestionImportModal, type ParsedImport } from '../../../components/ui/QuestionImportModal'

type ParticipantDraft = {
  id: string
  name: string
  role: TriviaParticipant['role']
}

type TeamDraft = {
  id: string
  name: string
  color: string
  members: ParticipantDraft[]
}

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
    advanceTurn,
  } = useTriviaSession()
  const { theme: themeMode, setTheme } = useThemeMode()
  const { gameMode, getModeDisplayName, getModeDescription } = useGameMode()
  const { verifyPin, saveCustomPin } = usePinManagement()
  const { saveSession, loadSession } = useOfflineSession()

  const [selectedIds, setSelectedIds] = useState<{ tileId: string; columnId: string } | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [scoreboardOpen, setScoreboardOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [libraryUnlocked, setLibraryUnlocked] = useState(false)
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [themeModalOpen, setThemeModalOpen] = useState(false)
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({})
  const [teamsModalOpen, setTeamsModalOpen] = useState(false)
  const [teamDrafts, setTeamDrafts] = useState<TeamDraft[]>([])
  const [mimicaModalOpen, setMimicaModalOpen] = useState(false)
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [filmRouletteOpen, setFilmRouletteOpen] = useState(false)
  const [offlineOnboardingOpen, setOfflineOnboardingOpen] = useState(false)
  const [showOnboardingSuggestion, setShowOnboardingSuggestion] = useState(false)
  const [sessionManagerOpen, setSessionManagerOpen] = useState(false)
  const [resetGameModalOpen, setResetGameModalOpen] = useState(false)
  const [gameEndModalOpen, setGameEndModalOpen] = useState(false)
  const [gameEndNotified, setGameEndNotified] = useState(false)
  const [questionImportOpen, setQuestionImportOpen] = useState(false)

  const createTeamId = () => `team-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
  const createParticipantId = () =>
    `participant-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`

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
    const totalTiles = session.board.reduce((acc, column) => acc + column.tiles.length, 0)
    const answeredTiles = session.board.reduce(
      (acc, column) => acc + column.tiles.filter((tile) => tile.state === 'answered').length,
      0
    )
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

  useEffect(() => {
    setOpenAccordions((prev) => {
      const next: Record<string, boolean> = {}
      session.board.forEach((column) => {
        next[column.id] = prev[column.id] ?? false
      })
      return next
    })
  }, [session.board])

  useEffect(() => {
    if (libraryOpen) {
      setOpenAccordions(() => {
        const next: Record<string, boolean> = {}
        session.board.forEach((column) => {
          next[column.id] = true
        })
        return next
      })
    }
  }, [libraryOpen, session.board])

  // Fecha onboarding se mudar de modo
  useEffect(() => {
    if (gameMode !== 'offline') {
      setOfflineOnboardingOpen(false)
      setShowOnboardingSuggestion(false)
    }
  }, [gameMode])

  // Mostra sugestão de onboarding de forma não forçada
  useEffect(() => {
    if (gameMode === 'offline' && orderedTeams.length === 0 && !showOnboardingSuggestion) {
      // Aguarda 2 segundos antes de mostrar a sugestão
      const timer = setTimeout(() => {
        setShowOnboardingSuggestion(true)
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [gameMode, orderedTeams.length, showOnboardingSuggestion])

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
  }, [isGameFinished, gameEndNotified])

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
  }, [isGameFinished, gameEndModalOpen, gameEndNotified])

  useEffect(() => {
    if (!teamsModalOpen) {
      return
    }
    const drafts: TeamDraft[] = orderedTeams.map((team) => ({
      id: team.id,
      name: team.name,
      color: team.color,
      members: team.members.map((memberId) => {
        const participant = participants.find((p) => p.id === memberId)
        return {
          id: participant?.id ?? memberId,
          name: participant?.name ?? 'Participante',
          role: participant?.role ?? 'player',
        }
      }),
    }))
    setTeamDrafts(drafts)
  }, [teamsModalOpen, orderedTeams, participants])

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
    const random = availableTiles[Math.floor(Math.random() * availableTiles.length)]
    handleSelectTile(random.tile, random.column)
    toast.success('Pergunta sorteada!')
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
    try {
      const loadedSession = loadSession(sessionId);
      if (loadedSession) {
        // Atualiza a sessão atual com os dados carregados
        updateTeamsAndParticipants(
          loadedSession.teams,
          loadedSession.participants,
          loadedSession.turnSequence
        );
        
        // Atualiza o board se existir
        if (loadedSession.board && loadedSession.board.length > 0) {
          // Aqui você precisaria de uma função para atualizar o board
          // Por enquanto, vamos apenas mostrar um toast
          toast.success('Sessão carregada com sucesso!');
        }
        
        toast.success(`Sessão "${loadedSession.title}" carregada!`);
      } else {
        toast.error('Erro ao carregar sessão');
      }
    } catch (error) {
      console.error('Erro ao carregar sessão:', error);
      toast.error('Erro ao carregar sessão');
    }
  };

  const handleResetGame = (options: {
    teams: boolean;
    participants: boolean;
    questions: boolean;
    themes: boolean;
    points: boolean;
    films: boolean;
  }) => {
    try {
      // Reset pontos
      if (options.points) {
        const resetTeams = orderedTeams.map((team) => ({
          ...team,
          score: 0,
        }));
        updateTeamsAndParticipants(resetTeams, participants, session.turnSequence);
      }

      // Reset perguntas (remove todas as perguntas mas mantém os filmes/colunas)
      if (options.questions) {
        session.board.forEach((column) => {
          // Remove todas as tiles da coluna
          const tilesToRemove = [...column.tiles];
          tilesToRemove.forEach((tile) => {
            removeQuestionTile(column.id, tile.id);
          });
        });
        setGameEndNotified(false);
      }

      // Reset filmes/colunas (remove todos os filmes customizados)
      if (options.films) {
        // Remove todas as colunas do board
        const columnsToRemove = [...session.board];
        columnsToRemove.forEach((column) => {
          removeFilmColumn(column.id);
        });
        
        // Limpa também o localStorage global de filmes
        localStorage.removeItem('trivia-custom-films');
        setGameEndNotified(false);
      }

      // Reset tema
      if (options.themes) {
        setTheme('light');
      }

      // Reset times e participantes (limpa tudo)
      if (options.teams || options.participants) {
        updateTeamsAndParticipants([], [], []);
      }

      const resetItems = [];
      if (options.points) resetItems.push('pontos');
      if (options.questions) resetItems.push('perguntas');
      if (options.films) resetItems.push('filmes');
      if (options.themes) resetItems.push('tema');
      if (options.teams) resetItems.push('times');
      if (options.participants) resetItems.push('participantes');

      toast.success(`Jogo resetado: ${resetItems.join(', ')}`);
    } catch (error) {
      console.error('Erro ao resetar jogo:', error);
      toast.error('Erro ao resetar o jogo');
    }
  };

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
      console.log('Aplicando tema após onboarding:', config.theme); // Debug
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
      
      // Cria sequência alternada de turnos (um de cada time por rodada)
      const turnSequence = createAlternatingTurnSequence(newTeams)
      
      // Debug: log da sequência criada
      console.group('[🎯 ONBOARDING] Criando sessão')
      console.log('Times criados:', newTeams.map(t => ({ 
        id: t.id,
        name: t.name,
        color: t.color,
        membersIds: t.members,
        membersNames: t.members.map(m => newParticipants.find(p => p.id === m)?.name) 
      })))
      console.log('Participantes criados:', newParticipants.map(p => ({
        id: p.id,
        name: p.name,
        teamId: p.teamId,
        teamName: newTeams.find(t => t.id === p.teamId)?.name
      })))
      console.log('Sequência de turnos (FINAL):', turnSequence.map((id, index) => {
        const p = newParticipants.find(p => p.id === id)
        const t = newTeams.find(t => t.id === p?.teamId)
        return `${index + 1}. ${p?.name} (${t?.name})`
      }))
      console.groupEnd()
      
      // Atualiza a sessão com os novos dados
      updateTeamsAndParticipants(newTeams, newParticipants, turnSequence)
      
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
    if (orderedTeams.length === 0) {
      toast.warning('Nenhum time configurado')
      return
    }
    
    // Ordena os times por ordem
    const sortedTeams = [...orderedTeams].sort((a, b) => a.order - b.order)
    
    // Cria nova sequência alternada de turnos
    const newTurnSequence = createAlternatingTurnSequence(sortedTeams)
    
    // Debug: log da sequência regenerada
    console.group('[🔄 REGENERANDO SEQUÊNCIA EXISTENTE]')
    console.log('Times ordenados:', sortedTeams.map(t => ({ 
      name: t.name, 
      order: t.order,
      members: t.members 
    })))
    console.log('Nova sequência:', newTurnSequence.map((id, index) => {
      const p = participants.find(p => p.id === id)
      const t = sortedTeams.find(t => t.id === p?.teamId)
      return `${index + 1}. ${p?.name} (${t?.name})`
    }))
    console.groupEnd()
    
    // Atualiza apenas a sequência de turnos
    updateTeamsAndParticipants(orderedTeams, participants, newTurnSequence)
    toast.success('Sequência de turnos regenerada')
  }

  const handleQuestionImport = (imports: ParsedImport[]) => {
    try {
      let totalImported = 0
      
      imports.forEach((imp) => {
        imp.questions.forEach((q) => {
          const tileId = `${imp.columnId}-${q.points}-${Date.now()}-${Math.random().toString(16).slice(2)}`
          
          addQuestionTile(imp.columnId, {
            id: tileId,
            film: imp.filmName,
            points: q.points,
            question: q.question,
            answer: q.answer,
            state: 'available' as const,
          })
          
          totalImported++
        })
      })
      
      if (gameMode === 'offline') {
        saveSession(session)
      }
      
      console.log(`[✅ IMPORT] ${totalImported} perguntas importadas para ${imports.length} filmes`)
      toast.success(`${totalImported} perguntas importadas com sucesso!`)
    } catch (error) {
      console.error('Erro ao importar perguntas:', error)
      toast.error('Erro ao importar perguntas')
    }
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
      id: 'import',
      icon: <Upload size={18} />,
      label: 'Importar Perguntas',
      description: 'Importa perguntas em lote de texto formatado',
      onClick: () => setQuestionImportOpen(true),
      disabled: session.board.length === 0,
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

  const handleToggleAccordion = (columnId: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }))
  }

  const handleAddFilm = () => {
    const newId = addFilmColumn('Novo Filme')
    setOpenAccordions((prev) => ({
      ...prev,
      [newId]: true,
    }))
  }

  const handleRemoveFilm = (columnId: string, filmName: string) => {
    if (window.confirm(`Remover o filme "${filmName}" e todas as suas perguntas?`)) {
      removeFilmColumn(columnId)
      setOpenAccordions((prev) => {
        const next = { ...prev }
        delete next[columnId]
        return next
      })
      toast.success('Filme removido da biblioteca')
    }
  }

  const handleAddQuestion = (columnId: string) => {
    addQuestionTile(columnId, {
      points: 10,
      question: 'Nova pergunta',
      answer: '',
    })
    setOpenAccordions((prev) => ({
      ...prev,
      [columnId]: true,
    }))
    toast.success('Pergunta adicionada')
  }

  const handleRemoveQuestion = (columnId: string, tileId: string) => {
    if (window.confirm('Remover esta pergunta?')) {
      removeQuestionTile(columnId, tileId)
      toast.success('Pergunta removida')
    }
  }

  const handleAddTeamDraft = () => {
    const newTeamId = createTeamId()
    setTeamDrafts((prev) => [
      ...prev,
      {
        id: newTeamId,
        name: `Novo time ${prev.length + 1}`,
        color: 'var(--color-primary)',
        members: [
          {
            id: createParticipantId(),
            name: 'Participante',
            role: 'player',
          },
        ],
      },
    ])
  }

  const handleRemoveTeamDraft = (teamId: string) => {
    if (window.confirm('Remover este time e os participantes associados?')) {
      setTeamDrafts((prev) => prev.filter((team) => team.id !== teamId))
      toast.success('Time removido')
    }
  }

  const handleUpdateTeamDraft = (teamId: string, updates: Partial<Omit<TeamDraft, 'id' | 'members'>>) => {
    setTeamDrafts((prev) =>
      prev.map((team) => (team.id === teamId ? { ...team, ...updates } : team)),
    )
  }

  const handleMoveTeamDraft = (teamId: string, direction: -1 | 1) => {
    setTeamDrafts((prev) => {
      const index = prev.findIndex((team) => team.id === teamId)
      if (index === -1) return prev
      const newIndex = index + direction
      if (newIndex < 0 || newIndex >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(index, 1)
      next.splice(newIndex, 0, moved)
      return next
    })
  }

  const handleAddParticipantDraft = (teamId: string) => {
    setTeamDrafts((prev) =>
      prev.map((team) =>
        team.id === teamId
          ? {
              ...team,
              members: [
                ...team.members,
                { id: createParticipantId(), name: 'Participante', role: 'player' },
              ],
            }
          : team,
      ),
    )
  }

  const handleRemoveParticipantDraft = (teamId: string, participantId: string) => {
    setTeamDrafts((prev) =>
      prev.map((team) =>
        team.id === teamId
          ? {
              ...team,
              members: team.members.filter((member) => member.id !== participantId),
            }
          : team,
      ),
    )
  }

  const handleUpdateParticipantDraft = (
    teamId: string,
    participantId: string,
    updates: Partial<ParticipantDraft>,
  ) => {
    setTeamDrafts((prev) =>
      prev.map((team) =>
        team.id === teamId
          ? {
              ...team,
              members: team.members.map((member) =>
                member.id === participantId ? { ...member, ...updates } : member,
              ),
            }
          : team,
      ),
    )
  }

  const handleMoveParticipantDraft = (teamId: string, participantId: string, direction: -1 | 1) => {
    setTeamDrafts((prev) =>
      prev.map((team) => {
        if (team.id !== teamId) return team
        const index = team.members.findIndex((member) => member.id === participantId)
        if (index === -1) return team
        const newIndex = index + direction
        if (newIndex < 0 || newIndex >= team.members.length) return team
        const members = [...team.members]
        const [moved] = members.splice(index, 1)
        members.splice(newIndex, 0, moved)
        return {
          ...team,
          members,
        }
      }),
    )
  }

  const canSaveTeams = useMemo(() => {
    if (!teamDrafts.length) return false
    return teamDrafts.every((team) => team.name.trim() && team.members.length > 0 && team.members.every((member) => member.name.trim()))
  }, [teamDrafts])

  const handleSaveTeams = () => {
    const newTeams: TriviaTeam[] = teamDrafts.map((team, index) => ({
      id: team.id,
      name: team.name.trim() || `Time ${index + 1}`,
      color: team.color || 'var(--color-primary)',
      order: index,
      members: team.members.map((member) => member.id),
      score: orderedTeams.find((t) => t.id === team.id)?.score || 0
    }))

    const newParticipants: TriviaParticipant[] = teamDrafts.flatMap((team) =>
      team.members.map((member) => ({
        id: member.id,
        name: member.name.trim() || 'Participante',
        role: member.role,
        teamId: team.id,
      })),
    )

    // Ordena os times por ordem antes de criar a sequência
    const sortedTeams = [...newTeams].sort((a, b) => a.order - b.order)
    
    // Cria sequência alternada de turnos (um de cada time por rodada)
    const newTurnSequence = createAlternatingTurnSequence(sortedTeams)

    // Debug: log da sequência criada
    console.group('[🔄 REGENERANDO SEQUÊNCIA]')
    console.log('Times ordenados:', sortedTeams.map(t => ({ 
      name: t.name, 
      order: t.order,
      members: t.members 
    })))
    console.log('Nova sequência:', newTurnSequence.map((id, index) => {
      const p = newParticipants.find(p => p.id === id)
      const t = sortedTeams.find(t => t.id === p?.teamId)
      return `${index + 1}. ${p?.name} (${t?.name})`
    }))
    console.groupEnd()

    updateTeamsAndParticipants(newTeams, newParticipants, newTurnSequence)
    setTeamsModalOpen(false)
    toast.success('Times atualizados e sequência regenerada')
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
              {session.board.length} temas · {session.board.reduce((acc, column) => acc + column.tiles.length, 0)} cartas
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
          <ScoringControlsFlexible
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
              
              let message = ''
              
              if (distributions.length === 0) {
                // Anular pergunta
                  message = `${selectedTile.column.film}: pergunta anulada (sem pontuação)`
                toast.success(message)
                return
              }
              
              // Aplicar distribuições
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
              
              // Avança para o próximo turno
              advanceTurn()
              
              // Salva a sessão após pontuar (modo offline)
              if (gameMode === 'offline') {
                saveSession(session)
              }
              
              setSelectedIds(null)
              setShowAnswer(false)
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
            const isExpanded = openAccordions[`scoreboard-${team.id}`]
            
            // Calcula pontuação de cada participante do time
            const participantScores = team.members.map((memberId) => {
              const participant = participants.find((p) => p.id === memberId)
              // Soma todos os pontos das perguntas respondidas por este participante
              const individualPoints = session.board
                .flatMap((column) => column.tiles)
                .filter((tile) => tile.answeredBy?.participantId === memberId)
                .reduce((sum, tile) => sum + (tile.answeredBy?.pointsAwarded || 0), 0)
              
              return {
                participant,
                points: individualPoints
              }
            }).filter((p) => p.participant) // Remove participantes não encontrados
            
            return (
              <div key={team.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] overflow-hidden">
                <button
                  onClick={() => setOpenAccordions((prev) => ({
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
                      {participantScores.map(({ participant, points: individualPoints }) => (
                        <div key={participant?.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-background)]">
                          <span className="text-xs font-medium text-[var(--color-muted)]">
                            {participant?.name}
                          </span>
                          <span className="text-xs font-semibold text-[var(--color-text)]">
                            {individualPoints} pts
                          </span>
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

      <Modal
        isOpen={teamsModalOpen}
        title="Gestão de times"
        description="Ajuste nomes, participantes e ordem de turno das equipes."
        onClose={() => setTeamsModalOpen(false)}
      >
        <div className="flex items-center justify-between pb-4">
          <p className="text-sm text-[var(--color-muted)]">Organize os times e defina a rotação dos jogadores.</p>
          <Button variant="outline" size="sm" onClick={handleAddTeamDraft}>
            <Plus size={14} /> Adicionar time
          </Button>
        </div>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {teamDrafts.map((team, index) => (
            <div key={team.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
                    Time {index + 1}
                  </span>
                  <input
                    value={team.name}
                    onChange={(event) => handleUpdateTeamDraft(team.id, { name: event.target.value })}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
                  />
                  <input
                    type="color"
                    value={team.color}
                    onChange={(event) => handleUpdateTeamDraft(team.id, { color: event.target.value })}
                    className="h-9 w-12 cursor-pointer rounded-md border border-[var(--color-border)] bg-[var(--color-background)]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveTeamDraft(team.id, -1)}
                    disabled={index === 0}
                    aria-label="Mover time para cima"
                  >
                    <ArrowUp size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveTeamDraft(team.id, 1)}
                    disabled={index === teamDrafts.length - 1}
                    aria-label="Mover time para baixo"
                  >
                    <ArrowDown size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveTeamDraft(team.id)}
                    aria-label="Remover time"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              <div className="space-y-3 px-4 pb-4">
                {team.members.map((member, memberIndex) => (
                  <div key={member.id} className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <input
                        value={member.name}
                        onChange={(event) =>
                          handleUpdateParticipantDraft(team.id, member.id, { name: event.target.value })
                        }
                        className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
                      />
                      <select
                        value={member.role}
                        onChange={(event) =>
                          handleUpdateParticipantDraft(team.id, member.id, {
                            role: event.target.value as TriviaParticipant['role'],
                          })
                        }
                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-2 text-sm text-[var(--color-text)]"
                      >
                        <option value="host">Anfitrião</option>
                        <option value="assistant">Assistente</option>
                        <option value="player">Jogador</option>
                      </select>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveParticipantDraft(team.id, member.id, -1)}
                          disabled={memberIndex === 0}
                          aria-label="Mover participante para cima"
                        >
                          <ArrowUp size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveParticipantDraft(team.id, member.id, 1)}
                          disabled={memberIndex === team.members.length - 1}
                          aria-label="Mover participante para baixo"
                        >
                          <ArrowDown size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveParticipantDraft(team.id, member.id)}
                          aria-label="Remover participante"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => handleAddParticipantDraft(team.id)}>
                  <UserPlus size={14} /> Adicionar participante
                </Button>
              </div>
            </div>
          ))}
          {!teamDrafts.length ? (
            <p className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-4 py-10 text-center text-sm text-[var(--color-muted)]">
              Nenhum time cadastrado. Adicione um novo time para começar.
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" disabled={!canSaveTeams} onClick={handleSaveTeams}>
            Salvar alterações
          </Button>
          <Button variant="outline" onClick={() => setTeamsModalOpen(false)}>
            Fechar
          </Button>
        </div>
      </Modal>

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

      <Modal
        isOpen={libraryOpen}
        title="Biblioteca de perguntas"
        description="Edite perguntas e respostas diretamente na sessão."
        onClose={() => setLibraryOpen(false)}
      >
        <div className="flex items-center justify-between pb-4">
          <p className="text-sm text-[var(--color-muted)]">
            Gerencie filmes, perguntas e respostas do tabuleiro.
          </p>
          <Button variant="outline" size="sm" onClick={handleAddFilm}>
            <Plus size={14} /> Adicionar filme
          </Button>
        </div>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {session.board.map((column) => {
            const open = openAccordions[column.id] ?? false
            const pointSummary = column.tiles.reduce<Record<number, number>>((acc, tile) => {
              acc[tile.points] = (acc[tile.points] ?? 0) + 1
              return acc
            }, {})
            return (
              <div key={column.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]"
                  onClick={() => handleToggleAccordion(column.id)}
                >
                  <span>{column.film}</span>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
                    <span>
                      {column.tiles.length} perguntas
                    </span>
                    <span className="uppercase tracking-[0.3em]">{open ? 'recolher' : 'expandir'}</span>
                  </div>
                </button>
                {open ? (
                  <div className="space-y-4 px-4 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="flex flex-1 flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
                        Nome do filme
                        <input
                          value={column.film}
                          onChange={(event) => updateColumnTitle(column.id, event.target.value)}
                          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
                        />
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {Object.entries(pointSummary).map(([points, count]) => (
                          <span
                            key={`${column.id}-${points}`}
                            className="rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1 text-xs text-[var(--color-muted)]"
                          >
                            {points} pts · {count}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleAddQuestion(column.id)}>
                          <Plus size={14} /> Pergunta
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFilm(column.id, column.film)}
                        >
                          <Trash2 size={14} /> Remover filme
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[...column.tiles].sort((a, b) => a.points - b.points).map((tile) => (
                        <div key={tile.id} className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
                              Pontos
                              <input
                                type="number"
                                min={0}
                                step={5}
                                value={tile.points}
                                onChange={(event) =>
                                  updateTileContent(tile.id, { points: Number(event.target.value) })
                                }
                                className="w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm text-[var(--color-text)]"
                              />
                            </label>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveQuestion(column.id, tile.id)}
                              aria-label="Remover pergunta"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                          <textarea
                            value={tile.question}
                            onChange={(event) =>
                              updateTileContent(tile.id, { question: event.target.value })
                            }
                            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
                            rows={2}
                          />
                          <textarea
                            value={tile.answer}
                            onChange={(event) =>
                              updateTileContent(tile.id, { answer: event.target.value })
                            }
                            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
                            rows={2}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => setLibraryOpen(false)}>
            Fechar
          </Button>
        </div>
      </Modal>

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
        onScore={(mode, targetTeamId, points) => {
          let message = ''
          switch (mode) {
            case 'full-current':
              message = `Mímica: ${points} pontos para ${activeTeam?.name ?? 'time da vez'}`
              break
            case 'half-current':
              message = `Mímica: ${points} pontos para ${activeTeam?.name ?? 'time da vez'}`
              break
            case 'steal':
              message = `Mímica: ${points} pontos transferidos para ${orderedTeams.find((team) => team.id === targetTeamId)?.name ?? 'outro time'}`
              break
            case 'everyone':
              message = `Mímica: ${points} pontos distribuídos para todos os times`
              break
            case 'void':
              message = `Mímica: sem pontuação`
              break
          }
          toast.success(message)
        }}
      />

      <InfoModal
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
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
        onClose={() => setOfflineOnboardingOpen(false)}
        onComplete={handleOfflineOnboardingComplete}
        onSkip={() => setOfflineOnboardingOpen(false)}
      />

      <SessionManager
        isOpen={sessionManagerOpen}
        onClose={() => setSessionManagerOpen(false)}
        onLoadSession={handleLoadSession}
        onNewSession={() => {
          // Limpa sessão atual e abre onboarding
          setOfflineOnboardingOpen(true)
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

      <QuestionImportModal
        isOpen={questionImportOpen}
        onClose={() => setQuestionImportOpen(false)}
        columns={session.board}
        onImport={handleQuestionImport}
      />
    </div>
  )
}


// Novos tipos para sistema flexível
type FlexibleScoringMode = 'quick' | 'advanced' | 'custom'

type PointDistribution = {
  teamId: string
  participantId?: string // Se não especificado, distribui para o time inteiro
  points: number
  percentage: number
}



type QuickScoringOption = {
  id: string
  title: string
  subtitle: string
  multiplier: number
  target: 'current-team' | 'other-team' | 'all-teams' | 'none'
}


// Componente flexível de pontuação
type ScoringControlsFlexibleProps = {
  teams: TriviaTeam[]
  participants: TriviaParticipant[]
  activeTeamId: string | null
  activeParticipantId: string | null
  basePoints: number
  onConfirm: (distributions: PointDistribution[]) => void
  onClose: () => void
}

function ScoringControlsFlexible({ 
  teams, 
  participants, 
  activeTeamId, 
  activeParticipantId, 
  basePoints, 
  onConfirm, 
  onClose 
}: ScoringControlsFlexibleProps) {
  const [mode, setMode] = useState<FlexibleScoringMode>('quick')
  const [distributions, setDistributions] = useState<PointDistribution[]>([])
  const [selectedMultiplier, setSelectedMultiplier] = useState<number>(1.0)
  const [quickModeSelected, setQuickModeSelected] = useState<boolean>(false)
  const [selectedQuickOption, setSelectedQuickOption] = useState<string | null>(null)


  // Opções rápidas - apenas casos mais comuns
  const quickOptions: QuickScoringOption[] = [
    { 
      id: 'full-current', 
      title: 'Valor cheio', 
      subtitle: 'Time da vez recebe 100%', 
      multiplier: 1.0, 
      target: 'current-team' 
    },
    { 
      id: 'half-current', 
      title: 'Meio valor', 
      subtitle: 'Time da vez recebe 50%', 
      multiplier: 0.5, 
      target: 'current-team' 
    },
    { 
      id: 'void', 
      title: 'Anular', 
      subtitle: 'Pergunta sem pontuação', 
      multiplier: 0, 
      target: 'none' 
    },
  ]

  // Inicializar distribuições
  useEffect(() => {
    if (mode === 'quick') {
      setDistributions([])
      setQuickModeSelected(false)
      setSelectedQuickOption(null)
    } else if (mode === 'advanced') {
      setDistributions([])
      setQuickModeSelected(false)
      setSelectedQuickOption(null)
    }
  }, [mode])

  // Validação do botão de confirmar
  const isValid = (mode === 'quick' && quickModeSelected) || (mode === 'advanced' && distributions.length > 0)

  // Aplicar opção rápida
  const applyQuickOption = (option: QuickScoringOption) => {
    // Se já está selecionada, desmarca
    if (selectedQuickOption === option.id) {
      setSelectedQuickOption(null)
      setQuickModeSelected(false)
      setDistributions([])
      return
    }

    // Marca como selecionada
    setSelectedQuickOption(option.id)
    setQuickModeSelected(true)
    
    const points = Math.round(basePoints * option.multiplier)
    
    switch (option.target) {
      case 'current-team':
        if (activeTeamId) {
          setDistributions([{
            teamId: activeTeamId,
            participantId: activeParticipantId || undefined,
            points,
            percentage: Math.round((points / basePoints) * 100)
          }])
        }
        break
      case 'none':
        setDistributions([])
        break
    }
  }

  // Atualizar distribuição de um time
  const updateTeamDistribution = (teamId: string, points: number) => {
    const percentage = Math.round((points / basePoints) * 100)
    setDistributions(prev => {
      const filtered = prev.filter(d => d.teamId !== teamId)
      if (points > 0) {
        return [...filtered, { teamId, points, percentage }]
      }
      return filtered
    })
  }

  // Obter participantes de um time
  const getTeamParticipants = (teamId: string) => {
    return participants.filter(p => p.teamId === teamId)
  }

  return (
    <div className="space-y-4">
      {/* Toggle de modo */}
      <div className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-1">
        <button
          type="button"
          onClick={() => setMode('quick')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            mode === 'quick'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Rápido
        </button>
        <button
          type="button"
          onClick={() => setMode('advanced')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            mode === 'advanced'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Avançado
        </button>
      </div>

      {/* Modo Rápido */}
      {mode === 'quick' && (
    <div className="space-y-3">
          <div className="text-sm font-semibold text-[var(--color-text)]">
            Opções Rápidas
          </div>
          <div className="grid gap-2">
            {quickOptions.map((option) => {
              const isSelected = selectedQuickOption === option.id
              
              return (
            <button
              key={option.id}
              type="button"
                  onClick={() => applyQuickOption(option)}
              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    isSelected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-primary)]'
              }`}
            >
                  <div className="flex items-center justify-between">
                <div>
                      <span className="text-sm font-semibold text-[var(--color-text)]">
                        {isSelected ? '✓ ' : ''}{option.title}
                      </span>
                  <p className="text-xs text-[var(--color-muted)]">{option.subtitle}</p>
                </div>
                <span className="text-lg font-bold text-[var(--color-primary)]">
                      {Math.round(basePoints * option.multiplier)} pts
                </span>
              </div>
            </button>
              )
            })}
          </div>

        </div>
      )}

      {/* Modo Avançado - Simplificado */}
      {mode === 'advanced' && (
        <div className="space-y-4">
          <div className="text-sm font-semibold text-[var(--color-text)]">
            Distribuição Personalizada
          </div>

          {/* Multiplicador Simples */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
              Multiplicador
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 0.5, label: '0.5x', desc: 'Meio' },
                { value: 1.0, label: '1x', desc: 'Cheio' },
                { value: 1.5, label: '1.5x', desc: 'Bônus' }
              ].map((mult) => (
                <button
                  key={mult.value}
                  type="button"
                  onClick={() => setSelectedMultiplier(mult.value)}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    selectedMultiplier === mult.value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]'
                  }`}
                >
                  <div className="font-semibold">{mult.label}</div>
                  <div className="text-xs text-[var(--color-muted)]">{mult.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Distribuição Simples por Time */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-[var(--color-text)]">
              Quem recebe os pontos?
            </div>
            
            {teams.map((team) => {
              const teamDistribution = distributions.find(d => d.teamId === team.id)
              const teamPoints = teamDistribution?.points || 0
              const calculatedPoints = Math.round(basePoints * selectedMultiplier)

              return (
                <div key={team.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {team.name}
                    </span>
                    <span className="text-sm font-bold text-[var(--color-primary)]">
                      {teamPoints} pts
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateTeamDistribution(team.id, calculatedPoints)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                        teamPoints > 0
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                          : 'border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]'
                      }`}
                    >
                      {teamPoints > 0 ? '✓ Selecionado' : `Dar ${calculatedPoints} pts`}
                    </button>
                    
                    {teamPoints > 0 && (
                      <button
                        type="button"
                        onClick={() => updateTeamDistribution(team.id, 0)}
                        className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 transition hover:bg-red-100"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Destinatário específico (só aparece se time selecionado) */}
                  {teamPoints > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
                        Para quem no time?
                      </label>
                      <select
                        value={teamDistribution?.participantId || ''}
                        onChange={(e) => {
                          const participantId = e.target.value || undefined
                          setDistributions(prev => 
                            prev.map(d => 
                              d.teamId === team.id 
                                ? { ...d, participantId }
                                : d
                            )
                          )
                        }}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
                      >
                        <option value="">Time inteiro</option>
                        {getTeamParticipants(team.id).map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Resumo Simples */}
          {distributions.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
              <div className="text-sm font-semibold text-[var(--color-text)] mb-2">
                Resumo
              </div>
              <div className="space-y-1">
                {distributions.map((dist, index) => {
                  const team = teams.find(t => t.id === dist.teamId)
                  const participant = dist.participantId 
                    ? participants.find(p => p.id === dist.participantId)
                    : null
                  
                  return (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-[var(--color-text)]">
                        {team?.name}
                        {participant && ` (${participant.name})`}
                      </span>
                      <span className="font-semibold text-[var(--color-primary)]">
                        {dist.points} pts
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex gap-3">
        <Button
          variant={isValid ? 'secondary' : 'outline'}
          disabled={!isValid}
          onClick={() => onConfirm(distributions)}
          className="flex-1"
        >
          Confirmar pontuação
        </Button>
        <Button variant="outline" onClick={onClose} className="flex-1">
          Fechar
        </Button>
      </div>
    </div>
  )
}

