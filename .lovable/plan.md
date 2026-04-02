

# Substituir logo do NEVVOH

## Resumo
Substituir o ícone atual (CheckSquare do Lucide) pelo novo logo enviado em todos os locais do app, e usá-lo também como favicon.

## Locais identificados

| Arquivo | O que mudar |
|---------|------------|
| `src/components/AppSidebar.tsx` | Ícone na sidebar header |
| `src/pages/Auth.tsx` | Ícone na tela de login |
| `src/pages/Landing.tsx` | Ícone no header da landing |
| `index.html` | Adicionar favicon com o novo logo |

## Alterações

### 1. Copiar o logo para o projeto
- Copiar `user-uploads://Sem_nome_Logotipo_animado.png` para `src/assets/logo.png` (para uso em componentes React)
- Copiar também para `public/favicon.png` (para favicon)

### 2. Atualizar favicon (`index.html`)
- Adicionar `<link rel="icon" href="/favicon.png" type="image/png">`
- Remover `public/favicon.ico` se existir

### 3. Substituir ícone nos 3 componentes
Em cada arquivo, trocar o bloco com `CheckSquare` dentro de um `div` colorido por uma tag `<img>` com o logo importado:

- **AppSidebar.tsx**: remover import do `CheckSquare`, importar logo de `@/assets/logo.png`, substituir o `div` com ícone por `<img src={logo} alt="NEVVOH" className="h-9 w-9 rounded-xl" />`
- **Auth.tsx**: mesmo padrão, `<img src={logo} alt="NEVVOH" className="h-14 w-14 rounded-2xl" />`
- **Landing.tsx**: mesmo padrão, `<img src={logo} alt="NEVVOH" className="h-9 w-9 rounded-xl" />`

### Arquivos
- `index.html` — adicionar favicon
- `src/components/AppSidebar.tsx` — trocar ícone
- `src/pages/Auth.tsx` — trocar ícone
- `src/pages/Landing.tsx` — trocar ícone

