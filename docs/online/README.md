# Conta e Recursos Conectados

O diretório mantém o nome `online` por compatibilidade documental. No produto, conta e sincronização são capacidades opcionais da `Partida completa`: jogar, pontuar e editar o elenco não dependem do Supabase. Quando o host entra, a partida também é replicada para a nuvem, ganha histórico normalizado e recursos de identidade.

## O que existe

- autenticação por e-mail e senha;
- um snapshot online ativo por conta, com sessões anteriores arquivadas e retomáveis;
- seleção explícita de entrada e reconciliação causal apenas entre versões do mesmo ID;
- checkpoints locais e snapshots remotos de restauração;
- histórico normalizado com times, participantes, filmes, perguntas e eventos;
- convite individual legado (`/claim?token=`) e convite historico generico (`/claim?game=`);
- convite permanente ao vivo (`/claim?session=`), com um QR por sessao;
- claims auditaveis, reserva opcional por e-mail e correcao pelo host;
- QR gerado no navegador, sem enviar o token a servicos externos.
- avatar opcional de conta, com processamento no navegador, Storage owner-only e leitura limitada a sessões/jogos compartilhados.

## Limites deliberados

- `Demo` nunca usa QR, RPCs de claim ou identidades remotas. Partidas completas deslogadas também não fazem essas chamadas;
- o valor interno `offline` pode sincronizar quando há conta; o gate correto é a capacidade conectada, não o nome do modo;
- identidade e claims nao entram em `TriviaSession` nem no motor de turnos;
- campeonatos e leaderboards entre partidas continuam planejados;
- migrations sao aplicadas manualmente no Supabase antes do frontend correspondente.

## Documentos

- [ARQUITETURA-ONLINE.md](./ARQUITETURA-ONLINE.md): modelo real, idempotencia e fronteiras
- [MODOS-DE-USO.md](./MODOS-DE-USO.md): fluxos do host e dos jogadores
- [AUTENTICACAO.md](./AUTENTICACAO.md): identidade, claims, privacidade e RLS
- [AMBIENTE-E-DEPLOY.md](./AMBIENTE-E-DEPLOY.md): migrations, GitHub Pages e operacao
- [INFRAESTRUTURA-E-CUSTOS.md](./INFRAESTRUTURA-E-CUSTOS.md): stack e dependencias externas
