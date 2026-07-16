# Modulo Online

O modo `online` esta ativo e continua local-first: jogar, pontuar e editar o elenco nao dependem da disponibilidade do Supabase. Quando o host entra na conta, a sessao tambem e replicada para a nuvem, ganha historico normalizado e recursos de identidade.

## O que existe

- autenticação por e-mail e senha;
- um snapshot online ativo por conta, com reconciliacao entre dispositivos;
- checkpoints locais e snapshots remotos de restauração;
- histórico normalizado com times, participantes, filmes, perguntas e eventos;
- convite individual legado (`/claim?token=`) e convite historico generico (`/claim?game=`);
- convite permanente ao vivo (`/claim?session=`), com um QR por sessao;
- claims auditaveis, reserva opcional por e-mail e correcao pelo host;
- QR gerado no navegador, sem enviar o token a servicos externos.

## Limites deliberados

- `demo` e `offline` nao usam conta, QR ou RPCs de claim;
- identidade e claims nao entram em `TriviaSession` nem no motor de turnos;
- campeonatos e leaderboards entre partidas continuam planejados;
- migrations sao aplicadas manualmente no Supabase antes do frontend correspondente.

## Documentos

- [ARQUITETURA-ONLINE.md](./ARQUITETURA-ONLINE.md): modelo real, idempotencia e fronteiras
- [MODOS-DE-USO.md](./MODOS-DE-USO.md): fluxos do host e dos jogadores
- [AUTENTICACAO.md](./AUTENTICACAO.md): identidade, claims, privacidade e RLS
- [AMBIENTE-E-DEPLOY.md](./AMBIENTE-E-DEPLOY.md): migrations, GitHub Pages e operacao
- [INFRAESTRUTURA-E-CUSTOS.md](./INFRAESTRUTURA-E-CUSTOS.md): stack e dependencias externas
