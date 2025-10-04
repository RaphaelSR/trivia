import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ClipboardList,
  Dice5,
  Eye,
  Palette,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
  UsersRound,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Navbar } from '../../../components/ui/Navbar'
import { TeamBadge } from '../../../components/ui/TeamBadge'
import { Timer } from '../../../components/ui/Timer'
import { TriviaBoard } from '../../../components/ui/TriviaBoard'
import type { TriviaColumn, TriviaParticipant, TriviaQuestionTile, TriviaTeam } from '../../trivia/types'
import { useTriviaSession } from '../../trivia/hooks/useTriviaSession'
import { useTurnOrder } from '../../trivia/hooks/useTurnOrder'
import { useThemeMode } from '../../../app/providers/ThemeModeProvider'

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

const ACCESS_PIN = 'password123'

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
  } = useTriviaSession()
  const { advanceTurn } = useTurnOrder()
  const { theme: themeMode, setTheme } = useThemeMode()

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

  const createTeamId = () => `team-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
  const createParticipantId = () =>
    `participant-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`

  const layoutStyle = useMemo(() => {
    return {
      '--color-primary': theme.palette.primary,
      '--color-secondary': theme.palette.accent,
      '--color-surface': theme.palette.surface,
      '--color-background': '#ffffff',
    } as CSSProperties
  }, [theme.palette.accent, theme.palette.primary, theme.palette.surface])

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

  const scoreboard = useMemo(() => {
    return orderedTeams.map((team, index) => ({
      team,
      position: index + 1,
      points: (orderedTeams.length - index) * 120,
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
    if (pinInput.trim() === ACCESS_PIN) {
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

  const quickActions = [
    {
      id: 'random',
      icon: <Dice5 size={18} />,
      label: 'Sortear',
      onClick: handleRandomQuestion,
    },
    {
      id: 'answer',
      icon: <Eye size={18} />,
      label: 'Resposta',
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
      id: 'scoreboard',
      icon: <ClipboardList size={18} />,
      label: 'Pontuação',
      onClick: () => setScoreboardOpen(true),
    },
    {
      id: 'teams',
      icon: <UsersRound size={18} />,
      label: 'Times',
      onClick: () => setTeamsModalOpen(true),
    },
    {
      id: 'library',
      icon: <BookOpen size={18} />,
      label: 'Biblioteca',
      onClick: handleShowLibrary,
    },
    {
      id: 'theme',
      icon: <Palette size={18} />,
      label: 'Tema',
      onClick: () => setThemeModalOpen(true),
    },
    {
      id: 'revert',
      icon: <RefreshCw size={18} />,
      label: 'Reverter',
      onClick: () => toast.warning('Reversão manual será liberada em breve'),
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
        color: '#4f46e5',
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
      color: team.color || '#4f46e5',
      order: index,
      members: team.members.map((member) => member.id),
    }))

    const newParticipants: TriviaParticipant[] = teamDrafts.flatMap((team) =>
      team.members.map((member) => ({
        id: member.id,
        name: member.name.trim() || 'Participante',
        role: member.role,
        teamId: team.id,
      })),
    )

    const newTurnSequence = teamDrafts.flatMap((team) => team.members.map((member) => member.id))

    updateTeamsAndParticipants(newTeams, newParticipants, newTurnSequence)
    setTeamsModalOpen(false)
    toast.success('Times atualizados')
  }

  return (
    <div className="flex min-h-screen flex-col" style={layoutStyle}>
      <Navbar
        title={session.title}
        mode="controle"
        onOpenSettings={() => setThemeModalOpen(true)}
        onExit={() => toast.info('Encerrando sessão atual')}
      />
      <main className="flex-1 space-y-6 px-8 py-6">
        <section className="card-surface rounded-3xl p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--color-muted)]">
                  Turno atual
                </p>
                <p className="text-lg font-semibold text-[var(--color-text)]">
                  {activeParticipant?.name ?? 'Aguardando início'}
                  {activeParticipantTeamName ? ` · ${activeParticipantTeamName}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2">
                  <Timer initialSeconds={45} variant="compact" editable />
                </div>
                {quickActions.map((action) => (
                  <Button
                    key={action.id}
                    variant="ghost"
                    size="icon"
                    aria-label={action.label}
                    title={action.label}
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    {action.icon}
                  </Button>
                ))}
                <Button
                  variant="secondary"
                  title="Passar turno"
                  onClick={() => {
                    advanceTurn()
                    if (nextParticipant) {
                      toast.success(`Próximo turno: ${nextParticipant.name}`)
                    }
                  }}
                >
                  Passar turno
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {orderedTeams.map((team) => (
                <TeamBadge key={team.id} team={team} isActive={team.id === activeTeam?.id} />
              ))}
              <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
                <UsersRound size={14} /> Próximo: {
                  nextParticipant
                    ? `${nextParticipant.name}${nextParticipantTeamName ? ` · ${nextParticipantTeamName}` : ''}`
                    : 'Defina a sequência'
                }
              </span>
            </div>
          </div>
        </section>

        <section className="card-surface rounded-3xl p-6">
          <div className="mb-6 flex items-center justify-between">
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

        <section className="flex items-center justify-end">
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
            activeTeamId={activeTeam?.id ?? null}
            onConfirm={(mode, targetTeamId) => {
              if (!selectedTile) {
                toast.info('Selecione uma carta para pontuar')
                return
              }
              let message = ''
              switch (mode) {
                case 'full-current':
                  message = `${selectedTile.column.film}: pontos completos para ${
                    orderedTeams.find((team) => team.id === activeTeam?.id)?.name ?? 'time da vez'
                  }`
                  break
                case 'half-current':
                  message = `${selectedTile.column.film}: meia pontuação para ${
                    orderedTeams.find((team) => team.id === activeTeam?.id)?.name ?? 'time da vez'
                  }`
                  break
                case 'steal':
                  message = `${selectedTile.column.film}: pontos transferidos para ${
                    orderedTeams.find((team) => team.id === targetTeamId)?.name ?? 'outro time'
                  }`
                  break
                case 'everyone':
                  message = `${selectedTile.column.film}: pontos distribuídos para todos os times`
                  break
                case 'void':
                  message = `${selectedTile.column.film}: pergunta anulada`
                  break
              }
              updateTileState(selectedTile.tile.id, 'answered')
              toast.success(message)
              setSelectedIds(null)
              setShowAnswer(false)
            }}
          />
          <Button variant="outline" onClick={handleCloseQuestionModal}>
            Fechar
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={scoreboardOpen}
        title="Ranking da noite"
        description="Resumo parcial das equipes nesta sessão."
        onClose={() => setScoreboardOpen(false)}
      >
        <div className="space-y-3">
          {scoreboard.map(({ team, position, points }) => (
            <div key={team.id} className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-[var(--color-primary)]/10 text-center text-sm font-semibold text-[var(--color-primary)] leading-8">
                  {position}º
                </span>
                <span className="text-sm font-semibold text-[var(--color-text)]">{team.name}</span>
              </div>
              <span className="text-sm font-semibold text-[var(--color-text)]">{points} pts</span>
            </div>
          ))}
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
                  <div key={member.id} className="space-y-2 rounded-xl border border-[var(--color-border)] bg-white p-3">
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
                            className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs text-[var(--color-muted)]"
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
                      {column.tiles.map((tile) => (
                        <div key={tile.id} className="space-y-2 rounded-xl border border-[var(--color-border)] bg-white p-3">
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
                Paleta {option.id === 'cinema' ? 'com tons quentes e contraste elevado' : option.label.toLowerCase()}
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}

type ScoringMode = 'full-current' | 'half-current' | 'steal' | 'everyone' | 'void'

type ScoringControlsProps = {
  teams: TriviaTeam[]
  activeTeamId: string | null
  onConfirm: (mode: ScoringMode, targetTeamId: string | null) => void
}

function ScoringControls({ teams, activeTeamId, onConfirm }: ScoringControlsProps) {
  const [mode, setMode] = useState<ScoringMode | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)

  useEffect(() => {
    if (!activeTeamId) {
      setSelectedTeam(teams[0]?.id ?? null)
      return
    }
    const alternate = teams.find((team) => team.id !== activeTeamId)
    setSelectedTeam(alternate?.id ?? teams[0]?.id ?? null)
  }, [activeTeamId, teams])

  const stealTargets = useMemo(
    () => teams.filter((team) => team.id !== activeTeamId),
    [teams, activeTeamId],
  )

  const options: Array<{ id: ScoringMode; title: string; subtitle: string }> = [
    { id: 'full-current', title: 'Valor cheio', subtitle: 'Time da vez recebe 100%' },
    { id: 'half-current', title: 'Meio valor', subtitle: 'Time da vez recebe 50%' },
    { id: 'steal', title: 'Roubo', subtitle: 'Transferir para outro time' },
    { id: 'everyone', title: 'Todos', subtitle: 'Distribuir para todas as equipes' },
    { id: 'void', title: 'Anular', subtitle: 'Pergunta sem pontuação' },
  ]

  const canConfirm =
    mode !== null && (mode !== 'steal' || (mode === 'steal' && selectedTeam !== null))

  return (
    <div className="space-y-3">
      <details className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
          Distribuição de pontos
          <span className="text-xs text-[var(--color-muted)]">Selecione uma opção</span>
        </summary>
        <div className="space-y-2 px-4 pb-4">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                mode === option.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[var(--color-border)] bg-[var(--color-background)]'
              }`}
            >
              <span className="text-sm font-semibold text-[var(--color-text)]">{option.title}</span>
              <p className="text-xs text-[var(--color-muted)]">{option.subtitle}</p>
            </button>
          ))}
          {mode === 'steal' ? (
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
              Selecionar time
              <select
                value={selectedTeam ?? ''}
                onChange={(event) => setSelectedTeam(event.target.value)}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
              >
                {stealTargets.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </details>
      <Button
        variant={mode ? 'secondary' : 'outline'}
        disabled={!canConfirm}
        onClick={() => onConfirm(mode ?? 'full-current', mode === 'steal' ? selectedTeam : null)}
      >
        Confirmar pontuação
      </Button>
    </div>
  )
}
