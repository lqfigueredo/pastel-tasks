

# Modo Escuro

O projeto já tem variáveis CSS para `.dark` definidas em `index.css` e `darkMode: ["class"]` no Tailwind. Falta apenas o mecanismo de alternância.

## Mudanças

### 1. Criar hook `src/hooks/use-theme.tsx`

- Context + Provider que gerencia `"light" | "dark" | "system"`
- Persiste preferência em `localStorage` (chave `theme`)
- Aplica/remove classe `dark` no `<html>`
- Respeita `prefers-color-scheme` quando em modo "system"

### 2. Criar botão `src/components/ThemeToggle.tsx`

- Ícone Sol/Lua que alterna entre light e dark
- Usa o hook `useTheme`

### 3. Integrar

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | Envolver app com `ThemeProvider` |
| `src/components/AppSidebar.tsx` | Adicionar `ThemeToggle` no footer, acima do botão Sair |
| `src/pages/Auth.tsx` | Adicionar `ThemeToggle` no canto superior direito |

