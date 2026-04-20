
## Tornar a Landing mais fluída com aspecto de "tarefas"

### Diagnóstico atual
- Hero é só texto centralizado — não comunica visualmente "isto é uma ferramenta de tarefas".
- Features são cards iguais, sem prévia visual do produto (a prévia só aparece em modal após clique).
- Falta movimento sutil que sugira fluxo de trabalho.

### Conceito visual
Background "vivo" com **cards de tarefas flutuando lentamente** em diagonal, semi-transparentes, atrás do conteúdo principal. Mantém todo o conteúdo (hero, features, steps, highlights, FAQ, footer) — apenas adiciona camada visual e melhora a apresentação das features.

### Mudanças propostas

**1. Hero — Mockup de Kanban ao lado do texto + ticker de fundo**
- Hero passa de centralizado para **2 colunas em desktop** (texto à esquerda, mockup à direita), mantendo centralizado no mobile.
- À direita: mini-Kanban estático com 3 colunas e cards realistas (reaproveita `KanbanPreview` do `FeaturePreviewDialog`), com leve rotação 3D (`rotate-y` sutil) e sombra forte.
- Atrás de tudo na seção Hero: **camada de cards de tarefa flutuantes** (5-6 cards pequenos) com animação `float` lenta (20-30s), opacidade 8-12%, ângulos variados. Ícones de check, prazo, responsável.
- Mantém badge, h1, parágrafo, CTAs (trial + contato) e a frase "14 dias grátis".

**2. Features — substituir cards-genéricos por preview visual inline**
- Cada card de feature mostra **uma miniatura visual do módulo** no topo (não só ícone), reaproveitando os mesmos previews já existentes em `FeaturePreviewDialog.tsx`, mas em escala reduzida (≈ 160px de altura, `pointer-events: none`, `scale-[0.55]` com `transform-origin: top left` num container `overflow-hidden`).
- Abaixo: ícone + título + descrição (como hoje).
- Mantém o "Clique para ver exemplo →" e o dialog continua abrindo a versão full ao clicar.
- Grid passa de `lg:grid-cols-4` para `lg:grid-cols-2` (cards maiores, 2 colunas) — dá protagonismo visual ao preview.

**3. Banda de "tarefas concluídas" entre seções (transição fluida)**
- Faixa fina entre Features e How-it-works com ~6 chips de tarefa rolando horizontalmente em loop infinito (marquee CSS), exemplos: "✓ Sprint review concluída", "→ Deploy v2.0 em andamento", "📌 Reunião 15:00", "⏱ Pomodoro 25min", etc. Opacidade 60%, fundo sutil, sem interação.

**4. Mini-mockups de fundo nas seções "Como funciona" e "FAQ"**
- Camada de fundo decorativa em `<section>` "Como funciona": silhueta blur de calendário grande no canto direito, opacidade 5-8%.
- FAQ: silhueta de checklist no canto esquerdo, mesma opacidade.
- Apenas decoração, `pointer-events-none`, `aria-hidden`.

### Detalhes técnicos
- **Novo componente** `src/components/landing/FloatingTasksBackground.tsx` — renderiza N cards absolutos com `animation: float-slow 25s ease-in-out infinite alternate` e delays escalonados. Usa apenas Tailwind + keyframe novo.
- **Novo componente** `src/components/landing/FeatureMiniPreview.tsx` — wrapper que renderiza o componente preview correspondente ao título, com escala fixa, sem interação. Importa as mesmas funções já definidas no map de `FeaturePreviewDialog.tsx` (refatorar: extrair o `previewMap` para `landing/featurePreviews.tsx` para reuso).
- **Novo keyframe** em `tailwind.config.ts`:
  - `float-slow`: translate suave Y±20px e rotate ±2deg ao longo de 25s.
  - `marquee`: `translateX(0)` → `translateX(-50%)` em 30s linear infinite.
- **Refatoração**: mover `previewMap` e os componentes `*Preview` de `FeaturePreviewDialog.tsx` para `src/components/landing/featurePreviews.tsx` (export nomeado). `FeaturePreviewDialog` passa a importar de lá. Sem mudança de comportamento.
- Performance: cards flutuantes usam `transform` apenas (GPU), `will-change: transform`, e respeitam `prefers-reduced-motion` (sem animação se reduzido).
- Acessibilidade: toda decoração `aria-hidden="true"`. Mockup do hero também `aria-hidden`.

### Arquivos afetados
- `src/pages/Landing.tsx` — hero em 2 colunas, grid de features 2 colunas com mini-previews, marquee entre seções, decorações nas seções.
- `src/components/landing/FeaturePreviewDialog.tsx` — passa a importar `previewMap` do novo arquivo.
- **Novos:**
  - `src/components/landing/featurePreviews.tsx` (extração)
  - `src/components/landing/FloatingTasksBackground.tsx`
  - `src/components/landing/FeatureMiniPreview.tsx`
  - `src/components/landing/TaskMarquee.tsx`
- `tailwind.config.ts` — keyframes `float-slow` e `marquee`.

### Fora de escopo
- Mudar copy, FAQs, header, footer, CTAs (trial/contato) — permanecem idênticos.
- Adicionar imagens reais/screenshots externos — usaremos os mocks já construídos no projeto.
- Mexer em `/precos` ou outras páginas.
- Tema escuro de cores novas — usa tokens existentes.
