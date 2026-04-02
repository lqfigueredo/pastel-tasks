

# Corrigir logo deformado ao minimizar menu lateral

## Problema
Quando o menu lateral é minimizado (`collapsible="icon"`), a largura colapsa para `3rem` (48px). O logo tem `h-9 w-9` (36px) mas o `SidebarHeader` tem `p-4` (16px de padding em cada lado), totalizando 36+32 = 68px necessários — muito mais que os 48px disponíveis. O logo é comprimido horizontalmente.

## Solução

### 1. Aumentar largura do sidebar colapsado
Em `src/components/ui/sidebar.tsx`, alterar `SIDEBAR_WIDTH_ICON` de `"3rem"` para `"3.5rem"` (56px), acomodando o logo de 36px com algum padding.

### 2. Ajustar padding do header quando colapsado
Em `src/components/AppSidebar.tsx`, usar padding menor quando colapsado e garantir que o logo não distorça com `object-contain`:

```tsx
<SidebarHeader className={collapsed ? "p-2" : "p-4"}>
  <div className="flex items-center gap-2 justify-center">
    <img src={logo} alt="NEVVOH" className="h-9 w-9 shrink-0 rounded-xl object-contain" />
    {!collapsed && (
      <span className="font-display text-lg font-bold text-foreground">NEVVOH</span>
    )}
  </div>
</SidebarHeader>
```

### Arquivos
- `src/components/ui/sidebar.tsx` — ajustar `SIDEBAR_WIDTH_ICON`
- `src/components/AppSidebar.tsx` — ajustar padding e centralizar logo

