# Online: Autenticacao e Seguranca

## Conta

Supabase Auth fornece cadastro, login, sessão persistente e recuperação de senha por e-mail. O trigger `handle_new_user` cria `profiles`; o frontend usa somente URL do projeto e anon key. Senhas e `service_role` nunca ficam no repositório.

Jogar não exige conta. Sincronização remota, histórico pessoal e reivindicação exigem usuário autenticado.

Quando o cadastro começa em `/claim`, `emailRedirectTo` preserva exclusivamente a rota de claim e um token UUID conhecido. O link de confirmação volta ao mesmo convite; rotas, parâmetros ou fragmentos arbitrários são descartados para não criar um redirecionamento aberto. A allow list do Supabase precisa conter a origem de produção e a origem local com suas subrotas.

O callback síncrono de `onAuthStateChange` atualiza somente o estado de autenticação. Reconciliações e RPCs são agendadas para depois do callback, evitando prender o cliente de autenticação enquanto o participante tenta reivindicar seu slot.

## Identidade na partida

O nome em `TriviaSession` é específico daquele jogo. `profile_id` liga esse participante a uma conta sem transformar o nome do jogo em cadastro global. Não existe diretório público de perfis.

O avatar é opcional e pertence a `profiles`, não ao participante do snapshot. O navegador recorta e comprime a origem para `512x512` WebP de até 1 MB. O caminho opaco `uid/uuid.webp` não contém nome, e-mail ou filename original.

## Formas de vínculo

- e-mail opcional informado pelo host: guardado em `participant_invites`, com RLS owner-only;
- link individual legado: `claim_participant(token)`;
- link histórico genérico: `claim_participant_by_game(game_token, participant_id)`;
- convite permanente: `claim_session_participant(join_token, participant_client_id)`.

As três RPCs antigas permanecem com as mesmas assinaturas. A migration `0009` adiciona o fluxo permanente sem reescrevê-las nem executar backfill sobre dados reais.

Repetir o próprio `claim_session_participant` é sucesso idempotente. A interface aplica timeout local de 15 segundos tanto ao confirmar a sessão autenticada quanto às RPCs do fluxo ao vivo; listas e botões sempre saem do carregamento quando a rede não responde. Tentar novamente não cria outro vínculo. Ao reabrir o QR, `claimed_by_me` leva diretamente ao estado confirmado, com nome, time e gerenciamento opcional de avatar.

## Privacidade

- o host reutiliza apenas e-mails que ele próprio já convidou;
- a UI não consulta se um endereço possui conta;
- listas de claim nunca retornam e-mail;
- e-mail válido atua somente como comparação server-side com `auth.email()`;
- e-mail vazio ou inválido não reserva slot e não bloqueia o jogo;
- QR é gerado localmente com `qrcode`, sem request a geradores externos.
- o bucket de avatar é público para servir a imagem por URL, mas upload, troca e remoção continuam restritos por RLS à pasta do próprio `auth.uid()`;
- o host lista somente identidades com claim ativo em sua própria sessão; no histórico, somente o dono ou participantes vinculados ao jogo recebem identidades daquele jogo;
- erro de imagem ou ausência de avatar usa iniciais locais, sem expor um diretório de perfis.

## Correcao e auditoria

Claims não são apagados. Uma correção muda o estado para `revoked`, grava data e ator e, se o jogo já foi normalizado, limpa apenas o `profile_id` correspondente. Índices e locks no banco resolvem disputas; a UI não é a barreira de segurança.

## RLS

RLS está habilitado em todas as tabelas. O host lê/escreve seus snapshots; leitores de um jogo são o host ou participantes vinculados; convites com PII são owner-only. O ledger não aceita escrita direta de `authenticated`, `anon` ou `public`. Objetos de avatar aceitam escrita e remoção somente pelo dono; a API de Storage é usada para apagar arquivos.
