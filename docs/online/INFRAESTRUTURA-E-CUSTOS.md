# Online: Infraestrutura e Custos

## Stack

- frontend estático React/Vite no GitHub Pages;
- Supabase Database + Auth + Storage;
- acesso pelo SDK `@supabase/supabase-js` e anon key protegida por RLS;
- funções transacionais implementadas como Database Functions PostgreSQL;
- `qrcode` no bundle para gerar SVG localmente.

Não há API própria, Edge Function ou serviço externo de QR. O autocomplete da roleta usa Apple/iTunes sem chave e falha silenciosamente; ele não participa do modo online.

## Dependencia `qrcode`

É uma dependência de runtime consciente. Ela substitui requests para `api.qrserver.com`, evitando enviar tokens de claim a terceiros. O app usa apenas geração SVG no navegador. Entrada manual/cópia do link continua disponível se o QR falhar.

## Storage de avatares

O bucket público `profile-avatars` armazena apenas WebP de até 1 MB em caminhos `uid/uuid.webp`. O processamento usa Canvas do navegador, sem biblioteca ou serviço externo de imagem. A leitura pública é uma decisão própria de foto de perfil; escrita e remoção exigem usuário autenticado, pasta própria e RLS.

## Segurança de chaves

- anon key pode estar no frontend; RLS limita o acesso;
- `service_role`, senha do banco e tokens pessoais nunca entram no bundle ou docs;
- mutations privilegiadas usam RPCs autenticadas, `search_path` vazio e schemas explícitos.

## Operacao

O custo e os limites dependem do plano vigente do Supabase e do GitHub; verificar nos painéis antes de decisões de escala. A arquitetura atual prioriza pouco volume, simplicidade e degradação segura em falha de rede.
