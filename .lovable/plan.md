## Problema

Em fundos escuros (Deep Navy `#26215C`), vários textos usam o **Mid Purple `#534AB7`** (token `--primary`) — a diferença de luminância entre eles é mínima e o texto fica praticamente invisível. Identifiquei os casos no print da landing:

- **"simple and efficient"** (highlight do título) — `text-primary` sobre navy
- **"Flowly — born from 'new'…"** (tagline em itálico) — `text-primary/80`, ainda pior com 80% de opacidade
- **Badge "Productivity without complexity"** — `text-primary` + `bg-primary/5`, quase some
- **Chips de tarefas flutuantes** no fundo da hero — opacidade baixa demais
- **"Open platform"** no footer — `text-primary`

Os textos `text-muted-foreground` (lilás `#CECBF6`) já estão legíveis e ficam como estão.

## Causa raiz

O token `--primary` é o mesmo nos dois modos (Mid Purple), mas em dark mode ele fica adjacente ao navy de fundo. Não vou trocar o `--primary` em si (é a cor dos CTAs e isso quebraria identidade), e sim **substituir os usos de `text-primary` em texto sobre fundo escuro** por um roxo mais claro da paleta.

## Mudanças

### 1. Novo token semântico para "accent text sobre superfície escura"

Em `src/index.css`, adicionar um token `--brand-accent` que resolve para:
- **Light mode:** Mid Purple `#534AB7` (igual hoje, mantém contraste sobre branco)
- **Dark mode:** Soft Purple `#7F77DD` (sobe a luminância e ganha contraste sobre navy)

E expor em `tailwind.config.ts` como `brand-accent` (HSL via var).

### 2. Trocar `text-primary` por `text-brand-accent` nas áreas afetadas

Em `src/pages/Landing.tsx`:
- Badge da hero (linha 150)
- Highlight do título "simple and efficient" (linha 160)
- Tagline em itálico — também subir opacidade de `/80` para sem alpha (linha 164)
- Link "Open platform" no footer

Em `src/pages/Pricing.tsx`: link "access" do footer, se aparecer sobre navy.

### 3. Aumentar legibilidade dos chips flutuantes

Em `src/components/landing/FloatingTasksBackground.tsx` (e `TaskMarquee` se reutilizar tokens), subir a opacidade base dos cards de ~`/40` para algo como `/70` e usar borda em Accent Lilac. Continua decorativo, mas deixa de parecer "manchas".

### 4. Verificação final

Após as mudanças, capturar screenshot em dark mode na rota `/` e `/precos`, e cropar as áreas afetadas pra confirmar que todo texto antes invisível agora lê limpo. Repetir em light mode para garantir que nada quebrou no fundo Ghost White (Soft Purple sobre branco também passa AA para texto >14px).

### Fora de escopo

- Não vou mexer em `--primary` (CTAs continuam Mid Purple).
- Não vou redesenhar layouts, só ajustar tokens de cor de texto.
- Logo, sidebar, e demais componentes funcionais já estão com contraste OK.
