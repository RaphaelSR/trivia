# Funcionalidades

Mapa funcional do projeto com foco no que existe hoje, no que esta em migracao e no que ainda esta planejado.

## Status usados neste documento
- `ativo`: funcionalidade disponivel no app atual
- `interno`: existe no codigo, mas com foco tecnico ou de evolucao
- `em migracao`: existe no produto, mas ainda esta sendo consolidada
- `planejado`: documentado, mas ainda nao entregue como experiencia completa

## Fluxo principal
- `ativo`: rota `/` como entrada principal com selecao de modo
- `ativo`: rota `/control?mode=...` como dashboard do host
- `ativo`: fallback de rotas volta para a landing page
- `ativo`: nao existe rota `/display`

## Estilos de partida
- `ativo`: `Demo` inicia com dados prontos, permite variar a escala de times/perguntas e não salva progresso
- `ativo`: `Partida completa` inicia a configuração real e mantém autosave local no navegador
- `interno`: `demo | offline | online` permanecem no tipo `GameMode` para compatibilidade; a interface não apresenta “offline” como estilo
- `ativo`: conta é uma capacidade opcional da partida completa e acrescenta backup remoto, restauração, histórico, QR e identidade

## Dashboard de controle
- `ativo`: configuracao de times e participantes
- `ativo`: criacao, edicao e remocao de colunas de filmes
- `ativo`: criacao, edicao e remocao de tiles de perguntas
- `ativo`: exibicao de status da sessao, turno atual e progresso do board
- `ativo`: acoes rapidas para biblioteca, roleta, tema, ranking, reset e gerenciamento de sessao

## Board e progresso do jogo
- `ativo`: tiles com estados `available`, `active` e `answered`
- `ativo`: encerramento automatico quando todas as tiles estao `answered`
- `ativo`: contadores de perguntas totais e respondidas
- `ativo`: selecao de tile com revelacao de pergunta e resposta

## Times, participantes e turnos
- `ativo`: pontuacao agregada por time
- `ativo`: sorteio opcional de times no pré-jogo, com lista única de pessoas, quantidade de times configurável, formação balanceada e preview antes de salvar
- `ativo`: reorganização pré-jogo preserva IDs, papéis e e-mails, sem criar um segundo motor de turnos
- `ativo`: participante ativo e proximo participante derivados da sequencia de turnos
- `ativo`: sequencia simples ou balanceada conforme a quantidade de perguntas
- `ativo`: preview da ordem da partida quando a sessao ja tem times validos e perguntas no board
- `ativo`: reorganizacao manual dos proximos turnos sem apagar o historico ou trocar o participante atual
- `ativo`: alteracao de elenco durante o trivia preserva o passado e inclui participantes novos apenas na ordem futura possivel
- `ativo`: preview usa a sequencia real, destaca o turno atual e permite reorganizar o futuro
- `ativo`: checkpoint local antes de salvar alterações reais de times ou participantes em qualquer partida completa

## Pontuacao
- `ativo`: pontuacao de trivia por tile respondida
- `ativo`: pontuacao de mimica com modos `full-current`, `half-current`, `steal`, `everyone` e `void`
- `ativo`: ranking por time com ordenacao por pontuacao
- `ativo`: registro de historico de mímica na sessao
- `ativo`: mímica com cursor próprio e alternância balanceada igual à do trivia
- `ativo`: escolha entre continuar do turno deixado pelo trivia ou começar do primeiro participante
- `ativo`: organizações `Alternada`, `Aleatória` e `Por time` controlam a ordem realmente executada

## Biblioteca e conteudo
- `ativo`: biblioteca de perguntas com busca, filtro e ordenacao
- `ativo`: importacao de perguntas
- `ativo`: roleta com lista temporária, independente dos filmes da Biblioteca e do trivia atual
- `ativo`: entrada manual de filmes sempre disponível na roleta
- `ativo`: autocomplete opcional de título e ano pela Apple/iTunes, sem chave; falhas externas não bloqueiam nem exibem erro

## Persistencia e sessao
- `ativo`: salvar sessao atual
- `ativo`: carregar sessao salva
- `ativo`: manter historico de ate 20 sessoes
- `ativo`: restaurar a partida completa ativa a partir do armazenamento local
- `ativo`: reset granular de pontos, perguntas, filmes, tema, times e participantes

## PIN e acesso
- `ativo`: PIN padrao centralizado em constante compartilhada
- `ativo`: PIN customizado por repository
- `ativo`: biblioteca pode ser protegida por PIN quando o host configurar um
- `ativo`: reset usa confirmacao explicita, nao depende de PIN fixo

## Tema e interface
- `ativo`: temas `light`, `dark`, `cinema`, `retro`, `matrix`, `brazil` e `easter`
- `ativo`: troca de tema em runtime com persistencia local
- `ativo`: configuração inicial opcional da partida completa, com tema claro selecionado por padrão
- `ativo`: background sazonal para o tema `easter`
- `em migracao`: consolidacao visual para um dashboard mais coeso

## Conta e recursos conectados
- `ativo`: Supabase como backend oficial de conta, sessão, snapshots e histórico
- `ativo`: sincronização remota em background com estado pendente e retry, sem bloquear o jogo
- `ativo`: autenticação por e-mail e senha, recuperação e vínculo de participações
- `ativo`: um QR/link permanente por partida sincronizada para escolher o próprio participante
- `ativo`: reserva opcional por e-mail, atualização de status e desvinculação auditada pelo host
- `ativo`: QR local sem envio do token para serviços externos
- `ativo`: finalização normalizada idempotente por conta + `TriviaSession.id`
- `ativo`: avatar opcional de perfil, processado localmente para WebP e exibido no elenco, turnos, placar, claims e histórico compartilhado
- `ativo`: fallback por iniciais quando não há avatar ou a imagem não carrega; demo e partidas deslogadas não consultam identidades remotas
- `planejado`: campeonatos e histórico agregado cross-session
- `planejado`: leaderboards agregados por campeonato e conta

## Idiomas e texto
- `ativo`: toda a interface e mensagens operacionais usam catálogos i18n tipados por namespace
- `ativo`: português do Brasil como idioma padrão e fallback, com preferência persistida
- `ativo`: verificação automática `npm run i18n:check` contra novos textos estáticos fora dos catálogos
- `planejado`: catálogos e seletor para espanhol e inglês

## Onde aprofundar
- Regras funcionais: [REGRAS-DE-NEGOCIO.md](./REGRAS-DE-NEGOCIO.md)
- Estrutura tecnica: [ARQUITETURA.md](./ARQUITETURA.md)
- Evolucao do online: [online/README.md](./online/README.md)
