## Objetivo

Tornar a Landing page (`/landing`) totalmente bilíngue (PT-BR / EN), igual ao restante do app, e permitir que visitantes anônimos troquem o idioma direto no header — sem precisar logar.

A infraestrutura de i18n (react-i18next + `LanguageSwitcher` + persistência em `localStorage`) já existe e funciona, então só precisamos criar o namespace `landing`, refatorar os componentes para usarem `useTranslation`, e expor o seletor.

---

## 1. Novo namespace `landing`

Criar:
- `src/i18n/locales/pt-BR/landing.json`
- `src/i18n/locales/en/landing.json`

Registrar em `src/i18n/index.ts` (imports + arrays `NAMESPACES` e `resources`).

**Estrutura proposta de chaves** (mesma forma nas duas línguas):

```
header.pricing / header.haveAccount
hero.badge / hero.title1 / hero.titleHighlight / hero.subtitle
hero.cta.trial / hero.cta.contact / hero.trialNote
hero.mockup.boardLabel / hero.mockup.realtime
features.title / features.subtitle / features.clickHint
features.items.kanban.{title,description}
features.items.team.{title,description}
features.items.meetings.{title,description}
features.items.dashboard.{title,description}
features.items.timer.{title,description}
features.items.calendar.{title,description}
features.items.workInstructions.{title,description}
features.items.ideas.{title,description}
steps.title / steps.subtitle / steps.stepLabel
steps.items.signup.{title,description}
steps.items.organize.{title,description}
steps.items.track.{title,description}
highlights.allInOne.{label,value}
highlights.simpleManagement.{label,value}
highlights.connectedTeams.{label,value}
faq.title / faq.subtitle
faq.items[] (array de {q,a}, igual ao padrão usado em `pricing.json`)
footer.terms / footer.privacy / footer.access / footer.copyright
lead.dialog.title / lead.dialog.description
lead.form.{name,namePlaceholder,email,emailPlaceholder,submit,submitting,turnstileWait}
lead.toast.{success,errorGeneric}
previews.mock.* (textos dos mini-previews — ver §4)
```

## 2. Header da Landing — adicionar `LanguageSwitcher`

Em `src/pages/Landing.tsx`, no `<nav>` do header, inserir o `<LanguageSwitcher compact />` antes dos links existentes.

O componente já é totalmente client-side e funciona sem usuário logado (persiste em `localStorage`). Quando o visitante eventualmente fizer signup, o hook `useLocaleSync` propaga a escolha para `profiles.locale`.

## 3. Refatorar `Landing.tsx`

- `useTranslation('landing')` no topo do componente.
- Substituir os 4 arrays in-file (`features`, `steps`, `highlights`, FAQ inline) por estruturas que combinam **dados estáveis** (ícone + chave i18n) com **strings traduzidas** vindas do `t()`.
  - Exemplo: `const features = [{ icon: LayoutDashboard, key: 'kanban' }, ...]`, e no JSX `t('features.items.${f.key}.title')`.
  - FAQ: `t('faq.items', { returnObjects: true })` retornando `Array<{q,a}>`, mesmo padrão já usado em `Pricing.tsx`.
- Strings inline (header, hero, badges, CTAs, footer, copyright) também passam por `t()`.
- Copyright continua usando `new Date().getFullYear()` interpolado via `{{year}}`.

## 4. Refatorar `featurePreviews.tsx` + `FeatureMiniPreview` + `FeaturePreviewDialog`

Esse é o ponto mais delicado: hoje o `previewMap` é indexado pelo **título traduzido em PT-BR** (`'Kanban Intuitivo'`, etc.). Trocar a chave dinamicamente quebra o map.

**Solução**: trocar a indexação para uma **chave estável** (`'kanban' | 'team' | 'meetings' | ...`) independente da tradução.

- Em `featurePreviews.tsx`:
  - Exportar `previewMap: Record<FeatureKey, () => JSX.Element>` indexado pelas chaves estáveis.
  - Cada componente preview (`KanbanPreview`, `TeamPreview`, `MeetingPreview`, `DashboardPreview`, `TimerPreview`, `CalendarPreview`, `WorkInstructionsPreview`, `IdeasPreview`) passa a usar `useTranslation('landing')` e ler seus textos de `t('previews.kanban.columns.todo')`, etc.
  - Dados internos (nomes fictícios "Ana Silva", labels "Sprint Review", dias da semana, mês "Abril 2026", etc.) ficam todos no JSON, com versão PT e EN. Isso inclui:
    - colunas e cards do Kanban
    - membros e funções do time
    - reunião + pendências
    - rótulos do dashboard de prazos
    - botões "Iniciar/Pausar/Resetar" + "Foco" do timer
    - dias da semana, nome do mês, eventos do calendário
    - texto da instrução de trabalho (IT-001)
    - ideias e tags
- Em `Landing.tsx` e `FeaturePreviewDialog.tsx`, passar a `featureKey` (estável) em vez do `featureTitle` para escolher o preview, e usar `t()` para o título exibido no diálogo.
- `FeatureMiniPreview` recebe `featureKey` em vez de `featureTitle`.

## 5. Refatorar `LeadFormDialog.tsx` + `LeadFormTrigger.tsx`

- `LeadFormTrigger`: traduzir "Entrar em contato".
- `LeadFormDialog`: traduzir título, descrição, labels, placeholders, botão (com estado loading), toasts (`success`, `errorGeneric`, `turnstileWait`). Mensagens de erro vindas do servidor (`(data as any)?.error`) continuam exibidas como estão (já são mensagens dinâmicas controladas pelo backend).

## 6. Refatorar `TaskMarquee.tsx` e `FloatingTasksBackground.tsx`

Esses componentes são `aria-hidden` (puramente decorativos), mas mostram texto visível em PT-BR. Vou traduzi-los também para consistência visual quando o idioma estiver em EN. Ambos passam a usar `useTranslation('landing')` lendo de `landing.marquee.items[]` e `landing.floating.items[]` (arrays paralelos aos arrays de ícones que continuam no código).

## 7. SEO / `<title>` da Landing

A Landing hoje não atualiza `document.title` dinamicamente (usa o título estático do `index.html`). **Fora do escopo** desta tarefa — o `index.html` continuará em PT-BR. Se quiser SEO bilíngue depois, é tema para outra fase (precisa de `react-helmet` ou similar e tags `hreflang`).

## 8. Validação

- `tsc --noEmit` limpo.
- Visitar `/landing` em PT-BR (default) e clicar no `LanguageSwitcher` → todo o texto da página, mini-previews, dialog de feature, formulário de lead, footer e marquee devem trocar para EN sem reload.
- Voltar para PT-BR e confirmar que a escolha persiste após reload (localStorage).

---

## Arquivos afetados

**Criados** (2):
- `src/i18n/locales/pt-BR/landing.json`
- `src/i18n/locales/en/landing.json`

**Modificados** (7):
- `src/i18n/index.ts` — registrar namespace `landing`
- `src/pages/Landing.tsx` — `useTranslation`, `LanguageSwitcher` no header, chaves estáveis para features
- `src/components/landing/featurePreviews.tsx` — `previewMap` por chave estável + `useTranslation` em cada preview
- `src/components/landing/FeatureMiniPreview.tsx` — receber `featureKey`
- `src/components/landing/FeaturePreviewDialog.tsx` — receber `featureKey`, traduzir título
- `src/components/landing/LeadFormDialog.tsx` — traduzir formulário e toasts
- `src/components/landing/LeadFormTrigger.tsx` — traduzir CTA
- `src/components/landing/TaskMarquee.tsx` — traduzir cards
- `src/components/landing/FloatingTasksBackground.tsx` — traduzir cards

## Fora de escopo

- Tradução do `index.html` (meta tags estáticas) e SEO bilíngue com `hreflang`.
- Tradução das páginas legais (`/termos`, `/privacidade`) — conteúdo legal exige revisão jurídica antes de publicar em EN.
- Tradução do conteúdo enviado por e-mail após submissão do lead (esses templates já têm tratamento próprio na Fase 2 do plano de i18n).

## Memória

Após concluir, atualizar `mem://features/i18n.md` mencionando que a Landing também passa a ser bilíngue e que o `LanguageSwitcher` está disponível para visitantes anônimos.
