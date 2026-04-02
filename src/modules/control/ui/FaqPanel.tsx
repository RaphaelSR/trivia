import { ChevronDown, ChevronRight, HelpCircle, Library, RotateCcw, Trophy, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'

type FaqSection = {
  id: string
  title: string
  icon: typeof HelpCircle
  items: Array<{
    question: string
    answer: string
  }>
}

const faqSections: FaqSection[] = [
  {
    id: 'getting-started',
    title: 'Comecando',
    icon: HelpCircle,
    items: [
      {
        question: 'Qual modo devo usar?',
        answer:
          'Use Demo para apresentar o sistema com dados prontos. Use Sessao Local quando quiser montar uma partida real e manter tudo salvo neste navegador.',
      },
      {
        question: 'A sessao local fica salva onde?',
        answer:
          'Os dados ficam salvos no armazenamento local do navegador atual. Se voce trocar de navegador, dispositivo ou limpar os dados locais, essa sessao nao acompanha automaticamente.',
      },
      {
        question: 'O onboarding eh obrigatorio?',
        answer:
          'Nao. O onboarding so acelera a primeira configuracao. Voce pode pular e ajustar tudo depois pelo dashboard.',
      },
    ],
  },
  {
    id: 'round-flow',
    title: 'Fluxo da rodada',
    icon: RotateCcw,
    items: [
      {
        question: 'Como a rodada funciona no painel?',
        answer:
          'O host seleciona uma carta do board, conduz o cronometro, revela a resposta quando fizer sentido e confirma a distribuicao de pontos no final da pergunta.',
      },
      {
        question: 'O que acontece quando uma pergunta eh anulada?',
        answer:
          'A carta eh marcada como respondida, nenhum ponto eh distribuido e o turno avanca para o proximo participante.',
      },
      {
        question: 'Quando a partida termina?',
        answer:
          'Quando todas as cartas do tabuleiro estiverem respondidas. O sistema abre o fluxo de encerramento automaticamente.',
      },
    ],
  },
  {
    id: 'trivia-scoring',
    title: 'Pontuacao do trivia',
    icon: Trophy,
    items: [
      {
        question: 'Como a pontuacao das perguntas funciona?',
        answer:
          'Cada carta tem um valor base de pontos. No modo rapido, voce pode aplicar valor cheio, metade ou nenhuma pontuacao. No modo avancado, pode distribuir pontos customizados por time usando multiplicadores.',
      },
      {
        question: 'Posso dividir pontos entre times?',
        answer:
          'Sim. No modo avancado de pontuacao, voce escolhe os times que recebem pontos e pode direcionar o credito para um participante especifico ou para o time inteiro.',
      },
      {
        question: 'Os pontos sempre vao para um jogador?',
        answer:
          'Nao. Se nenhum participante for escolhido na distribuicao, a pontuacao fica atribuida ao time. Quando um participante eh selecionado, o detalhe individual tambem registra esse ponto.',
      },
    ],
  },
  {
    id: 'mimica-scoring',
    title: 'Pontuacao da mimica',
    icon: UsersRound,
    items: [
      {
        question: 'Quais modos de pontuacao existem na mimica?',
        answer:
          'Valor cheio para o time da vez, meio valor, roubo para outro time, distribuicao para todos e anulacao sem pontos.',
      },
      {
        question: 'Como os pontos da mimica sao calculados?',
        answer:
          'Valor cheio e roubo usam o valor base definido na rodada. Meio valor entrega metade. No modo todos, o valor eh dividido entre os times. No modo anular, zero pontos.',
      },
      {
        question: 'A mimica usa a mesma ordem de turnos?',
        answer:
          'Sim. O modal mostra a ordem atual, a volta e o proximo participante, mantendo a alternancia entre equipes.',
      },
    ],
  },
  {
    id: 'teams-turns',
    title: 'Times e turnos',
    icon: UsersRound,
    items: [
      {
        question: 'Como os turnos sao montados?',
        answer:
          'Com perguntas no board, a sequencia eh balanceada para alternar equipes ao longo da partida. Sem perguntas, a alternancia usa a ordem normal dos participantes por time.',
      },
      {
        question: 'Posso reorganizar os times depois?',
        answer:
          'Sim. O item Gerenciar times permite editar nomes, participantes e ordem dos grupos a qualquer momento.',
      },
      {
        question: 'Regenerar turnos faz o que?',
        answer:
          'Reconstrói a sequencia de turnos com base nos times atuais, tentando manter a alternancia entre equipes e evitando repeticao consecutiva quando possivel.',
      },
    ],
  },
  {
    id: 'library-films',
    title: 'Biblioteca e filmes',
    icon: Library,
    items: [
      {
        question: 'Para que serve a biblioteca?',
        answer:
          'Ela eh o editor principal do conteudo. Voce escolhe um filme, ajusta titulo, perguntas, respostas e pontos em um fluxo mestre-detalhe.',
      },
      {
        question: 'O PIN ainda eh obrigatorio para a biblioteca?',
        answer:
          'Nao. Se nenhum PIN estiver configurado, a biblioteca abre direto. O PIN so protege o acesso quando o host decidir configurar um.',
      },
      {
        question: 'Qual a diferenca entre catalogo e board?',
        answer:
          'O board mostra os filmes ativos da partida. O catalogo organiza filmes personalizados salvos para reaproveitar depois em outras sessoes locais.',
      },
    ],
  },
  {
    id: 'sessions-security',
    title: 'Sessoes locais, reset e seguranca',
    icon: RotateCcw,
    items: [
      {
        question: 'Quando devo usar Sessao Local?',
        answer:
          'Sempre que quiser persistencia real entre partidas neste mesmo navegador, mantendo historico local, configuracoes do host e conteudo da sessao.',
      },
      {
        question: 'Resetar o jogo pede PIN?',
        answer:
          'Nao por padrao. O reset agora usa confirmacao destrutiva explicita, para nao depender de um PIN fixo.',
      },
      {
        question: 'Se eu configurar um PIN, o que ele protege?',
        answer:
          'Ele protege apenas os pontos administrativos que o host quiser restringir, principalmente a biblioteca e outros fluxos sensiveis.',
      },
    ],
  },
]

interface FaqPanelProps {
  onOpenOnboarding: () => void
}

export function FaqPanel({ onOpenOnboarding }: FaqPanelProps) {
  const [openSectionId, setOpenSectionId] = useState<string>(faqSections[0]?.id ?? '')

  const sections = useMemo(() => faqSections, [])

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-white/8 bg-black/10 p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--color-muted)]">FAQ / Ajuda</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-[var(--color-text)]">Regras, pontuacao e fluxo do host em um so lugar</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
              Use esta aba para tirar duvidas rapidas durante a partida sem sair do painel principal. O conteudo abaixo foi alinhado com o comportamento real do jogo.
            </p>
          </div>
          <Button variant="outline" onClick={onOpenOnboarding} className="gap-2">
            <HelpCircle className="h-4 w-4" />
            Reabrir onboarding
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section) => {
          const isOpen = openSectionId === section.id
          const Icon = section.icon

          return (
            <section key={section.id} className="rounded-[24px] border border-white/8 bg-black/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenSectionId(isOpen ? '' : section.id)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[var(--color-primary)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-[var(--color-text)]">{section.title}</p>
                    <p className="text-xs text-[var(--color-muted)]">{section.items.length} respostas objetivas para o host</p>
                  </div>
                </div>
                {isOpen ? <ChevronDown className="h-4 w-4 text-[var(--color-muted)]" /> : <ChevronRight className="h-4 w-4 text-[var(--color-muted)]" />}
              </button>

              {isOpen ? (
                <div className="border-t border-white/8 px-5 py-4 space-y-4">
                  {section.items.map((item) => (
                    <div key={item.question} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                      <p className="text-sm font-semibold text-[var(--color-text)]">{item.question}</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">{item.answer}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}
