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

## Modos de jogo
- `ativo`: `demo` inicia com sessao pronta para demonstracao e permite variar escala de times e perguntas
- `ativo`: `offline` permite sessao local persistida no navegador
- `interno`: `online` ja usa camada dedicada de repository e PIN, mas a experiencia completa de sincronizacao remota ainda esta em evolucao

## Dashboard de controle
- `ativo`: configuracao de times e participantes
- `ativo`: criacao, edicao e remocao de colunas de filmes
- `ativo`: criacao, edicao e remocao de tiles de perguntas
- `ativo`: exibicao de status da sessao, turno atual e progresso do board
- `ativo`: acoes rapidas para biblioteca, filmes, tema, ranking, reset e gerenciamento de sessao

## Board e progresso do jogo
- `ativo`: tiles com estados `available`, `active` e `answered`
- `ativo`: encerramento automatico quando todas as tiles estao `answered`
- `ativo`: contadores de perguntas totais e respondidas
- `ativo`: selecao de tile com revelacao de pergunta e resposta

## Times, participantes e turnos
- `ativo`: pontuacao agregada por time
- `ativo`: participante ativo e proximo participante derivados da sequencia de turnos
- `ativo`: sequencia simples ou balanceada conforme a quantidade de perguntas
- `ativo`: preview da ordem da partida quando a sessao ja tem times validos e perguntas no board
- `ativo`: regeneracao manual da sequencia para evitar repeticao ruim entre times quando possivel

## Pontuacao
- `ativo`: pontuacao de trivia por tile respondida
- `ativo`: pontuacao de mimica com modos `full-current`, `half-current`, `steal`, `everyone` e `void`
- `ativo`: ranking por time com ordenacao por pontuacao
- `ativo`: registro de historico de mímica na sessao

## Biblioteca e conteudo
- `ativo`: biblioteca de perguntas com busca, filtro e ordenacao
- `ativo`: importacao de perguntas
- `ativo`: gerenciamento de catalogo de filmes customizados
- `ativo`: roleta de filmes

## Persistencia e sessao
- `ativo`: salvar sessao atual
- `ativo`: carregar sessao salva
- `ativo`: manter historico de ate 20 sessoes
- `ativo`: restaurar sessao ativa em `offline` e `online`
- `ativo`: reset granular de pontos, perguntas, filmes, tema, times e participantes

## PIN e acesso
- `ativo`: PIN padrao centralizado em constante compartilhada
- `ativo`: PIN customizado por repository
- `ativo`: biblioteca pode ser protegida por PIN quando o host configurar um
- `ativo`: reset usa confirmacao explicita, nao depende de PIN fixo

## Tema e interface
- `ativo`: temas `light`, `dark`, `cinema`, `retro`, `matrix`, `brazil` e `easter`
- `ativo`: troca de tema em runtime com persistencia local
- `ativo`: onboarding do modo `offline`
- `ativo`: background sazonal para o tema `easter`
- `em migracao`: consolidacao visual para um dashboard mais coeso

## Modo online
- `interno`: repositories dedicados para sessao e PIN, hoje com cache local isolado
- `planejado`: Supabase como backend oficial do modo online
- `planejado`: sincronizacao remota completa
- `planejado`: autenticacao opcional, join code, campeonatos e historico cross-session
- `planejado`: leaderboards agregados por campeonato e conta

## Onde aprofundar
- Regras funcionais: [REGRAS-DE-NEGOCIO.md](./REGRAS-DE-NEGOCIO.md)
- Estrutura tecnica: [ARQUITETURA.md](./ARQUITETURA.md)
- Evolucao do online: [online/README.md](./online/README.md)
