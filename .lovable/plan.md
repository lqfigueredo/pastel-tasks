

# Correção: RLS impede criação de time

## Problema

O código faz `.insert().select().single()` na tabela `teams`. A INSERT policy (`auth.uid() = created_by`) passa, mas o `.select()` encadeado precisa de uma SELECT policy que também passe. As SELECT policies existentes são:

1. **"Admins can view all teams"** — requer role `admin` (usuário não tem)
2. **"Members can view team"** — checa `get_user_team_ids()`, que consulta `team_members` — mas o usuário ainda não foi adicionado como membro (isso acontece na linha seguinte do código)

Resultado: o PostgREST rejeita a operação porque não consegue retornar a row inserida via SELECT.

## Solução

### 1. Adicionar SELECT policy para criadores

Migration SQL:
```sql
CREATE POLICY "Creator can view own team"
ON public.teams
FOR SELECT
TO authenticated
USING (created_by = auth.uid());
```

Isso é semanticamente correto — o criador do time sempre deve poder vê-lo, independente de estar na tabela `team_members`.

### Resultado
- Qualquer usuário autenticado poderá criar times (como já era a intenção)
- O `.insert().select().single()` funcionará porque a nova SELECT policy cobre o caso

## Detalhes técnicos
- Arquivo afetado: apenas uma migration SQL
- Nenhuma alteração de código no frontend necessária

