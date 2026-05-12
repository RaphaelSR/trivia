# Modulo Online

Indice da documentacao oficial do modo `online`.

## Status
- O modulo `online` ainda esta em planejamento e evolucao tecnica.
- O repositorio principal ja possui adapters dedicados para sessao e PIN.
- Os documentos desta pasta descrevem a direcao desejada, nao uma entrega completa ja disponivel na UI.
- Supabase e a decisao oficial de infraestrutura remota para o proximo ciclo.
- O adapter online atual e apenas um cache local isolado ate a chegada do `SupabaseSessionRepository`.

## Documentos
- [ARQUITETURA-ONLINE.md](./ARQUITETURA-ONLINE.md): modelo de dados, queries e principios de persistencia
- [MODOS-DE-USO.md](./MODOS-DE-USO.md): cenarios de uso, entidades e regras de negocio do modulo
- [AUTENTICACAO.md](./AUTENTICACAO.md): conta opcional, claiming e identidade
- [AMBIENTE-E-DEPLOY.md](./AMBIENTE-E-DEPLOY.md): ambiente, deploy e preocupacoes operacionais
- [INFRAESTRUTURA-E-CUSTOS.md](./INFRAESTRUTURA-E-CUSTOS.md): impacto de stack, servicos e custos

## Leitura recomendada
1. [../ARQUITETURA.md](../ARQUITETURA.md)
2. [ARQUITETURA-ONLINE.md](./ARQUITETURA-ONLINE.md)
3. [MODOS-DE-USO.md](./MODOS-DE-USO.md)
