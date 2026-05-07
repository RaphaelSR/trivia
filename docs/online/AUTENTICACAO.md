# Módulo Online — Autenticação e Segurança

> **Status:** Planejamento — ainda não implementado.

---

## 1. Visão Geral

A autenticação do módulo online usa o **Supabase Auth** — um sistema completo que inclui gerenciamento de sessões, tokens JWT, e integração direta com as regras de segurança do banco de dados (Row Level Security).

O princípio central é: **o jogo funciona sem login**. A autenticação é uma camada opcional que desbloqueia funcionalidades extras, não um pré-requisito para jogar.

---

## 2. Tipos de Usuário

### Usuário Anônimo
Não tem conta. Pode hospedar e participar de jogos normalmente. Seus dados ficam salvos, mas sem vínculo a uma identidade persistente. É o modo padrão.

### Usuário Autenticado (com conta)
Tem email + senha (ou outro provedor). Seu `user_id` é fixo e permanente. Pode recuperar sessões, vincular histórico de jogos anteriores à conta, e ter um perfil.

### Sessão Anônima do Supabase
Existe um terceiro modo: o Supabase pode criar uma **sessão anônima** — o usuário não tem email/senha, mas recebe um `uid` temporário para a sessão do navegador. Isso permite usar as Row Level Security policies mesmo sem login formal. Se o usuário depois cria uma conta, o Supabase consegue migrar a sessão anônima para a conta permanente.

---

## 3. Fluxos de Autenticação

### 3.1 Nenhum login (padrão atual)

```
Usuário abre o app
↓
Nenhuma ação de auth necessária
↓
Cria/entra em jogo normalmente
↓
Dados salvos no Supabase sem user_id vinculado
```

Esse é o fluxo que já existe hoje no modo offline, adaptado para persistir no Supabase em vez do localStorage.

---

### 3.2 Criação de conta

```
Usuário acessa "Criar conta"
↓
Insere email + senha
↓
Supabase envia email de confirmação
↓
Usuário confirma → conta criada
↓
Trigger no banco cria automaticamente uma linha em profiles
↓
Usuário logado, user_id disponível na sessão
```

**Trigger de criação de perfil (SQL):**
```sql
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

---

### 3.3 Login

```
Usuário acessa "Entrar"
↓
Insere email + senha
↓
Supabase valida e retorna session (access_token + refresh_token)
↓
Tokens armazenados automaticamente pelo SDK no localStorage
↓
Sessão renovada automaticamente enquanto o app estiver aberto
```

No código:
```ts
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'usuario@email.com',
  password: 'senha123'
});
```

---

### 3.4 Recuperação de sessão (motivação principal para ter conta)

Com conta, o usuário pode fechar o app, abrir em outro dispositivo, e continuar de onde parou.

```
Usuário tinha um jogo ativo → fechou o navegador
↓
Abre o app novamente → SDK detecta token salvo → sessão restaurada automaticamente
↓
App consulta: "existe algum jogo ativo com host_user_id = meu user_id?"
↓
Exibe opção de continuar o jogo
```

Sem conta, isso não é possível — o localStorage é local ao dispositivo e à sessão.

---

### 3.5 Vinculação de histórico (claim)

Descrito em detalhes em `MODOS-DE-USO.md`, seção E. Em termos de auth:

```
Usuário já tem conta (está logado)
↓
Acessa link/insere código com claim_token
↓
Sistema executa:
  UPDATE participants
  SET user_id = auth.uid(), claim_token = null
  WHERE claim_token = <token>
    AND user_id IS NULL
↓
Histórico vinculado — aparece no perfil imediatamente
```

A operação usa `auth.uid()` — a função do Supabase que retorna o ID do usuário logado na sessão atual. Isso garante que ninguém pode reivindicar um histórico em nome de outra pessoa.

---

## 4. Row Level Security (RLS)

O RLS é a camada de segurança do banco de dados. Cada tabela tem políticas que definem quem pode ler, inserir, atualizar ou deletar cada linha — diretamente no PostgreSQL, sem depender do código da aplicação.

**Por que isso importa:** mesmo que alguém faça uma requisição direta à API do Supabase (bypassando o frontend), as políticas garantem que não consegue ver ou alterar dados que não são seus.

### 4.1 Tabela `profiles`

```sql
-- Qualquer um pode ver perfis públicos
create policy "profiles_select_public"
  on profiles for select using (true);

-- Só o próprio usuário pode editar seu perfil
create policy "profiles_update_own"
  on profiles for update using (auth.uid() = id);
```

### 4.2 Tabela `games`

```sql
-- Qualquer um pode ver qualquer jogo
create policy "games_select_all"
  on games for select using (true);

-- Qualquer um pode criar um jogo (com ou sem conta)
create policy "games_insert_any"
  on games for insert with check (true);

-- Só o host pode atualizar o jogo
-- (se host_user_id for null, ninguém atualiza via RLS — precisa de service_role)
create policy "games_update_host"
  on games for update
  using (auth.uid() = host_user_id);
```

### 4.3 Tabela `participants`

```sql
-- Todos podem ver participantes de qualquer jogo
create policy "participants_select_all"
  on participants for select using (true);

-- Qualquer um pode ser adicionado como participante
create policy "participants_insert_any"
  on participants for insert with check (true);

-- Só o próprio usuário pode vincular sua conta (claim)
-- ou o host pode atualizar participantes do seu jogo
create policy "participants_update"
  on participants for update using (
    -- o próprio usuário faz o claim
    (auth.uid() is not null and user_id is null and claim_token is not null)
    or
    -- o host do jogo atualiza qualquer participante
    auth.uid() = (
      select host_user_id from games where id = game_id
    )
  );
```

### 4.4 Tabela `answers`

```sql
-- Todos podem ver as respostas (transparência do jogo)
create policy "answers_select_all"
  on answers for select using (true);

-- Só o host do jogo pode registrar respostas
create policy "answers_insert_host"
  on answers for insert with check (
    auth.uid() = (
      select host_user_id from games where id = game_id
    )
  );

-- Respostas são imutáveis — ninguém atualiza ou deleta
```

### 4.5 Tabela `championships`

```sql
-- Todos podem ver campeonatos
create policy "championships_select_all"
  on championships for select using (true);

-- Só usuários autenticados criam campeonatos
create policy "championships_insert_auth"
  on championships for insert
  with check (auth.uid() = created_by);

-- Só o criador pode editar
create policy "championships_update_owner"
  on championships for update
  using (auth.uid() = created_by);
```

### 4.6 Tabela `championship_games`

```sql
-- Todos podem ver os vínculos
create policy "championship_games_select_all"
  on championship_games for select using (true);

-- Só o dono do campeonato pode adicionar/remover jogos
create policy "championship_games_manage"
  on championship_games for all using (
    auth.uid() = (
      select created_by from championships
      where id = championship_id
    )
  );
```

---

## 5. Tokens e Sessão no Frontend

O Supabase SDK cuida de toda a gestão de tokens automaticamente:

- O `access_token` (JWT) é enviado em cada requisição ao banco.
- O `refresh_token` renova a sessão sem intervenção do usuário.
- Ambos ficam no `localStorage` do navegador por padrão.
- A sessão é restaurada automaticamente ao reabrir o app.

Para acessar o usuário atual no código:
```ts
const { data: { user } } = await supabase.auth.getUser();
// user.id = o auth.uid() que as RLS policies usam
```

Para observar mudanças de sessão em tempo real:
```ts
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') { /* usuário logou */ }
  if (event === 'SIGNED_OUT') { /* usuário saiu */ }
});
```

---

## 6. O que Não Fazer

- **Não armazenar senhas no código.** As credenciais do Supabase usadas no frontend são a `anon key` — uma chave pública de leitura limitada. A `service_role key` nunca deve ir para o frontend.
- **Não desabilitar RLS.** Mesmo durante desenvolvimento, manter o RLS ativo evita surpresas na produção.
- **Não confiar apenas no frontend para segurança.** Qualquer regra crítica (quem pode atualizar o jogo, quem pode fazer claim) deve estar nas policies do banco, não só no código TypeScript.

---

## 7. Variáveis de Ambiente Necessárias

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<chave pública do projeto>
```

A `anon key` é segura para ficar no frontend — é pública por design. O RLS é o que limita o que ela pode fazer.

Ver `AMBIENTE-E-DEPLOY.md` para instruções completas de configuração.
