# Online: Autenticacao e Seguranca

## Conta

Supabase Auth fornece cadastro, login, sessão persistente e recuperação de senha por e-mail. O trigger `handle_new_user` cria `profiles`; o frontend usa somente URL do projeto e anon key. Senhas e `service_role` nunca ficam no repositório.

Jogar não exige conta. Sincronização remota, histórico pessoal e reivindicação exigem usuário autenticado.

## Identidade na partida

O nome em `TriviaSession` é específico daquele jogo. `profile_id` liga esse participante a uma conta sem transformar o nome do jogo em cadastro global. Não existe diretório público de perfis.

## Formas de vínculo

- e-mail opcional informado pelo host: guardado em `participant_invites`, com RLS owner-only;
- link individual legado: `claim_participant(token)`;
- link histórico genérico: `claim_participant_by_game(game_token, participant_id)`;
- convite permanente: `claim_session_participant(join_token, participant_client_id)`.

As três RPCs antigas permanecem com as mesmas assinaturas. A migration `0009` adiciona o fluxo permanente sem reescrevê-las nem executar backfill sobre dados reais.

## Privacidade

- o host reutiliza apenas e-mails que ele próprio já convidou;
- a UI não consulta se um endereço possui conta;
- listas de claim nunca retornam e-mail;
- e-mail válido atua somente como comparação server-side com `auth.email()`;
- e-mail vazio ou inválido não reserva slot e não bloqueia o jogo;
- QR é gerado localmente com `qrcode`, sem request a geradores externos.

## Correcao e auditoria

Claims não são apagados. Uma correção muda o estado para `revoked`, grava data e ator e, se o jogo já foi normalizado, limpa apenas o `profile_id` correspondente. Índices e locks no banco resolvem disputas; a UI não é a barreira de segurança.

## RLS

RLS está habilitado em todas as tabelas. O host lê/escreve seus snapshots; leitores de um jogo são o host ou participantes vinculados; convites com PII são owner-only. O ledger não aceita escrita direta de `authenticated`, `anon` ou `public`.
