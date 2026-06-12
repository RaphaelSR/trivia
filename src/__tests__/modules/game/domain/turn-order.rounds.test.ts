import {
  buildTurnSequence,
  getCompleteRoundLabel,
  getCompleteRoundNumber,
  groupCompleteRounds,
} from '@/modules/game/domain/turn-order'
import type { TriviaParticipant } from '@/modules/trivia/types'
import {
  createParticipantsFromTeams,
  createTeamsFromSizes,
} from './turn-order.fixtures'

// ---------------------------------------------------------------------------
// BLOCO D — rodadas completas
// ---------------------------------------------------------------------------

describe('rodadas completas', () => {
  // Caso 18: 3-3-5 total 22 — calcular programaticamente o índice de fechamento da rodada 1
  it('3-3-5 total 22: rodada 1 antes de ver todos, rodada 2 após', () => {
    const t = createTeamsFromSizes([3, 3, 5])
    const participants = createParticipantsFromTeams(t)
    const seq = buildTurnSequence(t, 22)

    // Encontra o índice onde os 11 participantes distintos foram vistos pela primeira vez
    const allIds = new Set(participants.map((p) => p.id))
    let closingIndex = -1
    const seen = new Set<string>()
    for (let i = 0; i < seq.length; i++) {
      seen.add(seq[i])
      if (seen.size === allIds.size) {
        closingIndex = i
        break
      }
    }
    expect(closingIndex).toBeGreaterThan(0)

    // um turno antes do fechamento → ainda rodada 1
    expect(
      getCompleteRoundNumber(seq[closingIndex - 1], seq, t, participants, closingIndex - 1),
    ).toBe(1)

    // no índice de fechamento → rodada 1 (grupo acabou de fechar, groups.length === 1)
    expect(
      getCompleteRoundNumber(seq[closingIndex], seq, t, participants, closingIndex),
    ).toBe(1)

    // um passo após o fechamento → rodada 2 (segundo grupo iniciado)
    if (closingIndex + 1 < seq.length) {
      expect(
        getCompleteRoundNumber(seq[closingIndex + 1], seq, t, participants, closingIndex + 1),
      ).toBe(2)
    }
  })

  // Caso 19: 1-5-6 total 24 — idem com 12 participantes; repeatedInGroup nas reaparições
  it('1-5-6 total 24: rodada fecha após 12 participantes distintos; repeatedInGroup em reaparições', () => {
    const t = createTeamsFromSizes([1, 5, 6])
    const participants = createParticipantsFromTeams(t)
    const seq = buildTurnSequence(t, 24)

    const allIds = new Set(participants.map((p) => p.id))
    let closingIndex = -1
    const seen = new Set<string>()
    for (let i = 0; i < seq.length; i++) {
      seen.add(seq[i])
      if (seen.size === allIds.size) {
        closingIndex = i
        break
      }
    }
    expect(closingIndex).toBeGreaterThan(0)

    expect(
      getCompleteRoundNumber(seq[closingIndex - 1], seq, t, participants, closingIndex - 1),
    ).toBe(1)
    // no fechamento → rodada 1 (grupo acabou de fechar, groups.length === 1)
    expect(
      getCompleteRoundNumber(seq[closingIndex], seq, t, participants, closingIndex),
    ).toBe(1)
    // um passo após o fechamento → rodada 2
    if (closingIndex + 1 < seq.length) {
      expect(
        getCompleteRoundNumber(seq[closingIndex + 1], seq, t, participants, closingIndex + 1),
      ).toBe(2)
    }

    // repeatedInGroup: 'a1' (único membro do time A) deve ter repeatedInGroup true
    // na 2ª aparição dentro de um grupo
    const groups = groupCompleteRounds(seq, t, participants)
    groups.forEach((group) => {
      const a1Entries = group.entries.filter((e) => e.participantId === 'a1')
      if (a1Entries.length > 1) {
        a1Entries.slice(1).forEach((e) => expect(e.repeatedInGroup).toBe(true))
      }
    })
  })

  // Caso 20: 3-3 total 2 — rodada sempre 1; groupCompleteRounds → 1 grupo isPartial true
  it('3-3 total 2: rodada sempre 1 e único grupo é isPartial', () => {
    const t = createTeamsFromSizes([3, 3])
    const participants = createParticipantsFromTeams(t)
    const seq = buildTurnSequence(t, 2) // ['a1','b1'] — só 2 de 6 participantes

    // com apenas 2 turnos não dá para ver todos os 6 participantes → rodada 1
    expect(getCompleteRoundNumber(seq[0], seq, t, participants, 0)).toBe(1)
    expect(getCompleteRoundNumber(seq[1], seq, t, participants, 1)).toBe(1)

    const groups = groupCompleteRounds(seq, t, participants)
    expect(groups).toHaveLength(1)
    expect(groups[0].isPartial).toBe(true)
  })

  // Caso 21: participantId null → rodada 1
  it('participantId null → retorna rodada 1', () => {
    const t = createTeamsFromSizes([2, 2])
    const participants = createParticipantsFromTeams(t)
    const seq = buildTurnSequence(t, 4)
    expect(getCompleteRoundNumber(null, seq, t, participants)).toBe(1)
  })

  // Caso 22: SUSPEITA-4 — getCompleteRoundNumber com participante repetido usa 1ª ocorrência
  it('documenta comportamento atual SUSPEITA-4: getCompleteRoundNumber sem activeTurnIndex usa indexOf (1ª ocorrência) para participante repetido', () => {
    // SUSPEITA-4: quando activeTurnIndex não é passado, resolveTurnIndex usa indexOf que
    // retorna a 1ª ocorrência. Para participante que reaparece além do fechamento da 1ª rodada,
    // sem índice o sistema usa a 1ª ocorrência (dentro da rodada 1) → retorna rodada diferente
    // do que retornaria com o índice real passado.
    //
    // Usando 4-5-6/36: 15 participantes, rodada 1 fecha no índice 17 (turn 18).
    // 'a1' aparece em seq[0] e seq[15] e seq[18] (após o fechamento da rodada 1).
    //
    // Com activeTurnIndex passado como 18 (após o fechamento) → grupos = [completa, parcial] → 2
    // Sem activeTurnIndex → resolveTurnIndex usa indexOf → 1ª ocorrência do participante → rodada 1
    const t = createTeamsFromSizes([4, 5, 6])
    const participants = createParticipantsFromTeams(t)
    const seq = buildTurnSequence(t, 36)

    // Rodada 1 fecha no índice 17 (os 15 participantes distintos aparecem pela 1ª vez).
    // Índice 18 = 1ª posição da 2ª rodada.
    // Com activeTurnIndex 18 explícito → rodada 2
    const withIndex = getCompleteRoundNumber(seq[18], seq, t, participants, 18)
    expect(withIndex).toBe(2)

    // Sem activeTurnIndex: resolveTurnIndex faz indexOf(seq[18]) que retorna a
    // 1ª ocorrência do participante na sequência (pode ser muito antes do índice 18).
    // Com 36 turnos, todo participante reaparece — então indexOf < 18, o slice é menor,
    // e o número de grupos calculado diverge.
    const withoutIndex = getCompleteRoundNumber(seq[18], seq, t, participants)
    // SUSPEITA-4 confirmada: sem índice, usa 1ª ocorrência → rodada 1 em vez de 2
    expect(withoutIndex).toBe(1)
    expect(withIndex).not.toBe(withoutIndex)
  })

  // Caso 23: 4-5-6/36 — turnNumber contíguo entre grupos
  it('4-5-6/36: turnNumber contíguo — grupo 2 começa onde grupo 1 termina +1', () => {
    const t = createTeamsFromSizes([4, 5, 6])
    const participants = createParticipantsFromTeams(t)
    const seq = buildTurnSequence(t, 36)
    const groups = groupCompleteRounds(seq, t, participants)

    expect(groups.length).toBeGreaterThanOrEqual(2)

    // Coleta o último turnNumber do grupo 1 e o primeiro do grupo 2
    const lastOfGroup1 = groups[0].entries[groups[0].entries.length - 1].turnNumber
    const firstOfGroup2 = groups[1].entries[0].turnNumber

    // INV-21: turnNumbers contíguos entre grupos
    expect(firstOfGroup2).toBe(lastOfGroup1 + 1)
  })

  // Caso 24: 1-5-6/18 — repeatedInGroup true na 2ª aparição do time de 1 membro
  it('1-5-6/18: participante do time de 1 membro tem repeatedInGroup true na 2ª aparição', () => {
    const t = createTeamsFromSizes([1, 5, 6])
    const participants = createParticipantsFromTeams(t)
    const seq = buildTurnSequence(t, 18)
    const groups = groupCompleteRounds(seq, t, participants)

    // 'a1' aparece múltiplas vezes dentro do grupo
    groups.forEach((group) => {
      const a1Entries = group.entries.filter((e) => e.participantId === 'a1')
      if (a1Entries.length > 1) {
        // INV-20: repeatedInGroup true na 2ª+ aparição
        a1Entries.forEach((entry, i) => {
          if (i === 0) {
            expect(entry.repeatedInGroup).toBe(false)
          } else {
            expect(entry.repeatedInGroup).toBe(true)
          }
        })
      }
    })
  })

  // INV-18: rodada nunca < 1
  it('INV-18: rodada nunca menor que 1', () => {
    const t = createTeamsFromSizes([2, 2])
    const participants = createParticipantsFromTeams(t)
    const seq = buildTurnSequence(t, 8)
    for (let i = 0; i < seq.length; i++) {
      expect(getCompleteRoundNumber(seq[i], seq, t, participants, i)).toBeGreaterThanOrEqual(1)
    }
  })

  // INV-19: resto vira grupo isPartial true
  it('INV-19: resto após rodadas completas vira grupo isPartial true', () => {
    const t = createTeamsFromSizes([2, 3])
    const participants = createParticipantsFromTeams(t)
    // 7 turnos: 1 rodada completa (5 participantes) + 2 restantes
    const seq = buildTurnSequence(t, 7)
    const groups = groupCompleteRounds(seq, t, participants)
    const lastGroup = groups[groups.length - 1]
    expect(lastGroup.isPartial).toBe(true)
  })

  // getCompleteRoundLabel (teste original mantido)
  it('counts a round only after everyone appears at least once', () => {
    const sequence = buildTurnSequence(unevenTeams, 36)
    const participants = createParticipantsFromTeams(unevenTeams)

    expect(getCompleteRoundNumber(sequence[17], sequence, unevenTeams, participants, 17)).toBe(1)
    expect(getCompleteRoundNumber(sequence[18], sequence, unevenTeams, participants, 18)).toBe(2)
    expect(getCompleteRoundLabel(sequence[18], sequence, unevenTeams, participants, 18)).toBe('Rodada 2')
  })
})

// ---------------------------------------------------------------------------
// BLOCO H — regressões documentadas
// ---------------------------------------------------------------------------

describe('regressões documentadas', () => {
  // Caso 45: BUG-3 — participante host sem teamId faz rodada nunca fechar
  it('documenta comportamento atual BUG-3: host sem teamId conta em participants.length mas não em mapEntries → rodada nunca fecha', () => {
    // BUG-3: turn-order.ts:192 — participantTarget = participants.length usa o array cru,
    // que inclui não-jogadores/participantes sem teamId; mapEntries filtra esses participantes
    // mas o contador não acompanha → seenParticipants nunca atinge o target → rodada não fecha.
    const t = createTeamsFromSizes([2, 2])
    const players = createParticipantsFromTeams(t)
    const participantsWithHost: TriviaParticipant[] = [
      ...players,
      { id: 'host-1', name: 'Host', role: 'host' }, // sem teamId
    ]
    const seq = buildTurnSequence(t, 8)

    // Com jogadores puros (4) e sequência de 8: após os 4 jogadores aparecerem → rodada fecha
    const groups = groupCompleteRounds(seq, t, players)
    const groupsWithHost = groupCompleteRounds(seq, t, participantsWithHost)

    // Comportamento esperado sem host: múltiplas rodadas
    expect(groups.length).toBeGreaterThanOrEqual(2)

    // Comportamento atual com host: participantTarget = 5, mas apenas 4 IDs na seq
    // seenParticipants.size nunca chega a 5 → tudo fica em 1 grupo isPartial
    expect(groupsWithHost).toHaveLength(1)
    expect(groupsWithHost[0].isPartial).toBe(true)
  })

  // Caso 46 / Caso 8 (alias)
  it('documenta comportamento atual BUG-1: times [2,2,0] total 9 — length === 6 (sequência encolhe com time vazio, viola INV-1)', () => {
    // BUG-1: createBalancedTurnSequence.ts:59-61 — `continue` em time vazio pula o turno
    // sem decrementar o índice de sequência, fazendo o tamanho final < totalQuestions.
    const t = createTeamsFromSizes([2, 2, 0])
    const seq = buildTurnSequence(t, 9)
    // Comportamento atual: 9 iterações, 3 com continue → 6 elementos em vez de 9
    expect(seq).toHaveLength(6)
    // E a sequência só contém membros de times A e B (time C está vazio)
    seq.forEach((id) => expect(id).toMatch(/^[ab]/))
  })
})

// ---------------------------------------------------------------------------
// Fixture local para unevenTeams (4-5-6) — evitar import circular com o outro arquivo
// ---------------------------------------------------------------------------

const unevenTeams = createTeamsFromSizes([4, 5, 6]).map((team, i) => ({
  ...team,
  id: i === 0 ? 'team-a' : i === 1 ? 'team-b' : 'team-c',
  name: i === 0 ? 'Equipe A' : i === 1 ? 'Equipe B' : 'Equipe C',
  color: i === 0 ? '#a00' : i === 1 ? '#0a0' : '#00a',
  members: i === 0
    ? ['a1', 'a2', 'a3', 'a4']
    : i === 1
      ? ['b1', 'b2', 'b3', 'b4', 'b5']
      : ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'],
}))
