## Diagnóstico

O erro `faqItems.map is not a function` ocorre na Landing exatamente após o usuário trocar o idioma para "Português (Brasil)" (visível no session replay).

**Causa raiz:** Várias partes da Landing (e Pricing/Dashboard/PersonalCalendar) usam `t('chave', { returnObjects: true })` para ler arrays/objetos do JSON. Durante a troca de idioma:
1. O i18next altera `i18n.language` e dispara re-render.
2. O cast TypeScript (`as Array<...>`) **não valida** o retorno em runtime.
3. Se a chave ainda não está resolvida no novo namespace (race momentâneo) ou se o i18next por configuração padrão devolve a string da própria chave (`"faq.items"`) em vez do array, `.map()` quebra a página inteira via `ErrorBoundary`.

O problema é potencial em **todos** os locais listados abaixo — não só no FAQ. Hoje o JSON do FAQ está correto em pt-BR e en, então o gatilho mais provável é o instante de transição de idioma.

## Locais afetados (mesmo padrão frágil)

- `src/pages/Landing.tsx` → `faq.items`
- `src/pages/Pricing.tsx` → `faq.items`
- `src/pages/Dashboard.tsx` → `weekdays`
- `src/pages/PersonalCalendar.tsx` → `weekdays`
- `src/components/landing/TaskMarquee.tsx` → `marquee.items`
- `src/components/landing/FloatingTasksBackground.tsx` → `floating.items`
- `src/components/landing/featurePreviews.tsx` (8 ocorrências):
  - `previews.kanban.cards.todo|doing|done`
  - `previews.meeting.items`
  - `previews.dashboard.tasks`
  - `previews.calendar.days`
  - `previews.calendar.events` (Record)
  - `previews.workInstructions.steps`
  - `previews.ideas.items`

## Plano de correção

### 1. Criar helper utilitário `safeTArray` / `safeTObject`
Arquivo novo: `src/i18n/safeT.ts`
- `safeTArray<T>(value: unknown, fallback: T[] = []): T[]` → retorna `value` se for array, senão `fallback`.
- `safeTObject<T>(value: unknown, fallback: T = {} as T): T` → retorna `value` se for objeto plano, senão `fallback`.

Esse helper blinda **todo** local que faz `returnObjects: true`, evitando crashes em qualquer transição de idioma futura.

### 2. Refatorar os 12 pontos de uso
Substituir o padrão atual:
```ts
const faqItems = t('faq.items', { returnObjects: true }) as Array<{ q: string; a: string }>;
```
Por:
```ts
const faqItems = safeTArray<{ q: string; a: string }>(
  t('faq.items', { returnObjects: true })
);
```

E análogo para `safeTObject` no caso de `previews.calendar.events` (que é um Record).

### 3. Garantir que i18n inicializou antes de renderizar a Landing
No `src/i18n/index.ts`, atualmente `useSuspense: false`. Isso é correto porque os recursos são estáticos, mas vou adicionar uma proteção extra:
- Em `Landing.tsx` (e Pricing.tsx), adicionar early-return curto enquanto `i18n.isInitialized` for `false` (mostra um placeholder simples) — evita o instante de transição.

### 4. Validação
- Trocar idioma EN → PT-BR e vice-versa várias vezes na Landing.
- Recarregar com `app_locale=pt-BR` no localStorage.
- Verificar console limpo e nenhuma quebra do ErrorBoundary.
- Conferir que Pricing também não quebra.

## Arquivos que serão modificados

- **Criado:** `src/i18n/safeT.ts`
- **Editado:** `src/pages/Landing.tsx`, `src/pages/Pricing.tsx`, `src/pages/Dashboard.tsx`, `src/pages/PersonalCalendar.tsx`
- **Editado:** `src/components/landing/TaskMarquee.tsx`, `FloatingTasksBackground.tsx`, `featurePreviews.tsx`

## Resultado esperado

Trocar idioma na Landing (e em qualquer lugar do app que use `returnObjects: true`) nunca mais derruba a página — no pior cenário, o conteúdo aparece vazio por uma fração de segundo até o próximo render aplicar o idioma novo.