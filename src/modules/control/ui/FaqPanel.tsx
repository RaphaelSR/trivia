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
          'Use Demo para apresentar o sistema com dados prontos. Use Sessão Local quando quiser montar uma partida real e manter tudo salvo neste navegador.',
      },
      {
        question: 'A sessão local fica salva onde?',
        answer:
          'Os dados ficam salvos no armazenamento local do navegador atual. Se você trocar de navegador, dispositivo ou limpar os dados locais, essa sessão não acompanha automaticamente.',
      },
      {
        question: 'O onboarding é obrigatório?',
        answer:
          'Não. O onboarding só acelera a primeira configuração. Você pode pular e ajustar tudo depois pelo dashboard.',
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
          'O host seleciona uma carta do board, conduz o cronômetro, revela a resposta quando fizer sentido e confirma a distribuição de pontos no final da pergunta. A ordem real dos turnos vem da sequência prevista da partida.',
      },
      {
        question: 'Quando uma rodada fecha?',
        answer:
          'A rodada fecha quando todos os participantes aparecerem pelo menos uma vez. Com times desiguais, times menores podem reiniciar a fila antes dos maiores completarem a rodada.',
      },
      {
        question: 'O que acontece quando uma pergunta é anulada?',
        answer:
          'A carta é marcada como respondida, nenhum ponto é distribuido e o turno avanca para o proximo participante.',
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
    title: 'Pontuação do trivia',
    icon: Trophy,
    items: [
      {
        question: 'Como a pontuação das perguntas funciona?',
        answer:
          'Cada carta tem um valor base de pontos. No modo rápido, você pode aplicar valor cheio, metade ou nenhuma pontuação. No modo avançado, pode distribuir pontos customizados por time usando multiplicadores.',
      },
      {
        question: 'Posso dividir pontos entre times?',
        answer:
          'Sim. No modo avançado de pontuação, você escolhe os times que recebem pontos e pode direcionar o credito para um participante específico ou para o time inteiro.',
      },
      {
        question: 'Os pontos sempre vao para um jogador?',
        answer:
          'Não. Se nenhum participante for escolhido na distribuição, a pontuação fica atribuida ao time. Quando um participante é selecionado, o detalhe individual tambem registra esse ponto.',
      },
    ],
  },
  {
    id: 'mimica-scoring',
    title: 'Pontuação da mimica',
    icon: UsersRound,
    items: [
      {
        question: 'Quais modos de pontuação existem na mimica?',
        answer:
          'Valor cheio para o time da vez, meio valor, roubo para outro time, distribuição para todos e anulacao sem pontos.',
      },
      {
        question: 'Como os pontos da mimica sao calculados?',
        answer:
          'Valor cheio e roubo usam o valor base definido na rodada. Meio valor entrega metade. No modo todos, o valor é dividido entre os times. No modo anular, zero pontos.',
      },
      {
        question: 'A mimica usa a mesma ordem de turnos?',
        answer:
          'Sim. O modal mostra a ordem atual, a rodada e o proximo participante, mantendo a alternância entre equipes.',
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
          'Com perguntas no board, a sequência é balanceada para alternar equipes ao longo da partida. Sem perguntas, a alternância usa a ordem normal dos participantes por time.',
      },
      {
        question: 'Consigo prever quem joga em cada rodada?',
        answer:
          'Sim. Quando a sessão já tem times válidos e perguntas no board, você pode abrir a prévia completa da ordem. Ela usa a mesma sequência real do jogo e agrupa os turnos por rodada.',
      },
      {
        question: 'Posso reorganizar os times depois?',
        answer:
          'Sim. O item Gerenciar times permite editar nomes, participantes e ordem dos grupos a qualquer momento.',
      },
      {
        question: 'Regenerar turnos faz o que?',
        answer:
          'Reconstrói a sequência de turnos com base nos times atuais, tentando manter a alternância entre equipes e evitando repetição consecutiva quando possível.',
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
          'Ela é o editor principal do conteúdo. Você escolhe um filme, ajusta título, perguntas, respostas e pontos em um fluxo mestre-detalhe.',
      },
      {
        question: 'O PIN ainda é obrigatório para a biblioteca?',
        answer:
          'Não. Se nenhum PIN estiver configurado, a biblioteca abre direto. O PIN só protege o acesso quando o host decidir configurar um.',
      },
      {
        question: 'Qual a diferenca entre catálogo e board?',
        answer:
          'O board mostra os filmes ativos da partida. O catálogo organiza filmes personalizados salvos para reaproveitar depois em outras sessões locais.',
      },
    ],
  },
  {
    id: 'sessions-security',
    title: 'Sessões locais, reset e segurança',
    icon: RotateCcw,
    items: [
      {
        question: 'Quando devo usar Sessão Local?',
        answer:
          'Sempre que quiser persistência real entre partidas neste mesmo navegador, mantendo histórico local, configurações do host e conteúdo da sessão.',
      },
      {
        question: 'Resetar o jogo pede PIN?',
        answer:
          'Não por padrão. O reset agora usa confirmação destrutiva explícita, para não depender de um PIN fixo.',
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
            <h2 className="text-2xl font-semibold text-[var(--color-text)]">Regras, pontuação e fluxo do host em um só lugar</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
              Use esta aba para tirar dúvidas rápidas durante a partida sem sair do painel principal. O conteúdo abaixo foi alinhado com o comportamento real do jogo.
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
