

# Restringir Configurações a Administradores

## Mudanças

### 1. `src/components/AppSidebar.tsx`
- Mover o item "Configurações" para dentro do bloco condicional `{isAdmin && ...}`, junto com "Administração".

### 2. `src/pages/Settings.tsx`
- Adicionar verificação de role admin no início da página.
- Se não for admin, redirecionar para `/` com `<Navigate>`.
- Usar a mesma lógica de `supabase.rpc('has_role', ...)` já usada no sidebar.

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/components/AppSidebar.tsx` | Esconder link "Configurações" para não-admins |
| `src/pages/Settings.tsx` | Guardar rota — redirecionar não-admins |

