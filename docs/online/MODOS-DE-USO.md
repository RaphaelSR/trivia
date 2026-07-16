# Online: Modos de Uso

## Hospedar sem conta

O jogo funciona normalmente como sessão local. Não há QR, histórico na conta ou restauração entre dispositivos. Pontuação, trivia e mímica não dependem de autenticação.

## Hospedar com conta

No modo `online`, o snapshot é sincronizado em background. O host pode restaurar outra versão, consultar o histórico normalizado e abrir `Gestão de times > Convidar jogadores`.

Antes de mostrar o QR, o app força o envio da versão atual. Se falhar, oferece nova tentativa e mantém o jogo intacto.

## Reivindicar durante o jogo

1. O host mostra um único QR ou compartilha `/claim?session=<token>`.
2. A pessoa entra ou cria uma conta.
3. Ela vê apenas nome, time e estado do slot; nenhum e-mail é exposto.
4. Escolhe `Sou eu`.
5. Um slot com e-mail válido só aceita a conta com o mesmo e-mail; sem e-mail válido, qualquer conta autenticada pode reivindicar.

Uma conta ocupa no máximo um slot por sessão. Repetir o próprio claim é seguro. Renomear ou mover a pessoa preserva o vínculo pelo ID estável; remover a pessoa revoga o claim na reconciliação seguinte.

## Corrigir um vínculo

O host acompanha o estado enquanto o painel está aberto, com atualização a cada cinco segundos e refresh manual. `Desvincular` exige confirmação, preserva a linha revogada no ledger e libera o slot para a pessoa correta. O host não escolhe outra conta diretamente.

## Depois da partida

Na finalização, os claims ativos são copiados para `game_participants` na mesma transação do histórico. O mesmo QR continua resolvendo os participantes normalizados. A conta passa a enxergar o jogo ao qual foi vinculada.

## Compatibilidade

- `/claim?token=`: convite individual legado;
- `/claim?game=`: escolha de participante em jogo já normalizado;
- `/claim?session=`: convite permanente, válido ao vivo e depois do fim.

Os três formatos coexistem.
