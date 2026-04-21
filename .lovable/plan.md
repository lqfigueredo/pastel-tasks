

## Tela branca em produção — fix do chunk de charts

### Causa raiz (confirmada)

Console de produção (`https://nevvoh.com/auth`) mostra erro fatal no carregamento:

```
ReferenceError: Cannot access 'P' before initialization
  at vendor-charts-CGpoBNme.js
```

Isso acontece **antes** do React montar — daí a tela 100% branca. O `ErrorBoundary` nem chega a executar.

A regra de `manualChunks` em `vite.config.ts` separa o `recharts` das suas dependências `d3-*` em **chunks que se referenciam mutuamente**. Quando o Rollup minifica e renomeia bindings (`P`), uma das partes é executada antes da outra estar inicializada (TDZ — Temporal Dead Zone). É um problema clássico de divisão errada de chunk com módulos que têm dependência circular interna (recharts/d3-shape/d3-scale).

### Por que só agora apareceu

O bundle agora carrega `vendor-charts` mais cedo (via grafo de imports a partir do `Landing`/`AppLayout` lazy chains após adições recentes — react-markdown, turnstile mexeram na ordem dos chunks). Em dev funciona porque não há minificação/code-split agressivo.

### Fix

Unificar `recharts` + `d3-*` no **mesmo chunk** para o Rollup respeitar a ordem de inicialização. É a correção padrão deste tipo de TDZ.

**Mudança em `vite.config.ts`:**

```ts
// antes
if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';

// depois — apenas garante recharts e d3 juntos; remove split desnecessário
if (
  id.includes('recharts') ||
  id.includes('/d3-') ||
  id.includes('victory-vendor') ||  // dep interna do recharts que também usa d3
  id.includes('internmap') ||
  id.includes('delaunator') ||
  id.includes('robust-predicates')
) {
  return 'vendor-charts';
}
```

Adiciono também as dependências transitivas do recharts (`victory-vendor`, `internmap`, etc.) que herdam do mesmo grafo do d3 e podem cair em outro chunk genérico se não forem explicitadas.

### Hardening adicional

- Remover `src/App.css` morto (não é importado em lugar nenhum, mas tem `#root { max-width: 1280px }` que quebraria layout se alguém o re-importasse no futuro).
- No `ErrorBoundary`, adicionar fallback para `ReferenceError` de chunks também (logar e tentar `window.location.reload()` automático uma vez), para que erros futuros de chunk não deixem o usuário com tela branca permanente.

### Como vou validar

1. Aplicar a mudança no `vite.config.ts`.
2. Pedir ao usuário para clicar em **Publicar → Atualizar** (mudanças de frontend só vão ao ar com deploy).
3. Confirmar via browser tool que `/auth` em produção carrega o formulário de login.

### Arquivos

**Modificados:**
- `vite.config.ts` — agrupar recharts + d3 + deps transitivas no mesmo chunk
- `src/components/ErrorBoundary.tsx` — recovery automático para erros de chunk

**Removidos:**
- `src/App.css` (morto, risco futuro)

### Riscos

- Nenhum — a mudança apenas une chunks que já existem juntos no grafo de dependências. Tamanho do bundle final é praticamente o mesmo (talvez ~5KB de overhead de gzip economizado por evitar duplicação).

