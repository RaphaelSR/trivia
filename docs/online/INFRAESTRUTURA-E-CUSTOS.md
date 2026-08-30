# Online: Infraestrutura e Custos

## Stack

- frontend estático React/Vite no GitHub Pages;
- Supabase Database + Auth + Storage;
- acesso pelo SDK `@supabase/supabase-js` e anon key protegida por RLS;
- funções transacionais implementadas como Database Functions PostgreSQL;
- `qrcode` no bundle para gerar SVG localmente.

Não há API própria, Edge Function ou serviço externo de QR. O autocomplete da roleta usa Apple/iTunes sem chave e falha silenciosamente; ele é independente da conta e da sincronização da partida.

## Dependencia `qrcode`

É uma dependência de runtime consciente. Ela substitui requests para `api.qrserver.com`, evitando enviar tokens de claim a terceiros. O app usa apenas geração SVG no navegador. Entrada manual/cópia do link continua disponível se o QR falhar.

## Storage de avatares

O bucket público `profile-avatars` armazena apenas WebP de até 1 MB em caminhos `uid/uuid.webp`. O processamento usa Canvas do navegador, sem biblioteca ou serviço externo de imagem. A leitura pública é uma decisão própria de foto de perfil; escrita e remoção exigem usuário autenticado, pasta própria e RLS.

## Segurança de chaves

- anon key pode estar no frontend; RLS limita o acesso;
- `service_role`, senha do banco e tokens pessoais nunca entram no bundle ou docs;
- mutations privilegiadas usam RPCs autenticadas, `search_path` vazio e schemas explícitos.

## Keep-alive gratuito do Supabase

O projeto usa `.github/workflows/supabase-keepalive.yml` para reduzir o risco de
pausa por inatividade no plano Free. O workflow roda diariamente e faz três
consultas REST mínimas em `online_sessions`. A política RLS devolve uma lista
vazia para a anon key, portanto a rotina exercita o banco sem ler dados de
usuários e sem criar ou alterar registros.

Esta é a opção padrão porque não adiciona infraestrutura nem assinatura:

- usa apenas o runner Linux padrão do GitHub Actions em um repositório público;
- permanece dentro do Supabase Free e produz tráfego desprezível;
- reutiliza `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` dos GitHub Actions Secrets;
- não usa `service_role`, Edge Function, API própria ou serviço de cron externo;
- falha quando a API não responde HTTP 200, deixando o problema visível no histórico do workflow.

Um intervalo de cinco dias não é usado porque deixa pouca margem dentro da
janela de inatividade do Supabase. A execução diária tolera atrasos ocasionais
do agendador sem gerar custo relevante.

### Limitações operacionais

- O workflow agendado só executa a versão existente na branch padrão `main`.
- Em repositórios públicos, o GitHub pode desativar schedules depois de 60 dias
  sem atividade no repositório. Ao retomar um projeto parado, verificar se o
  workflow continua habilitado e executar `workflow_dispatch` manualmente.
- O keep-alive reduz o risco de pausa, mas não substitui garantia de disponibilidade.
  O plano pago do Supabase só deve ser considerado se a disponibilidade passar
  a ser requisito de produção; não é necessário para o uso atual.
- Preços, cotas e critérios de inatividade são políticas externas e devem ser
  conferidos nos painéis do Supabase e do GitHub antes de decisões de escala.

## Operacao

A arquitetura atual prioriza custo zero, pouco volume, simplicidade e degradação
segura em falha de rede. Nenhuma automação deste repositório deve ativar plano
pago, runner maior ou recurso faturável automaticamente.
