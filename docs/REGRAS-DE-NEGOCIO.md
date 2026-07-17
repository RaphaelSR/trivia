# Regras de Negocio

## Estilos de partida e conta
- A interface oferece dois estilos: `Demo` e `Partida completa`.
- `Demo`: inicia com dados de exemplo, aceita presets de times/jogadores/perguntas, não persiste progresso e não acessa serviços de conta.
- `Partida completa`: inicia a configuração real, salva automaticamente neste navegador e funciona sem login ou rede.
- Conta é opcional. Quando autenticada e com Supabase disponível, a partida completa também sincroniza, cria histórico remoto e libera convite/identidade.
- O contrato interno `GameMode = demo | offline | online` permanece compatível com URLs e dados antigos. Esses valores não devem ser usados como substituto do estado real de autenticação/sincronização.

## Sessao
- Uma sessão contém: metadados, tema, times, participantes, board, turno ativo e histórico de mímica.
- A partida completa ativa pode ser restaurada do armazenamento local, independentemente de login.
- O histórico mantém no máximo 20 sessões salvas.

## Board
- O board é formado por colunas de filmes.
- Cada coluna tem tiles de perguntas.
- Estados válidos de tile: `available`, `active`, `answered`.
- O jogo termina quando todas as tiles estiverem em `answered`.
- A sessão que acabou de responder a última tile continua ativa para o fluxo normal de mímica. A proteção de reabertura não interrompe essa transição.

## Times e participantes
- Pontuação é agregada no nível do time.
- Participantes pertencem a um time e entram na sequência de turnos pela ordem dos membros.
- Se houver sequência regenerada, deve manter alternância entre times sempre que houver mais de um time elegível.
- Antes de qualquer pergunta ser revelada ou pontuação registrada, o host pode reunir o elenco em uma lista e sortear uma nova formação balanceada.
- O sorteio preserva a identidade, o papel e o e-mail opcional de participantes existentes; somente a associação aos times muda.
- Aplicar a prévia do sorteio altera apenas o rascunho. A sessão muda no salvamento normal e continua usando o mesmo motor de turnos e checkpoint de elenco.
- Depois de o jogo começar, o sorteio é bloqueado; a gestão manual e a reconciliação segura do futuro continuam disponíveis.

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
- Salvar uma alteração de times ou participantes durante uma partida ativa cria antes um checkpoint local `Antes de alterar times e participantes`, exceto em `Demo`.
- Esse checkpoint guarda o elenco e a ordem anteriores; a sessão atualizada continua seguindo o autosave local e, com login, a sincronização online normal.

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
- A partida completa pode sobrescrever o PIN pelo repositório correspondente.
- Se não houver PIN customizado configurado, a biblioteca pode abrir sem bloqueio.

## Conta e reivindicação
- Conta, claim e avatar não fazem parte de `TriviaSession` e nunca alteram pontuação, turnos ou alternância.
- `Demo` não faz chamadas de conta, claim ou avatar. Uma partida completa deslogada também não faz essas chamadas.
- Em uma partida completa autenticada e sincronizável, o host pode gerar um único link `/claim?session=` depois de enviar o elenco atual.
- Uma conta pode ocupar no máximo um participante por sessão; um participante pode ter no máximo um claim ativo.
- Repetir o próprio claim do mesmo participante é idempotente.
- E-mail opcional válido reserva o slot para o mesmo e-mail autenticado; vazio ou inválido não reserva e não bloqueia o jogo.
- Renomear ou mover preserva o claim pelo ID do participante. Remover revoga o vínculo na próxima reconciliação.
- A correção do host apenas desvincula, com confirmação e registro de ator/data; outra pessoa reivindica depois.
- O mesmo token continua válido no histórico normalizado após o fim da partida.
- Links antigos `/claim?token=` e `/claim?game=` permanecem compatíveis.
- Finalizar novamente a mesma partida sincronizada deve devolver o mesmo jogo normalizado, sem duplicar histórico.
- Avatar é opcional, pertence à conta e não renomeia o participante dentro de uma partida.
- Antes do upload, a pessoa pode reposicionar e aproximar a imagem. O arquivo final é WebP 512×512, busca ficar em até 350 KB e nunca ultrapassa 1 MB; a imagem fica no Storage, não em base64 dentro do banco.
- A origem aceita JPEG, PNG ou WebP de até 5 MB; antes do upload, o navegador aplica o recorte escolhido, redimensiona para `512x512` e gera WebP de até 1 MB.
- Troca e remoção preservam o avatar anterior quando a operação não pode ser concluída; falhas de imagem ou rede usam iniciais e não bloqueiam o jogo.
- O host vê avatar apenas de contas com claim ativo em sua sessão; no histórico, somente dono e participantes vinculados consultam as identidades daquele jogo.
- `Demo` e partidas completas sem conta usam somente iniciais e não chamam Storage nem RPCs de avatar.

## Partidas finalizadas e reabertura

- Uma partida normalizada em `games` e seu `game_raw_snapshots` são histórico imutável; a interface nunca os transforma novamente na mesma sessão ativa.
- Ao reabrir uma partida finalizada — no histórico da conta ou em `Partidas salvas` — o usuário escolhe explicitamente entre:
  - continuar de onde parou, preservando placar, perguntas respondidas, turnos, eventos e mímica;
  - recomeçar com times, participantes, filmes, perguntas e tema, zerando placar e progresso.
- As duas escolhas criam um novo `TriviaSession.id`. A partida original, seus claims, QR e chave idempotente permanecem intactos.
- Antes de tornar a cópia ativa, o estado corrente é salvo como partida local separada. Falha de armazenamento cancela a troca sem alterar o jogo aberto.

## Roleta de filmes
- A roleta é independente do trivia atual e não importa filmes do board ou da Biblioteca.
- Os candidatos são adicionados em uma lista temporária criada a cada abertura da roleta.
- A digitação manual deve estar sempre disponível.
- Sugestões externas de título e ano são opcionais; qualquer falha do provedor deve ser ignorada sem impedir a inclusão manual ou o sorteio.

## Tema e interface
- Temas válidos: `light`, `dark`, `cinema`, `retro`, `matrix`, `brazil`, `easter`.
- O projeto mantém um tema sazonal `easter` além dos temas base.
- A direção visual alvo continua `dark glassmorphism`, mantendo os outros temas funcionais.

## Configuração inicial
- O assistente da partida completa abre automaticamente na primeira vez, mas pode ser cancelado sem bloquear o painel.
- O tema inicial selecionado é `light`; a Biblioteca deve preservar a escolha feita no assistente.
- Após visto, o sistema pode sugerir o assistente novamente sem forçar a abertura.

## Idioma
- Textos de interface, acessibilidade, confirmação, toast e erro operacional pertencem aos catálogos i18n.
- Português do Brasil é o idioma padrão e fallback enquanto espanhol e inglês não forem publicados.
- Regras de domínio não retornam frases localizadas; retornam valores estruturados para a camada de apresentação traduzir.
- Nomes de pessoas, times, filmes, perguntas e demais conteúdos criados pelo usuário são preservados no idioma em que foram escritos.
