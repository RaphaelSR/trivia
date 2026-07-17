# Conta: Modos de Uso

## Partida completa sem conta

O jogo funciona normalmente como sessão local. Não há QR, histórico na conta ou restauração entre dispositivos. Pontuação, trivia e mímica não dependem de autenticação.

## Partida completa com conta

O snapshot é sincronizado em background independentemente de a rota antiga carregar `mode=offline` ou `mode=online`. O host pode restaurar outra versão, consultar o histórico normalizado e abrir `Gestão de times > Convidar jogadores`.

Antes de mostrar o QR, o app força o envio da versão atual. Se falhar, oferece nova tentativa e mantém o jogo intacto.

## Reivindicar durante o jogo

1. O host mostra um único QR ou compartilha `/claim?session=<token>`.
2. A pessoa entra ou cria uma conta.
3. Se precisar confirmar o e-mail, o link retorna ao mesmo convite sem exigir novo scan do QR.
4. Ela vê apenas nome, time e estado do slot; nenhum e-mail é exposto.
5. Escolhe `Sou eu`; o botão mostra o andamento e volta a permitir tentativa após falha ou timeout.
6. Um slot com e-mail válido só aceita a conta com o mesmo e-mail; sem e-mail válido, qualquer conta autenticada pode reivindicar.

Uma conta ocupa no máximo um slot por sessão. Repetir o próprio claim é seguro. Ao reabrir o mesmo QR, a pessoa vê imediatamente que já está vinculada, seu nome/time e as opções de perfil; não precisa selecionar o slot novamente. Renomear ou mover a pessoa preserva o vínculo pelo ID estável; remover a pessoa revoga o claim na reconciliação seguinte.

Se a autenticação ou a listagem demorar mais que o limite local, a página encerra o carregamento, explica a falha e mantém a ação de atualizar disponível. Isso não altera a sessão do jogo e não deixa uma segunda tentativa duplicar o vínculo.

Depois de reivindicar, a pessoa pode adicionar uma foto opcional ou escolher `Agora não`. A foto pertence à conta e pode ser trocada ou removida em `Minha conta`; ela não muda o nome usado naquela partida.

A página pública de convite usa uma superfície sólida e legível, com alternância entre tema claro e escuro e alvos de toque de pelo menos 44 px. O fluxo é responsivo em 375 px e não depende dos temas visuais do host.

## Corrigir um vínculo

O host acompanha o estado enquanto o painel está aberto, com atualização a cada cinco segundos e refresh manual. `Desvincular` exige confirmação, preserva a linha revogada no ledger e libera o slot para a pessoa correta. O host não escolhe outra conta diretamente.

## Depois da partida

Na finalização, os claims ativos são copiados para `game_participants` na mesma transação do histórico. O mesmo QR continua resolvendo os participantes normalizados. A conta passa a enxergar o jogo ao qual foi vinculada.

Avatares aparecem no status do claim, elenco, turno atual/próximo, placar e histórico apenas quando a identidade está vinculada à sessão ou ao jogo. Sem foto ou em falha de rede, a interface mostra iniciais.

## Compatibilidade

- `/claim?token=`: convite individual legado;
- `/claim?game=`: escolha de participante em jogo já normalizado;
- `/claim?session=`: convite permanente, válido ao vivo e depois do fim.

Os três formatos coexistem.
