# Regras de Negocio

## Modos de jogo
- `demo`: inicia com dados de exemplo prontos para demonstração e aceita presets de times, jogadores por time e quantidade de perguntas.
- `offline`: inicia vazio e persiste a sessão localmente.
- `online`: usa o mesmo fluxo de jogo, mas com repositório separado para sessão e PIN, preparado para Supabase.

## Sessao
- Uma sessão contém: metadados, tema, times, participantes, board, turno ativo e histórico de mímica.
- Em `offline` e `online`, a sessão ativa pode ser restaurada.
- O histórico mantém no máximo 20 sessões salvas.

## Board
- O board é formado por colunas de filmes.
- Cada coluna tem tiles de perguntas.
- Estados válidos de tile: `available`, `active`, `answered`.
- O jogo termina quando todas as tiles estiverem em `answered`.

## Times e participantes
- Pontuação é agregada no nível do time.
- Participantes pertencem a um time e entram na sequência de turnos pela ordem dos membros.
- Se houver sequência regenerada, deve manter alternância entre times sempre que houver mais de um time elegível.

## Turnos
- Sem perguntas, a sequência usa alternância simples entre times.
- Com perguntas, a sequência usa alternância balanceada pelo total de tiles.
- Uma rodada fecha quando todos os participantes ativos aparecerem ao menos uma vez.
- Em times desiguais, times menores podem repetir participantes antes de times maiores completarem a rodada.
- A preview de ordem deve ser derivada da mesma sequência real usada pelo jogo.
- Ao dar wrap-around na sequência, ela pode ser regenerada para evitar time repetido entre o fim e o novo começo.
- Alterar times ou participantes durante o trivia preserva o turno atual e tudo que já foi jogado; somente a ordem futura é reconciliada.
- Um participante adicionado durante o trivia entra na primeira posição futura justa do seu time. Se não houver perguntas suficientes até essa posição, ele não recebe turno retroativo.
- A ação manual de reorganizar turnos nunca reescreve o passado da sessão.

### Exemplo canonico com tres times desiguais
- Time A: `A1`
- Time B: `B1`, `B2`
- Time C: `C1`, `C2`, `C3`
- Ordem balanceada de uma rodada completa: `A1 -> B1 -> C1 -> A1 -> B2 -> C2 -> A1 -> B1 -> C3`.
- A alternância entre times tem prioridade; por isso integrantes de times menores podem repetir.

## Pontuacao de trivia
- Perguntas podem receber valor cheio, parcial ou nulo conforme a distribuição aplicada pelo controle.
- Ao pontuar uma tile de trivia, ela passa para `answered` e registra quem respondeu, quantos pontos recebeu e quando.

## Pontuacao de mimica
- Modos válidos:
  - `full-current`
  - `half-current`
  - `steal`
  - `everyone`
  - `void`
- A pontuação de mímica gera um registro próprio em `mimicaScores`.

## Ordem da mimica
- A mímica usa os mesmos times, participantes e regra de alternância balanceada do trivia.
- Trivia e mímica mantêm cursores independentes porque avançam por eventos diferentes.
- Ao abrir a mímica, o host escolhe o ponto de partida:
  - continuar do turno deixado pelo trivia;
  - começar do primeiro participante.
- A escolha do ponto de partida não altera a organização da ordem.
- Modos de organização disponíveis:
  - `alternate`: regra padrão; alterna times e repete integrantes dos times menores quando necessário;
  - `shuffle`: embaralha os participantes da rodada;
  - `team-shuffle`: embaralha a ordem interna de cada time e mantém a alternância balanceada entre times.
- A mímica não depende da quantidade de perguntas restantes. Todo participante atual entra na sua rotação.
- Pontuar ou anular uma mímica avança apenas o cursor da mímica e não modifica o turno do trivia.

## PIN e biblioteca
- O PIN padrão é compartilhado por constante do sistema.
- `demo` usa PIN padrão fixo.
- `offline` e `online` podem sobrescrever o PIN por repositório.
- Se não houver PIN customizado configurado, a biblioteca pode abrir sem bloqueio.

## Tema e interface
- Temas válidos: `light`, `dark`, `cinema`, `retro`, `matrix`, `brazil`, `easter`.
- O projeto mantém um tema sazonal `easter` além dos temas base.
- A direção visual alvo continua `dark glassmorphism`, mantendo os outros temas funcionais.

## Onboarding offline
- O onboarding offline deve abrir automaticamente na primeira vez.
- Após visto, o sistema pode sugeri-lo novamente sem forçar a abertura.
