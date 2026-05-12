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
