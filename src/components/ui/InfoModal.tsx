import { ChevronDown, ChevronRight, Info, X, Sparkles } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useState } from 'react'
import { Button } from './Button'

type InfoModalProps = {
  isOpen: boolean
  onClose: () => void
  onOpenOnboarding?: () => void
}

type AccordionItem = {
  id: string
  title: string
  content: string[]
}

const infoSections: AccordionItem[] = [
  {
    id: 'como-usar',
    title: 'Como usar o jogo de trivia',
    content: [
      '1. Configure os times e participantes no botão "Times"',
      '2. Ajuste o tema visual no botão "Tema" se desejar',
      '3. Clique em uma carta do tabuleiro para iniciar uma pergunta',
      '4. Use o timer para controlar o tempo de resposta',
      '5. Revele a resposta quando apropriado',
      '6. Atribua a pontuação usando os controles disponíveis',
      '7. Use "Passar turno" para avançar para o próximo jogador'
    ]
  },
  {
    id: 'sistema',
    title: 'Como funciona o sistema',
    content: [
      '• O jogo segue uma ordem de turnos alternada entre times',
      '• Cada pergunta tem um valor em pontos (5, 10, 20, 30, 50)',
      '• O timer é configurado automaticamente baseado nos pontos',
      '• As cartas ficam desabilitadas após serem respondidas',
      '• A pontuação é flexível: valor cheio, meio, roubo, todos ou anular',
      '• O sistema mantém controle de qual time está na vez'
    ]
  },
  {
    id: 'icones',
    title: 'O que cada ícone representa',
    content: [
      '🎲 Sortear: Seleciona uma pergunta aleatória disponível',
      '👁️ Resposta: Revela a resposta da pergunta atual',
      '🎭 Mímica: Abre o modo de mímica com turnos alternados (indefinido)',
      '📋 Pontuação: Mostra o ranking atual dos times e detalhes individuais',
      '👥 Times: Gerencia times e participantes',
      '📚 Biblioteca: Edita perguntas e respostas, exporta/importa JSON (requer PIN)',
      '🎨 Tema: Altera o esquema de cores da aplicação',
      '📊 Detalhes: Visualiza pontuação completa por participante (trivia + mimica)',
      '💾 Sessões: Gerencia múltiplas sessões salvas',
      '🎪 Sorteio: Sistema para sortear filmes do próximo trivia'
    ]
  },
  {
    id: 'resumo-jogo',
    title: 'Resumo do jogo',
    content: [
      'O Trivia Cinematográfico é um jogo de perguntas e respostas sobre filmes.',
      'Os times competem respondendo perguntas de diferentes dificuldades.',
      'Cada pergunta vale pontos baseados na complexidade.',
      'O anfitrião controla o fluxo do jogo e atribui a pontuação.',
      'Vence o time com mais pontos ao final de todas as perguntas.'
    ]
  },
  {
    id: 'papeis',
    title: 'Papéis de cada jogador',
    content: [
      '🎯 Anfitrião: Controla o jogo, não acumula pontos de participação',
      '👨‍💼 Assistente: Ajuda o anfitrião, só ganha pontos se não jogar',
      '🎮 Jogador: Participa ativamente, acumula pontos e participação',
      '• O anfitrião define a pontuação de cada pergunta',
      '• Medalhas (ouro/prata/bronze) não contam para ranking de grupos do anfitrião',
      '• Pontos de participação são dados apenas para quem efetivamente jogou'
    ]
  },
  {
    id: 'regras',
    title: 'Regras e mecânicas',
    content: [
      '📊 Pontuação do Trivia:',
      '  • Ouro: 100 pontos',
      '  • Prata: 80 pontos', 
      '  • Bronze: 60 pontos',
      '  • Hospedeiro: 50 pontos',
      '  • Assistente: 25 pontos',
      '  • Participação: 10 pontos',
      '',
      '🎯 Distribuição de pontos (Trivia):',
      '  • Valor cheio: Time da vez recebe 100%',
      '  • Meio valor: Time da vez recebe 50% (com ajuda)',
      '  • Roubo: Pontos transferidos para outro time',
      '  • Todos: Distribuído para todas as equipes',
      '  • Anular: Pergunta sem pontuação',
      '',
      '🎭 Pontuação da Mímica:',
      '  • Valor cheio: Time da vez recebe 100% dos pontos da mímica',
      '  • Meio valor: Time da vez recebe 50% dos pontos',
      '  • Roubo: Pontos transferidos para outro time escolhido',
      '  • Todos: Pontos distribuídos igualmente para todas as equipes',
      '  • Anular: Mímica sem pontuação',
      '  • Pontos de mímica são separados de pontos trivia e aparecem em detalhes individuais'
    ]
  },
  {
    id: 'sorteio-filmes',
    title: 'Sorteio de Filmes',
    content: [
      '🎪 O sistema de sorteio permite escolher filmes únicos para o próximo trivia:',
      '',
      '📋 Regras do sorteio:',
      '  • Filmes nunca se repetem no resultado final',
      '  • Você define o máximo de filmes a serem sorteados',
      '  • Se uma pessoa indicou múltiplos filmes e um é sorteado, os outros são descartados',
      '  • O campo "Adicionado por" é usado para identificar quem indicou cada filme',
      '',
      '👥 Seleção de participantes:',
      '  • Apenas jogadores podem participar do sorteio',
      '  • Anfitrião e assistente não participam',
      '  • É possível selecionar/deselecionar participantes',
      '',
      '📚 Histórico:',
      '  • Todos os sorteios são salvos automaticamente',
      '  • Acesse o histórico pelo ícone de relógio',
      '  • Mantém os últimos 10 sorteios realizados'
    ]
  },
  {
    id: 'mimica',
    title: 'Modo Mímica',
    content: [
      '🎭 O modo mímica permite adicionar pontos especiais durante o jogo:',
      '',
      '⚙️ Funcionamento:',
      '  • O modo é indefinido - continua até você fechar manualmente',
      '  • Mostra a volta (round) e turno atual',
      '  • Segue a ordem de participação alternada entre times',
      '  • Quando todos participaram, recomeça do primeiro automaticamente',
      '',
      '📊 Pontuação:',
      '  • Pontos são adicionados ao participante que acertou',
      '  • Pontos também são adicionados ao time do participante',
      '  • Pontos de mímica são separados de pontos trivia',
      '  • Acesse "Detalhes" no ranking para ver histórico completo de mímicas',
      '',
      '🎯 Modos de pontuação:',
      '  • Valor cheio: Time da vez recebe 100%',
      '  • Meio valor: Time da vez recebe 50%',
      '  • Roubo: Transferir para outro time',
      '  • Todos: Distribuir para todas as equipes',
      '  • Anular: Sem pontuação'
    ]
  },
  {
    id: 'biblioteca',
    title: 'Biblioteca de Perguntas',
    content: [
      '📚 A biblioteca permite gerenciar filmes e perguntas:',
      '',
      '🔐 Acesso:',
      '  • Requer PIN configurado (definido na configuração inicial)',
      '  • Acesse pelo botão "Biblioteca" no dashboard',
      '',
      '✨ Funcionalidades:',
      '  • Adicionar/editar/remover filmes',
      '  • Adicionar/editar/remover perguntas por filme',
      '  • Buscar por filme, pergunta ou resposta',
      '  • Filtrar por valor de pontos',
      '  • Exportar filmes e perguntas para JSON',
      '  • Importar filmes e perguntas de arquivo JSON',
      '',
      '📥 Importar:',
      '  • Formato JSON com estrutura de filmes e perguntas',
      '  • Exemplo disponível no modal de importação',
      '  • Validação automática de formato',
      '  • Preview antes de confirmar importação',
      '',
      '📤 Exportar:',
      '  • Gera arquivo JSON com todos os filmes e perguntas',
      '  • Inclui metadados (ano, gênero, streaming, etc.)',
      '  • Pode ser usado para backup ou compartilhamento'
    ]
  },
  {
    id: 'detalhes-pontuacao',
    title: 'Detalhes de Pontuação Individual',
    content: [
      '📊 Visualize pontuação completa de cada participante:',
      '',
      '👤 Acesso:',
      '  • Clique em "Ver detalhes" no ranking ao lado do nome do participante',
      '  • Mostra resumo, trivia e mímicas em abas separadas',
      '',
      '📈 Resumo:',
      '  • Total de pontos (trivia + mimica)',
      '  • Pontos trivia separados de pontos mimica',
      '  • Estatísticas: perguntas respondidas, mímicas acertadas, médias',
      '',
      '🎬 Trivia:',
      '  • Lista todas as perguntas respondidas pelo participante',
      '  • Mostra filme, pergunta, resposta, pontos e turno',
      '  • Ordenação por data, pontos ou turno',
      '',
      '🎭 Mímica:',
      '  • Lista todas as mímicas acertadas pelo participante',
      '  • Mostra modo (valor cheio, meio, roubo, etc.)',
      '  • Mostra volta e turno de cada mímica',
      '  • Indica time de destino em caso de roubo',
      '  • Ordenação por data, pontos ou turno'
    ]
  }
]

export function InfoModal({ isOpen, onClose, onOpenOnboarding }: InfoModalProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  if (!isOpen) return null

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="card-surface max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl">
        <div className="flex items-start justify-between px-6 pt-6">
          <div className="space-y-1 pr-4">
            <h2 className="text-2xl font-semibold text-[var(--color-text)]">Informações e Ajuda</h2>
            <p className="text-sm text-[var(--color-muted)]">Guia completo sobre como usar o Trivia Cinematográfico</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
        <div className="mt-4 max-h-[75vh] space-y-4 overflow-y-auto px-6 pb-6 pr-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-primary)]/10 p-4">
              <Info className="h-6 w-6 text-[var(--color-primary)]" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">
                  Bem-vindo ao Trivia Cinematográfico!
                </h3>
                <p className="text-xs text-[var(--color-muted)]">
                  Use este guia para entender todas as funcionalidades do sistema.
                </p>
              </div>
              {onOpenOnboarding && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onOpenOnboarding}
                  className="gap-2"
                >
                  <Sparkles size={16} />
                  Ver Configuração Inicial
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {infoSections.map((section) => {
                const isOpen = openSections[section.id] ?? false
                
                return (
                  <div
                    key={section.id}
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                      onClick={() => toggleSection(section.id)}
                    >
                      <span className="text-sm font-semibold text-[var(--color-text)]">
                        {section.title}
                      </span>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-[var(--color-muted)]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[var(--color-muted)]" />
                      )}
                    </button>
                    
                    {isOpen && (
                      <div className="border-t border-[var(--color-border)] px-4 py-3">
                        <div className="space-y-2">
                          {section.content.map((item, index) => (
                            <p
                              key={index}
                              className="text-sm text-[var(--color-text)] leading-relaxed"
                            >
                              {item}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
                  Desenvolvido com ❤️
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--color-text)]">
                  Trivia Cinematográfico
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  Uma experiência de jogo moderna para noites entre amigos
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const portalRoot = document.getElementById('trivia-portal')
  if (!portalRoot) {
    return content
  }
  return createPortal(content, portalRoot)
}