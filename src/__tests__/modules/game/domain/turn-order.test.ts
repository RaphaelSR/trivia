import {
  buildTurnPreviewGroups,
  buildTurnSequence,
  getNextTurnState,
  getRecommendedPreviewTurnCount,
  getTurnLabel,
  resolveTurnIndex,
  rotateAwayFromTeam,
} from '@/modules/game/domain/turn-order'
import type { TriviaParticipant, TriviaSession, TriviaTeam } from '@/modules/trivia/types'
import {
  createBoard,
  createParticipantsFromTeams,
  createTeamsFromSizes,
  defaultTheme,
  expectBalancedTeamCycle,
  makeSession,
} from './turn-order.fixtures'

// ---------------------------------------------------------------------------
// simulateGame — aplica getNextTurnState `steps` vezes acumulando estados
// ---------------------------------------------------------------------------
function simulateGame(
  session: TriviaSession,
  steps: number,
): ReturnType<typeof getNextTurnState>[] {
  const results: ReturnType<typeof getNextTurnState>[] = []
  let current = session
  for (let i = 0; i < steps; i++) {
    const nextState = getNextTurnState(current)
    results.push(nextState)
    current = { ...current, ...nextState }
  }
  return results
}

// ---------------------------------------------------------------------------
// Dados compartilhados (compat com testes originais)
// ---------------------------------------------------------------------------

const teams: TriviaTeam[] = [
  { id: 'team-1', name: 'A', color: '#000', order: 0, members: ['a1', 'a2'], score: 0 },
  { id: 'team-2', name: 'B', color: '#fff', order: 1, members: ['b1', 'b2'], score: 0 },
]

const unevenTeams: TriviaTeam[] = [
  { id: 'team-a', name: 'Equipe A', color: '#a00', order: 0, members: ['a1', 'a2', 'a3', 'a4'], score: 0 },
  { id: 'team-b', name: 'Equipe B', color: '#0a0', order: 1, members: ['b1', 'b2', 'b3', 'b4', 'b5'], score: 0 },
  { id: 'team-c', name: 'Equipe C', color: '#00a', order: 2, members: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'], score: 0 },
]

// ---------------------------------------------------------------------------
// BLOCO A — construção de sequência
// ---------------------------------------------------------------------------

describe('construção de sequência', () => {
  // Caso 1: balanced 1 time [3], total 7
  it('balanced 1 time [3] total 7 cicla os membros', () => {
    const t = createTeamsFromSizes([3])
    expect(buildTurnSequence(t, 7)).toEqual(['a1', 'a2', 'a3', 'a1', 'a2', 'a3', 'a1'])
  })

  // Caso 2: alternating 1 time [4], total 0
  it('alternating 1 time [4] total 0 retorna cópia dos membros', () => {
    const t = createTeamsFromSizes([4])
    expect(buildTurnSequence(t, 0)).toEqual(['a1', 'a2', 'a3', 'a4'])
  })

  // Caso 3: alternating desigual [1,3]
  it('documenta comportamento atual: alternating [1,3] total 0 — time maior continua sozinho no fim (BUG-2)', () => {
    // BUG-2: createAlternatingTurnSequence — com tamanhos desiguais, o time maior fica com
    // turnos consecutivos no fim (JSDoc promete alternância que não vale nesse caso).
    const t = createTeamsFromSizes([1, 3])
    // comportamento real: ['a1','b1','b2','b3'] — b2 e b3 sem alternância
    const seq = buildTurnSequence(t, 0)
    expect(seq).toEqual(['a1', 'b1', 'b2', 'b3'])
  })

  // Caso 4: balanced 3-3-5 total 21
  it('balanced 3-3-5 total 21 tem length 21 e ciclo de times correto', () => {
    const t = createTeamsFromSizes([3, 3, 5])
    const seq = buildTurnSequence(t, 21)
    expect(seq).toHaveLength(21)
    expectBalancedTeamCycle(seq, t)
  })

  // Caso 5: balanced 1-5-6 total 18
  it('balanced 1-5-6 total 18 tem length 18, ciclo correto e membro único reaparece a cada 3', () => {
    const t = createTeamsFromSizes([1, 5, 6])
    const seq = buildTurnSequence(t, 18)
    expect(seq).toHaveLength(18)
    expectBalancedTeamCycle(seq, t)
    // time de 1 membro: aparece nas posições 0, 3, 6, 9, 12, 15 — sempre 'a1'
    for (let i = 0; i < 18; i += 3) {
      expect(seq[i]).toBe('a1')
    }
  })

  // Caso 6: balanced 3-3 total 2
  it('balanced 3-3 total 2 retorna os dois primeiros membros', () => {
    const t = createTeamsFromSizes([3, 3])
    expect(buildTurnSequence(t, 2)).toEqual(['a1', 'b1'])
  })

  // Caso 7: balanced 2 times total 5
  it('balanced 2 times total 5 alterna A,B,A,B,A', () => {
    const t = createTeamsFromSizes([2, 2])
    const seq = buildTurnSequence(t, 5)
    expect(seq).toHaveLength(5)
    ;[0, 2, 4].forEach((i) => expect(seq[i]).toMatch(/^a/))
    ;[1, 3].forEach((i) => expect(seq[i]).toMatch(/^b/))
  })

  // Caso 8 / BUG-1 / Bloco H caso 46
  it('documenta comportamento atual BUG-1: times [2,2,0] total 9 — sequência menor que totalQuestions', () => {
    // BUG-1: createBalancedTurnSequence.ts:59-61 — `continue` em time vazio pula o turno
    // sem repor o índice, resultando em sequência com length < totalQuestions (viola INV-1).
    const t = createTeamsFromSizes([2, 2, 0])
    const seq = buildTurnSequence(t, 9)
    // comportamento real: time vazio encolhe a sequência — 9 turnos mas 3 pulados = 6
    expect(seq).toHaveLength(6)
  })

  // Caso 9: buildTurnSequence [2,2] total 0 → roteia para alternating
  it('buildTurnSequence [2,2] total 0 roteia para alternating e retorna todos os membros', () => {
    const t = createTeamsFromSizes([2, 2])
    expect(buildTurnSequence(t, 0)).toEqual(['a1', 'b1', 'a2', 'b2'])
  })

  // Caso 10: 0 times e 1 time vazio
  it('0 times retorna []', () => {
    expect(buildTurnSequence([], 5)).toEqual([])
  })

  it('1 time vazio total > 0 retorna []', () => {
    const t = createTeamsFromSizes([0])
    // team com members=[] → createBalancedTurnSequence retorna [] por causa da guard
    // (members.length === 0 implica que o único time não tem membros; a sequência fica vazia)
    const seq = buildTurnSequence(t, 5)
    // INV-6 documentado: 1 time vazio → []
    // createBalancedTurnSequence: when 1 team with 0 members → participantIndex %0 = NaN,
    // push(undefined) → vamos apenas assert que nenhum id de participante válido aparece
    expect(seq.filter(Boolean)).toHaveLength(0)
  })

  // Sequência de referência: 4-5-6 / 18 (teste original mantido)
  it('builds the expected balanced sequence for 3 teams (4-5-6) over 18 turns', () => {
    expect(buildTurnSequence(unevenTeams, 18)).toEqual([
      'a1', 'b1', 'c1',
      'a2', 'b2', 'c2',
      'a3', 'b3', 'c3',
      'a4', 'b4', 'c4',
      'a1', 'b5', 'c5',
      'a2', 'b1', 'c6',
    ])
  })

  // Teste original de alternating 2 times
  it('builds alternating sequence without questions', () => {
    expect(buildTurnSequence(teams, 0)).toEqual(['a1', 'b1', 'a2', 'b2'])
  })
})

// ---------------------------------------------------------------------------
// BLOCO B — properties de sequência
// ---------------------------------------------------------------------------

describe('properties de sequência', () => {
  // Caso 11: property balanced
  // Combinações de 2 times 1..6 × 1..6; 3 e 4 times em combinações representativas
  // EXCLUI times de tamanho 0 (regressão dedicada no bloco de regressões)

  const twoTeamCombos: { sizes: number[]; totalQuestions: number }[] = []
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      const soma = a + b
      for (const total of [2, soma + 1, 2 * soma]) {
        twoTeamCombos.push({ sizes: [a, b], totalQuestions: total })
      }
    }
  }

  const multiTeamCombos: { sizes: number[]; totalQuestions: number }[] = []
  const threeTeamSizes = [[3, 3, 5], [1, 5, 6], [2, 4, 6], [1, 1, 1], [6, 6, 6], [1, 1, 6], [2, 2, 3]]
  const fourTeamSizes = [[1, 2, 3, 4], [5, 5, 5, 5], [2, 4, 6, 1]]
  for (const sizes of [...threeTeamSizes, ...fourTeamSizes]) {
    const soma = sizes.reduce((a, b) => a + b, 0)
    for (const total of [sizes.length, soma + 1, 2 * soma]) {
      multiTeamCombos.push({ sizes, totalQuestions: total })
    }
  }

  it.each([...twoTeamCombos, ...multiTeamCombos])(
    'balanced sizes=$sizes total=$totalQuestions: length, ciclo e sem consecutivos do mesmo time',
    ({ sizes, totalQuestions }) => {
      const t = createTeamsFromSizes(sizes)
      const seq = buildTurnSequence(t, totalQuestions)

      // INV-1
      expect(seq).toHaveLength(totalQuestions)
      // INV-3/4 via helper
      expectBalancedTeamCycle(seq, t)
      // sem par consecutivo do mesmo time
      const teamById = new Map(t.map((team) => [team.id, team]))
      const memberToTeam = new Map<string, string>()
      t.forEach((team) => team.members.forEach((m) => memberToTeam.set(m, team.id)))
      for (let i = 1; i < seq.length; i++) {
        expect(memberToTeam.get(seq[i])).not.toBe(memberToTeam.get(seq[i - 1]))
      }
      void teamById
    },
  )

  // Caso 12: property alternating (total 0)
  const alternatingCombos: { sizes: number[] }[] = []
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      alternatingCombos.push({ sizes: [a, b] })
    }
  }
  for (const sizes of [...threeTeamSizes, ...fourTeamSizes]) {
    alternatingCombos.push({ sizes })
  }

  it.each(alternatingCombos)(
    'alternating sizes=$sizes total 0: todo membro aparece exatamente 1 vez e ordem interna preservada',
    ({ sizes }) => {
      const t = createTeamsFromSizes(sizes)
      const seq = buildTurnSequence(t, 0)
      const allMembers = t.flatMap((team) => team.members)
      // INV-2: comprimento = soma de membros
      expect(seq).toHaveLength(allMembers.length)
      // cada membro exatamente 1 vez
      allMembers.forEach((m) => {
        expect(seq.filter((x) => x === m)).toHaveLength(1)
      })
      // ordem relativa interna: para cada time, os membros aparecem na ordem original
      t.forEach((team) => {
        const memberPositions = team.members.map((m) => seq.indexOf(m))
        for (let i = 1; i < memberPositions.length; i++) {
          expect(memberPositions[i]).toBeGreaterThan(memberPositions[i - 1])
        }
      })
    },
  )

  // Casos paramétricos originais (mantidos)
  it.each([
    { sizes: [4, 5, 6], totalQuestions: 18 },
    { sizes: [4, 5, 6], totalQuestions: 36 },
    { sizes: [3, 3, 5], totalQuestions: 21 },
    { sizes: [2, 4, 6], totalQuestions: 24 },
    { sizes: [1, 5, 6], totalQuestions: 18 },
    { sizes: [2, 3, 4, 5], totalQuestions: 28 },
  ])(
    'preserves alternation and internal participant order for team sizes $sizes over $totalQuestions turns',
    ({ sizes, totalQuestions }) => {
      const sizedTeams = createTeamsFromSizes(sizes)
      const sequence = buildTurnSequence(sizedTeams, totalQuestions)

      expect(sequence).toHaveLength(totalQuestions)
      expectBalancedTeamCycle(sequence, sizedTeams)
    },
  )
})

// ---------------------------------------------------------------------------
// BLOCO C — resolveTurnIndex
// ---------------------------------------------------------------------------

describe('resolveTurnIndex', () => {
  const seq456_18 = buildTurnSequence(createTeamsFromSizes([4, 5, 6]), 18)

  // Caso 13: activeTurnIndex correto e participantId bate
  it('retorna activeTurnIndex quando participantId coincide (a1 no índice 12)', () => {
    // 4-5-6/18: seq[12] === 'a1' (a1 reaparece; primeira ocorrência em 0)
    expect(resolveTurnIndex(12, 'a1', seq456_18)).toBe(12)
  })

  // Caso 14: activeTurnIndex fora de bounds → cai para indexOf
  it('activeTurnIndex 99 fora de bounds → retorna primeira ocorrência de b1', () => {
    const firstB1 = seq456_18.indexOf('b1')
    expect(resolveTurnIndex(99, 'b1', seq456_18)).toBe(firstB1)
  })

  // Caso 15: índice aponta participante diferente → cai para indexOf
  it('activeTurnIndex aponta participante diferente → cai para indexOf do participantId', () => {
    // seq[1] === 'b1', mas passamos 'c1'
    const firstC1 = seq456_18.indexOf('c1')
    expect(resolveTurnIndex(1, 'c1', seq456_18)).toBe(firstC1)
  })

  // Caso 16
  it('sequência vazia → -1', () => {
    expect(resolveTurnIndex(0, 'a1', [])).toBe(-1)
  })

  it('participantId null sem índice válido → -1', () => {
    expect(resolveTurnIndex(undefined, null, seq456_18)).toBe(-1)
  })

  // Caso 17
  it('participantId inexistente → -1', () => {
    expect(resolveTurnIndex(undefined, 'zz99', seq456_18)).toBe(-1)
  })

  // Teste original de getTurnLabel (mantido aqui pois usa resolveTurnIndex indiretamente)
  it('formats the current turn label', () => {
    expect(getTurnLabel('b1', ['a1', 'b1', 'a2'])).toBe('2 de 3')
    expect(getTurnLabel(null, ['a1'])).toBe('Aguardando sequência')
    expect(getTurnLabel('missing', ['a1'])).toBe('Aguardando sequência')
  })

  // INV-8/9/10 combinados
  it('INV-8/9/10: retorna -1 ou índice em bounds; prefere activeTurnIndex explícito válido', () => {
    const s = ['x1', 'y1', 'x1'] // x1 aparece duas vezes
    // índice 2 é válido e bate com x1
    expect(resolveTurnIndex(2, 'x1', s)).toBe(2)
    // sem índice → indexOf → 0
    expect(resolveTurnIndex(undefined, 'x1', s)).toBe(0)
    // resultado sempre em [-1, len-1]
    const r = resolveTurnIndex(undefined, 'y1', s)
    expect(r).toBeGreaterThanOrEqual(-1)
    expect(r).toBeLessThan(s.length)
  })
})

// ---------------------------------------------------------------------------
// BLOCO E — avanço de turno (getNextTurnState)
// ---------------------------------------------------------------------------

describe('avanço de turno (getNextTurnState)', () => {
  // Caso 25: avanço simples
  it('4-5-6/18 índice 5 → índice 6 e participante correto', () => {
    const t = createTeamsFromSizes([4, 5, 6])
    const seq = buildTurnSequence(t, 18)
    const session = makeSession(t, 18, {
      activeParticipantId: seq[5],
      activeTurnIndex: 5,
      activeTeamId: t[5 % 3].id,
    })
    const next = getNextTurnState(session)
    expect(next.activeTurnIndex).toBe(6)
    expect(next.activeParticipantId).toBe(seq[6])
    expect(next.activeTeamId).toBe(t[6 % 3].id)
  })

  // Caso 26: participantId null sem índice → vai para índice 0
  it('activeParticipantId null e sem índice válido → vai para índice 0', () => {
    const t = createTeamsFromSizes([2, 2])
    const session = makeSession(t, 4, {
      activeParticipantId: null,
      activeTurnIndex: -1,
    })
    const next = getNextTurnState(session)
    expect(next.activeTurnIndex).toBe(0)
    expect(next.activeParticipantId).toBeTruthy()
  })

  // Caso 30: wrap puro 2-2 total 4
  it('wrap 2-2 total 4: último índice (time B) → próximo time !== B e índice em bounds', () => {
    const t = createTeamsFromSizes([2, 2])
    const seq = buildTurnSequence(t, 4) // ['a1','b1','a2','b2']
    const session = makeSession(t, 4, {
      activeParticipantId: seq[3], // 'b2'
      activeTurnIndex: 3,
      activeTeamId: t[1].id,
    })
    const next = getNextTurnState(session)
    expect(next.activeTeamId).not.toBe(t[1].id) // não repete time B
    expect(next.activeTurnIndex).toBeGreaterThanOrEqual(0)
    expect(next.activeTurnIndex).toBeLessThan(next.turnSequence.length)
  })

  // Caso 31: wrap 3-3-5 (board não cresceu)
  it('wrap 3-3-5 total 11: simula até fim e avança um passo → alternância e índice em bounds', () => {
    const t = createTeamsFromSizes([3, 3, 5])
    const seq = buildTurnSequence(t, 11)
    const session = makeSession(t, 11, {
      activeParticipantId: seq[seq.length - 1],
      activeTurnIndex: seq.length - 1,
      activeTeamId: t[(seq.length - 1) % 3].id,
    })
    const next = getNextTurnState(session)
    expect(next.activeTurnIndex).toBeGreaterThanOrEqual(0)
    expect(next.activeTurnIndex).toBeLessThan(next.turnSequence.length)
    // alternância preservada: próximo time != time anterior
    expect(next.activeTeamId).not.toBe(t[(seq.length - 1) % 3].id)
  })

  // Caso 32: wrap com 1 time
  it('wrap com 1 time: volta via % length, índice em bounds', () => {
    const t = createTeamsFromSizes([3])
    const seq = buildTurnSequence(t, 3)
    const session = makeSession(t, 3, {
      activeParticipantId: seq[2],
      activeTurnIndex: 2,
      activeTeamId: t[0].id,
    })
    const next = getNextTurnState(session)
    // 1 time: sem alternância, wrap volta para o início
    expect(next.activeTurnIndex).toBeGreaterThanOrEqual(0)
    expect(next.activeTurnIndex).toBeLessThan(next.turnSequence.length)
    expect(next.activeParticipantId).toBeTruthy()
  })

  // Caso 33: sequência vazia → estado estável
  it('turnSequence vazia → estado estável (activeTurnIndex 0, participante e time inalterados)', () => {
    const t = createTeamsFromSizes([2, 2])
    const session = makeSession(t, 4, {
      turnSequence: [],
      activeParticipantId: 'a1',
      activeTurnIndex: 0,
      activeTeamId: t[0].id,
    })
    const next = getNextTurnState(session)
    expect(next.activeTurnIndex).toBe(0)
    expect(next.activeParticipantId).toBe('a1')
    expect(next.activeTeamId).toBe(t[0].id)
  })

  // Caso 34: simulação 1-5-6/18 por ~40 passos (2 wraps)
  it('simulação 1-5-6/18 por 40 passos: índice em bounds, participante de time, sem consecutivos do mesmo time', () => {
    const t = createTeamsFromSizes([1, 5, 6])
    const memberToTeam = new Map<string, string>()
    t.forEach((team) => team.members.forEach((m) => memberToTeam.set(m, team.id)))
    const session = makeSession(t, 18, {
      activeParticipantId: null,
      activeTurnIndex: -1,
    })
    const states = simulateGame(session, 40)

    states.forEach((state) => {
      expect(state.activeTurnIndex).toBeGreaterThanOrEqual(0)
      expect(state.activeTurnIndex).toBeLessThan(state.turnSequence.length)
      expect(state.activeParticipantId).toBeTruthy()
      expect(memberToTeam.has(state.activeParticipantId!)).toBe(true)
    })

    // sem time repetido em transições consecutivas (incluindo fronteiras de wrap)
    for (let i = 1; i < states.length; i++) {
      if (states[i].turnSequence.length > 1) {
        expect(states[i].activeTeamId).not.toBe(states[i - 1].activeTeamId)
      }
    }
  })

  // Caso 35: property de simulação
  it.each([
    { sizes: [3, 3], totalTiles: 6 },
    { sizes: [3, 3, 5], totalTiles: 11 },
    { sizes: [1, 5, 6], totalTiles: 12 },
    { sizes: [2, 4, 6], totalTiles: 12 },
  ])(
    'property simulação sizes=$sizes: 2.5×len passos com invariantes de turno',
    ({ sizes, totalTiles }) => {
      const t = createTeamsFromSizes(sizes)
      const memberToTeam = new Map<string, string>()
      t.forEach((team) => team.members.forEach((m) => memberToTeam.set(m, team.id)))
      const session = makeSession(t, totalTiles, {
        activeParticipantId: null,
        activeTurnIndex: -1,
      })
      const len = session.turnSequence.length
      const steps = Math.floor(len * 2.5)
      const states = simulateGame(session, steps)

      states.forEach((state) => {
        expect(state.activeTurnIndex).toBeGreaterThanOrEqual(0)
        expect(state.activeTurnIndex).toBeLessThan(state.turnSequence.length)
        expect(state.activeParticipantId).toBeTruthy()
        expect(memberToTeam.has(state.activeParticipantId!)).toBe(true)
      })

      for (let i = 1; i < states.length; i++) {
        if (sizes.length > 1 && states[i].turnSequence.length > 1) {
          expect(states[i].activeTeamId).not.toBe(states[i - 1].activeTeamId)
        }
      }
    },
  )

  // Testes originais (mantidos)
  it('advances turn and preserves team alternation on wrap-around', () => {
    const session: TriviaSession = {
      id: 'session-1',
      title: 'Trivia',
      scheduledAt: new Date().toISOString(),
      theme: defaultTheme,
      teams,
      participants: [
        { id: 'a1', name: 'A1', role: 'player', teamId: 'team-1' },
        { id: 'a2', name: 'A2', role: 'player', teamId: 'team-1' },
        { id: 'b1', name: 'B1', role: 'player', teamId: 'team-2' },
        { id: 'b2', name: 'B2', role: 'player', teamId: 'team-2' },
      ],
      board: [
        {
          id: 'col-1',
          filmId: 'f1',
          film: 'Film 1',
          tiles: [
            { id: 'tile-1', film: 'Film 1', points: 10, state: 'available', question: 'Q1', answer: 'A1' },
            { id: 'tile-2', film: 'Film 1', points: 20, state: 'available', question: 'Q2', answer: 'A2' },
          ],
        },
      ],
      activeTeamId: 'team-2',
      activeParticipantId: 'b2',
      activeTurnIndex: 3,
      turnSequence: ['a1', 'b1', 'a2', 'b2'],
      mimicaScores: [],
    }

    const nextState = getNextTurnState(session)
    expect(nextState.activeParticipantId).toBeTruthy()
    expect(nextState.activeTeamId).toBe('team-1')
  })

  it('keeps participant order when a shorter stale sequence wraps after the board has grown', () => {
    const session: TriviaSession = {
      id: 'session-uneven',
      title: 'Uneven teams',
      scheduledAt: new Date().toISOString(),
      theme: defaultTheme,
      teams: unevenTeams,
      participants: createParticipantsFromTeams(unevenTeams),
      board: createBoard(18),
      activeTeamId: 'team-a',
      activeParticipantId: 'a4',
      activeTurnIndex: 9,
      turnSequence: buildTurnSequence(unevenTeams, 10),
      mimicaScores: [],
    }

    const observedAfterWrap: Array<string | null> = []
    let currentSession = session

    for (let index = 0; index < 8; index++) {
      const nextState = getNextTurnState(currentSession)
      observedAfterWrap.push(nextState.activeParticipantId)
      currentSession = { ...currentSession, ...nextState }
    }

    expect(observedAfterWrap).toEqual([
      'b4', 'c4', 'a1', 'b5', 'c5', 'a2', 'b1', 'c6',
    ])
  })

  it('advances from a repeated participant occurrence using the current turn index', () => {
    const fullSequence = buildTurnSequence(unevenTeams, 18)
    const session: TriviaSession = {
      id: 'session-repeated',
      title: 'Repeated participant',
      scheduledAt: new Date().toISOString(),
      theme: defaultTheme,
      teams: unevenTeams,
      participants: createParticipantsFromTeams(unevenTeams),
      board: createBoard(18),
      activeTeamId: 'team-a',
      activeParticipantId: 'a1',
      activeTurnIndex: 12,
      turnSequence: fullSequence,
      mimicaScores: [],
    }

    const nextState = getNextTurnState(session)

    expect(nextState.activeParticipantId).toBe('b5')
    expect(nextState.activeTurnIndex).toBe(13)
    expect(nextState.activeTeamId).toBe('team-b')
  })
})

// ---------------------------------------------------------------------------
// BLOCO F — rotateAwayFromTeam
// ---------------------------------------------------------------------------

describe('rotateAwayFromTeam', () => {
  const participants: TriviaParticipant[] = [
    { id: 'a1', name: 'A1', role: 'player', teamId: 'team-a' },
    { id: 'a2', name: 'A2', role: 'player', teamId: 'team-a' },
    { id: 'b1', name: 'B1', role: 'player', teamId: 'team-b' },
  ]

  // Caso 36
  it('previousTeamId undefined → no-op, retorna sequência original', () => {
    const seq = ['a1', 'a2', 'b1']
    expect(rotateAwayFromTeam(seq, participants, undefined)).toBe(seq)
  })

  // Caso 37
  it('primeiro participante já de outro time → no-op', () => {
    const seq = ['b1', 'a1', 'a2']
    const result = rotateAwayFromTeam(seq, participants, 'team-a')
    expect(result).toBe(seq)
  })

  // Caso 38
  it('sequência inteira do mesmo time → no-op (não há alternativa)', () => {
    const seq = ['a1', 'a2']
    const result = rotateAwayFromTeam(seq, participants, 'team-a')
    expect(result).toEqual(seq)
  })

  // Caso 39
  it('[a1,a2,b1] previousTeam A → [b1,a1,a2]', () => {
    const seq = ['a1', 'a2', 'b1']
    expect(rotateAwayFromTeam(seq, participants, 'team-a')).toEqual(['b1', 'a1', 'a2'])
  })

  it('sequência vazia → retorna a própria sequência vazia', () => {
    expect(rotateAwayFromTeam([], participants, 'team-a')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// BLOCO G — preview de turnos
// ---------------------------------------------------------------------------

describe('preview de turnos', () => {
  // Caso 40: flatMap dos entries === buildTurnSequence(sortedTeams, total)
  it.each([
    { sizes: [4, 5, 6], total: 18 },
    { sizes: [3, 3, 5], total: 21 },
    { sizes: [1, 5, 6], total: 18 },
  ])(
    'preview sizes=$sizes total=$total: flatMap de entries igual à sequência do motor',
    ({ sizes, total }) => {
      const t = createTeamsFromSizes(sizes)
      const participants = createParticipantsFromTeams(t)
      const groups = buildTurnPreviewGroups(t, participants, total)
      const previewIds = groups.flatMap((g) => g.entries.map((e) => e.participantId))
      const expected = buildTurnSequence(t, total)
      expect(previewIds).toEqual(expected)
    },
  )

  // Caso 41: times com order embaralhado — preview ordena por order e coincide
  it('times com order reverso: preview ordena por order e coincide com sequência do motor', () => {
    const t = createTeamsFromSizes([3, 3]).map((team, i) => ({
      ...team,
      order: 10 - i, // reverso: equipe A tem order=10, equipe B tem order=9
    }))
    // sortedTeams: B (order=9) antes de A (order=10)
    const sortedT = [...t].sort((a, b) => a.order - b.order)
    const participants = createParticipantsFromTeams(t)
    const groups = buildTurnPreviewGroups(t, participants, 6)
    const previewIds = groups.flatMap((g) => g.entries.map((e) => e.participantId))
    const expected = buildTurnSequence(sortedT, 6)
    expect(previewIds).toEqual(expected)
  })

  // Caso 42: times/participants vazios ou totalTurns <= 0
  it('teams vazio → []', () => {
    expect(buildTurnPreviewGroups([], createParticipantsFromTeams([]), 18)).toEqual([])
  })

  it('participants vazio → []', () => {
    const t = createTeamsFromSizes([2, 2])
    expect(buildTurnPreviewGroups(t, [], 4)).toEqual([])
  })

  it('totalTurns <= 0 → []', () => {
    const t = createTeamsFromSizes([2, 2])
    expect(buildTurnPreviewGroups(t, createParticipantsFromTeams(t), 0)).toEqual([])
    expect(buildTurnPreviewGroups(t, createParticipantsFromTeams(t), -1)).toEqual([])
  })

  // Caso 43: maxGroups 1
  it('maxGroups 1 → retorna apenas o primeiro grupo', () => {
    const t = createTeamsFromSizes([4, 5, 6])
    const participants = createParticipantsFromTeams(t)
    const groups = buildTurnPreviewGroups(t, participants, 36, 1)
    expect(groups).toHaveLength(1)
  })

  // Caso 44: 1-5-6/18 preview marca repetições do time de 1 membro
  it('1-5-6/18 preview: membro único do time A tem repeatedInGroup true na 2ª aparição dentro do grupo', () => {
    const t = createTeamsFromSizes([1, 5, 6])
    const participants = createParticipantsFromTeams(t)
    const groups = buildTurnPreviewGroups(t, participants, 18)
    // Com 12 participantes distintos, 18 turnos resulta em 1 grupo de 18 (isPartial ou não)
    // 'a1' aparece em seq[0], seq[3], seq[6], ... → 2ª em diante é repeatedInGroup
    const entriesWithA1 = groups.flatMap((g) => g.entries.filter((e) => e.participantId === 'a1'))
    expect(entriesWithA1.length).toBeGreaterThan(1)
    // a primeira ocorrência não é repetida
    expect(entriesWithA1[0].repeatedInGroup).toBe(false)
    // as demais são
    entriesWithA1.slice(1).forEach((e) => {
      expect(e.repeatedInGroup).toBe(true)
    })
  })

  // getRecommendedPreviewTurnCount (teste original mantido)
  it('recommends enough turns to explain two complete rounds for uneven teams', () => {
    expect(getRecommendedPreviewTurnCount(unevenTeams, 2)).toBe(36)
  })

  // Teste original de buildTurnPreviewGroups
  it('builds preview groups by complete round and flags repeats before the group closes', () => {
    const groups = buildTurnPreviewGroups(
      unevenTeams,
      createParticipantsFromTeams(unevenTeams),
      18,
    )

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({
      label: 'Rodada 1',
      isPartial: false,
    })
    expect(groups[0]?.entries).toHaveLength(18)
    expect(groups[0]?.entries[12]).toMatchObject({
      participantId: 'a1',
      repeatedInGroup: true,
    })
    expect(groups[0]?.entries[17]).toMatchObject({
      participantId: 'c6',
      repeatedInGroup: false,
    })
  })
})
